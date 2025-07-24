from fastapi import APIRouter, HTTPException
from datetime import datetime
import logging
import asyncio

from ...core.database import engine
from ...core.config import settings
from ...utils.timezone import utc_now

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
async def health_check():
    """
    系统健康检查
    """
    try:
        # 检查数据库连接
        db_status = await check_database()
        
        # 检查Redis连接
        redis_status = await check_redis()
        
        # 检查InfluxDB连接
        influxdb_status = await check_influxdb()
        
        # 整体健康状态
        overall_status = "healthy" if all([
            db_status["status"] == "healthy",
            redis_status["status"] == "healthy",
            influxdb_status["status"] == "healthy"
        ]) else "unhealthy"
        
        return {
            "status": overall_status,
            "timestamp": utc_now().isoformat(),
            "service": "Xtreme1 Efficiency Monitor",
            "version": "1.0.0",
            "checks": {
                "database": db_status,
                "redis": redis_status,
                "influxdb": influxdb_status
            }
        }
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )


async def check_database():
    """检查PostgreSQL数据库连接"""
    try:
        async with engine.begin() as conn:
            await conn.execute("SELECT 1")
        return {"status": "healthy", "message": "Database connection OK"}
    except Exception as e:
        logger.error(f"Database check failed: {e}")
        return {"status": "unhealthy", "message": f"Database error: {str(e)}"}


async def check_redis():
    """检查Redis连接"""
    try:
        import redis.asyncio as redis
        
        redis_client = redis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        await redis_client.close()
        
        return {"status": "healthy", "message": "Redis connection OK"}
    except Exception as e:
        logger.error(f"Redis check failed: {e}")
        return {"status": "unhealthy", "message": f"Redis error: {str(e)}"}


async def check_influxdb():
    """检查InfluxDB连接"""
    try:
        from influxdb_client.client.influxdb_client_async import InfluxDBClientAsync
        
        client = InfluxDBClientAsync(
            url=f"http://{settings.INFLUXDB_HOST}:{settings.INFLUXDB_PORT}",
            token=settings.INFLUXDB_TOKEN,
            org=settings.INFLUXDB_ORG
        )
        
        # 检查连接
        health = await client.health()
        await client.close()
        
        if health.status == "pass":
            return {"status": "healthy", "message": "InfluxDB connection OK"}
        else:
            return {"status": "unhealthy", "message": f"InfluxDB status: {health.status}"}
    
    except Exception as e:
        logger.error(f"InfluxDB check failed: {e}")
        return {"status": "unhealthy", "message": f"InfluxDB error: {str(e)}"}


@router.get("/ready")
async def readiness_check():
    """
    就绪状态检查
    """
    try:
        # 简单的就绪检查
        return {
            "status": "ready",
            "timestamp": utc_now().isoformat(),
            "message": "Service is ready to accept requests"
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Service not ready: {str(e)}"
        )


@router.get("/live")
async def liveness_check():
    """
    存活状态检查
    """
    try:
        return {
            "status": "alive",
            "timestamp": utc_now().isoformat(),
            "message": "Service is alive"
        }
    except Exception as e:
        logger.error(f"Liveness check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Service not alive: {str(e)}"
        ) 