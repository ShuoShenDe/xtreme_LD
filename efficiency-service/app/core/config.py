from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # 基础设置
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # API设置
    API_V1_STR: str = "/api/v1"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083"
    ]
    
    # PostgreSQL设置
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "xtreme1_efficiency"
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # InfluxDB设置
    INFLUXDB_HOST: str = "localhost"
    INFLUXDB_PORT: int = 8087
    INFLUXDB_TOKEN: str = "Y7anaf-f1yBZaDe3M1pCy5LdfVTxH8g8odTzf0UOJd_0V4BROJmQ7HlFDTLefh8GIoWNNkOgKHdnKAeR7KMhqw=="
    INFLUXDB_ORG: str = "xtreme1"
    INFLUXDB_BUCKET: str = "efficiency_events"
    
    # Redis设置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    
    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # Celery设置
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 自动设置Celery URL
        if not self.CELERY_BROKER_URL:
            self.CELERY_BROKER_URL = self.REDIS_URL
        if not self.CELERY_RESULT_BACKEND:
            self.CELERY_RESULT_BACKEND = self.REDIS_URL
    
    # 批处理设置
    BATCH_SIZE: int = 100
    BATCH_TIMEOUT: int = 60  # 秒
    
    # 性能监控设置
    PERFORMANCE_RETENTION_DAYS: int = 30
    ANALYTICS_CACHE_TTL: int = 300  # 5分钟
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# 根据环境自动选择配置
def get_settings() -> Settings:
    env = os.getenv("ENVIRONMENT", "development")
    
    if env == "production":
        return Settings(
            DEBUG=False,
            ENVIRONMENT="production",
            ALLOWED_ORIGINS=["https://your-domain.com"]
        )
    elif env == "testing":
        return Settings(
            DEBUG=True,
            ENVIRONMENT="testing",
            POSTGRES_DB="xtreme1_efficiency_test"
        )
    
    return Settings()


settings = get_settings() 