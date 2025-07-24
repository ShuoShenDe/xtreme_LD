from fastapi import APIRouter

from .events import router as events_router
from .health import router as health_router

api_router = APIRouter()

# 注册各个模块的路由
api_router.include_router(events_router, prefix="/events", tags=["events"])
api_router.include_router(health_router, prefix="/health", tags=["health"]) 