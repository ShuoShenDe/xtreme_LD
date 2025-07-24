from celery import Celery
from .core.config import settings

# 创建 Celery 应用实例
celery_app = Celery(
    "efficiency_service",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.services.event_processor"]
)

# 配置 Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 分钟
    task_soft_time_limit=25 * 60,  # 25 分钟
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# 设置定期任务
celery_app.conf.beat_schedule = {
    "cleanup-old-metrics": {
        "task": "app.services.event_processor.cleanup_old_metrics",
        "schedule": 3600.0,  # 每小时执行一次
    },
    "calculate-efficiency-scores": {
        "task": "app.services.event_processor.calculate_efficiency_scores",
        "schedule": 1800.0,  # 每30分钟执行一次
    },
}

# 自动发现任务
celery_app.autodiscover_tasks(["app.services"])

if __name__ == "__main__":
    celery_app.start() 