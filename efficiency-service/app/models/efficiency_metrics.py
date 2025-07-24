from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Boolean, JSON
from sqlalchemy.sql import func
from datetime import datetime
from typing import Dict, Any

from ..core.database import Base


class EfficiencyMetrics(Base):
    """效率指标表"""
    __tablename__ = "efficiency_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    project_id = Column(String(255), nullable=False, index=True)
    task_id = Column(String(255), nullable=True, index=True)
    tool = Column(String(100), nullable=True)
    metric_type = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=func.now())
    extra_data = Column(JSON, nullable=True)  # 使用 extra_data 替代 metadata
    
    def __repr__(self):
        return f"<EfficiencyMetrics(user_id='{self.user_id}', metric_type='{self.metric_type}', value={self.metric_value})>"


class UserStats(Base):
    """用户统计表"""
    __tablename__ = "user_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    project_id = Column(String(255), nullable=False)
    
    # 统计数据
    total_annotations = Column(Integer, default=0)
    total_time_spent = Column(Integer, default=0)  # 总时间（毫秒）
    avg_annotation_time = Column(Float, default=0.0)  # 平均标注时间
    projects_count = Column(Integer, default=0)
    
    # 时间戳
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_activity = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<UserStats(user_id='{self.user_id}', project_id='{self.project_id}', total_annotations={self.total_annotations})>"


class ProjectStats(Base):
    """项目统计表"""
    __tablename__ = "project_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(255), nullable=False, unique=True, index=True)
    
    # 统计数据
    total_events = Column(Integer, default=0)
    total_annotations = Column(Integer, default=0)
    total_tasks = Column(Integer, default=0)
    active_users = Column(Integer, default=0)
    avg_efficiency = Column(Float, default=0.0)
    
    # 时间戳
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_activity = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<ProjectStats(project_id='{self.project_id}', annotations={self.total_annotations})>"


class TaskStats(Base):
    """任务统计表"""
    __tablename__ = "task_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(255), nullable=False, unique=True, index=True)
    project_id = Column(String(255), nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    
    # 任务信息
    task_type = Column(String(100), nullable=True)
    status = Column(String(50), default="pending")  # pending, in_progress, completed, failed
    
    # 统计数据
    annotation_count = Column(Integer, default=0)
    total_time = Column(Integer, default=0)  # 总时间（毫秒）
    error_count = Column(Integer, default=0)
    
    # 时间戳
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<TaskStats(task_id='{self.task_id}', status='{self.status}', annotations={self.annotation_count})>"


class ToolUsage(Base):
    """工具使用统计表"""
    __tablename__ = "tool_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    tool_name = Column(String(100), nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    project_id = Column(String(255), nullable=False, index=True)
    
    # 使用统计
    usage_count = Column(Integer, default=0)
    total_time = Column(Integer, default=0)  # 总使用时间（毫秒）
    success_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    
    # 效率指标
    avg_operation_time = Column(Float, default=0.0)
    efficiency_score = Column(Float, default=0.0)
    
    # 时间戳
    first_used = Column(DateTime, nullable=True)
    last_used = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<ToolUsage(tool='{self.tool_name}', user_id='{self.user_id}', usage={self.usage_count})>"


class SystemHealth(Base):
    """系统健康状态表"""
    __tablename__ = "system_health"
    
    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String(100), nullable=False, index=True)
    status = Column(String(50), nullable=False)  # healthy, unhealthy, degraded
    
    # 健康指标
    response_time = Column(Float, nullable=True)
    cpu_usage = Column(Float, nullable=True)
    memory_usage = Column(Float, nullable=True)
    disk_usage = Column(Float, nullable=True)
    
    # 详细信息
    message = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)
    
    # 时间戳
    checked_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    
    def __repr__(self):
        return f"<SystemHealth(service='{self.service_name}', status='{self.status}')>" 