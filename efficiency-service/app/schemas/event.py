from pydantic import BaseModel, Field, validator
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum


class EventType(str, Enum):
    """事件类型枚举"""
    ANNOTATION = "annotation"
    PERFORMANCE = "performance"
    USER_INTERACTION = "user_interaction"
    BACKEND_COMPUTATION = "backend_computation"
    TASK_STATUS = "task_status"
    ERROR = "error"
    TOOL_EFFICIENCY = "tool_efficiency"


class EventData(BaseModel):
    """事件数据模型"""
    event_type: EventType
    timestamp: datetime
    user_id: str
    project_id: str
    task_id: Optional[str] = None
    session_id: Optional[str] = None
    tool: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('timestamp', pre=True)
    def parse_timestamp(cls, v):
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "event_type": "annotation",
                "timestamp": "2024-01-01T00:00:00Z",
                "user_id": "user-123",
                "project_id": "project-456",
                "task_id": "task-789",
                "session_id": "session-abc",
                "tool": "pc-tool",
                "data": {
                    "type": "create",
                    "annotationType": "cuboid",
                    "duration": 5000,
                    "success": True
                },
                "metadata": {
                    "browser": "Chrome",
                    "os": "Windows"
                }
            }
        }


class EventBatch(BaseModel):
    """批量事件数据模型"""
    batch_id: str
    events: List[EventData]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('events')
    def validate_events(cls, v):
        if len(v) == 0:
            raise ValueError("Events list cannot be empty")
        if len(v) > 1000:
            raise ValueError("Too many events in batch (max 1000)")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "batch_id": "batch-123",
                "events": [
                    {
                        "event_type": "annotation",
                        "timestamp": "2024-01-01T00:00:00Z",
                        "user_id": "user-123",
                        "project_id": "project-456",
                        "data": {
                            "type": "create",
                            "annotationType": "cuboid",
                            "duration": 5000,
                            "success": True
                        }
                    }
                ],
                "metadata": {
                    "tool": "pc-tool",
                    "version": "1.0.0",
                    "environment": "production"
                }
            }
        }


class AnnotationEventData(BaseModel):
    """标注事件数据"""
    type: str  # create, update, delete
    annotationType: str  # cuboid, polygon, polyline, etc.
    duration: int  # 毫秒
    success: bool
    objectId: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PerformanceEventData(BaseModel):
    """性能事件数据"""
    fps: Optional[float] = None
    memory_usage: Optional[float] = None
    cpu_usage: Optional[float] = None
    render_time: Optional[float] = None
    network_latency: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UserInteractionEventData(BaseModel):
    """用户交互事件数据"""
    action: str  # click, drag, scroll, etc.
    element: str  # button, canvas, menu, etc.
    duration: Optional[int] = None
    coordinates: Optional[Dict[str, float]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TaskEventData(BaseModel):
    """任务事件数据"""
    type: str  # start, complete, pause, resume
    taskId: str
    duration: Optional[int] = None
    success: bool
    annotationCount: Optional[int] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ErrorEventData(BaseModel):
    """错误事件数据"""
    type: str  # frontend_error, api_error, etc.
    message: str
    stack: Optional[str] = None
    severity: str = "error"  # error, warning, info
    context: Dict[str, Any] = Field(default_factory=dict)


class ToolEfficiencyEventData(BaseModel):
    """工具效率事件数据"""
    tool: str
    action: str
    duration: int
    success: bool
    efficiency_score: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict) 