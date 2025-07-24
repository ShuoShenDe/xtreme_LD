FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖（包含开发工具）
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# 复制requirements文件
COPY requirements.txt .

# 安装Python依赖（包含开发依赖）
RUN pip install --no-cache-dir -r requirements.txt

# 安装额外的开发依赖
RUN pip install --no-cache-dir watchfiles

# 创建应用目录结构
RUN mkdir -p /app/app /app/examples /app/data /app/logs

# 复制应用代码（这些将被volume挂载覆盖）
COPY app/ ./app/
COPY examples/ ./examples/

# 设置权限
RUN chmod -R 755 /app

# 创建非root用户
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# 暴露端口
EXPOSE 8001

# 开发模式启动命令（支持热重载）
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload", "--reload-dir", "/app/app"] 