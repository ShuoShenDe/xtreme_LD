from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
from typing import List
import logging
from datetime import datetime
import os

from .api.v1.router import api_router
from .core.database import init_db, close_db
from .core.config import settings
from .utils.timezone import utc_now

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化数据库
    logger.info("Initializing database connections...")
    await init_db()
    yield
    # 关闭时清理资源
    logger.info("Closing database connections...")
    await close_db()

app = FastAPI(
    title="Xtreme1 Efficiency Monitor",
    description="效率监控服务API",
    version="1.0.0",
    lifespan=lifespan
)

# 注册API路由
app.include_router(api_router, prefix="/api/v1")

# 自定义静态文件服务，禁用缓存
examples_dir = "/app/examples"  # 直接使用绝对路径

@app.get("/examples/")
async def serve_examples_index():
    """提供 examples 目录的默认 index.html"""
    return await serve_examples("index.html")

@app.get("/examples/{file_path:path}")
async def serve_examples(file_path: str):
    """无缓存的静态文件服务，特别适合开发环境"""
    # 如果请求的是空路径或根目录，默认返回 index.html
    if not file_path or file_path == "/":
        file_path = "index.html"
    
    file_full_path = os.path.join(examples_dir, file_path)
    
    if not os.path.exists(file_full_path) or not os.path.isfile(file_full_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
    
    # 读取文件内容
    with open(file_full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 确定内容类型
    if file_path.endswith('.html'):
        media_type = "text/html"
    elif file_path.endswith('.js'):
        media_type = "application/javascript"
    elif file_path.endswith('.css'):
        media_type = "text/css"
    else:
        media_type = "text/plain"
    
    # 返回带有无缓存头的响应
    return HTMLResponse(
        content=content,
        media_type=media_type,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Last-Modified": datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "ETag": f'"{hash(content + str(datetime.utcnow()))}"'
        }
    )

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "timestamp": utc_now().isoformat(),
        "service": "Xtreme1 Efficiency Monitor"
    }

@app.get("/")
async def root():
    # 动态扫描examples目录
    examples_dict = {}
    examples_dir_root = "/app/examples"  # 直接使用绝对路径
    
    if os.path.exists(examples_dir_root):
        for file in os.listdir(examples_dir_root):
            if file.endswith('.html'):
                # 将文件名转换为友好的键名
                key = file.replace('.html', '').replace('_', ' ').title()
                examples_dict[file.replace('.html', '')] = f"/examples/{file}"
    
    return {
        "service": "Xtreme1 Efficiency Monitor",
        "version": "1.0.0",
        "timestamp": utc_now().isoformat(),
        "status": "running",
        "examples": examples_dict,
        "documentation": "/examples/README.md",
        "available_files": list(examples_dict.values()) + ["/examples/README.md"]
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True if settings.ENVIRONMENT == "development" else False
    ) 