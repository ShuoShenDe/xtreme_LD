from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
import logging
from datetime import datetime, timedelta
from datetime import timezone

from ..schemas.event import EventData, EventType
from ..models.efficiency_metrics import EfficiencyMetrics, UserStats, ProjectStats
from ..utils.timezone import utc_now

logger = logging.getLogger(__name__)


class EventProcessor:
    """事件处理器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    async def validate_event(self, event: EventData) -> bool:
        """验证事件数据"""
        try:
            # 基本字段验证
            if not event.user_id or not event.project_id:
                return False
            
            # 时间戳验证
            if not event.timestamp:
                return False
            
            # 事件类型验证
            if event.event_type not in EventType:
                return False
            
            # 数据完整性验证
            if event.event_type == EventType.ANNOTATION:
                required_fields = ['type', 'annotationType', 'duration', 'success']
                if not all(field in event.data for field in required_fields):
                    return False
            
            return True
        
        except Exception as e:
            self.logger.error(f"Event validation failed: {e}")
            return False
    
    async def update_statistics(self, session: AsyncSession, events: List[EventData]):
        """更新统计信息到PostgreSQL"""
        try:
            for event in events:
                # 更新用户统计
                await self._update_user_stats(session, event)
                
                # 更新项目统计
                await self._update_project_stats(session, event)
                
                # 更新效率指标
                await self._update_efficiency_metrics(session, event)
            
            await session.commit()
            self.logger.info(f"Updated statistics for {len(events)} events")
        
        except Exception as e:
            await session.rollback()
            self.logger.error(f"Failed to update statistics: {e}")
            raise
    
    async def _update_user_stats(self, session: AsyncSession, event: EventData):
        """更新用户统计信息"""
        try:
            # 查找或创建用户统计记录
            result = await session.execute(
                select(UserStats).where(
                    UserStats.user_id == event.user_id,
                    UserStats.project_id == event.project_id
                )
            )
            user_stats = result.scalar_one_or_none()
            
            if not user_stats:
                # 确保时间戳是 UTC 时间但不带时区信息
                current_time = utc_now().replace(tzinfo=None)
                event_time = event.timestamp
                if event_time.tzinfo is not None:
                    event_time = event_time.replace(tzinfo=None)
                
                user_stats = UserStats(
                    user_id=event.user_id,
                    project_id=event.project_id,
                    total_annotations=0,
                    total_time_spent=0,
                    avg_annotation_time=0.0,
                    projects_count=1,
                    created_at=current_time,
                    updated_at=current_time,
                    last_activity=event_time
                )
                session.add(user_stats)
            
            # 更新统计数据
            if event.event_type == EventType.ANNOTATION:
                user_stats.total_annotations += 1
                if event.data.get('success'):
                    duration = event.data.get('duration', 0)
                    user_stats.total_time_spent += duration
                    # 更新平均标注时间
                    user_stats.avg_annotation_time = user_stats.total_time_spent / user_stats.total_annotations
            
            # 更新最后活动时间
            event_time = event.timestamp
            if event_time.tzinfo is not None:
                event_time = event_time.replace(tzinfo=None)
            user_stats.last_activity = event_time
            user_stats.updated_at = utc_now().replace(tzinfo=None)
        
        except Exception as e:
            self.logger.error(f"Failed to update user stats: {e}")
            raise
    
    async def _update_project_stats(self, session: AsyncSession, event: EventData):
        """更新项目统计信息"""
        try:
            # 查找或创建项目统计记录
            result = await session.execute(
                select(ProjectStats).where(ProjectStats.project_id == event.project_id)
            )
            project_stats = result.scalar_one_or_none()
            
            if not project_stats:
                project_stats = ProjectStats(
                    project_id=event.project_id,
                    total_events=0,
                    total_annotations=0,
                    total_tasks=0,
                    active_users=0,
                    avg_efficiency=0.0
                )
                session.add(project_stats)
            
            # 更新统计数据
            project_stats.total_events += 1
            project_stats.last_activity = event.timestamp if event.timestamp.tzinfo else event.timestamp.replace(tzinfo=timezone.utc)
            
            if event.event_type == EventType.ANNOTATION:
                project_stats.total_annotations += 1
            
            elif event.event_type == EventType.TASK_STATUS:
                if event.data.get('type') == 'complete' and event.data.get('success'):
                    project_stats.total_tasks += 1
        
        except Exception as e:
            self.logger.error(f"Failed to update project stats: {e}")
            raise
    
    async def _update_efficiency_metrics(self, session: AsyncSession, event: EventData):
        """更新效率指标"""
        try:
            # 创建效率指标记录
            if event.event_type == EventType.ANNOTATION:
                metric = EfficiencyMetrics(
                    user_id=event.user_id,
                    project_id=event.project_id,
                    task_id=event.task_id,
                    tool=event.tool,
                    metric_type='annotation_time',
                    metric_value=event.data.get('duration', 0),
                    timestamp=event.timestamp,
                    extra_data=event.metadata
                )
                session.add(metric)
            
            elif event.event_type == EventType.PERFORMANCE:
                if 'fps' in event.data:
                    metric = EfficiencyMetrics(
                        user_id=event.user_id,
                        project_id=event.project_id,
                        tool=event.tool,
                        metric_type='fps',
                        metric_value=event.data['fps'],
                        timestamp=event.timestamp,
                        extra_data=event.metadata
                    )
                    session.add(metric)
        
        except Exception as e:
            self.logger.error(f"Failed to update efficiency metrics: {e}")
            raise
    
    async def get_user_statistics(self, session: AsyncSession, user_id: str) -> Dict[str, Any]:
        """获取用户统计信息"""
        try:
            # 使用正确的字段名称进行查询
            result = await session.execute(
                select(
                    UserStats.id,
                    UserStats.user_id,
                    UserStats.project_id,
                    UserStats.total_annotations,
                    UserStats.total_time_spent,
                    UserStats.avg_annotation_time,
                    UserStats.projects_count,
                    UserStats.created_at,
                    UserStats.updated_at,
                    UserStats.last_activity
                ).where(UserStats.user_id == user_id)
            )
            user_stats = result.all()
            
            if not user_stats:
                return {"message": "No statistics found for user"}
            
            total_stats = {
                "user_id": user_id,
                "total_annotations": sum(s.total_annotations for s in user_stats),
                "total_time": sum(s.total_time_spent for s in user_stats),
                "avg_annotation_time": sum(s.avg_annotation_time for s in user_stats) / len(user_stats),
                "projects_count": sum(s.projects_count for s in user_stats),
                "projects": []
            }
            
            for stats in user_stats:
                total_stats["projects"].append({
                    "project_id": stats.project_id,
                    "total_annotations": stats.total_annotations,
                    "total_time": stats.total_time_spent,
                    "avg_annotation_time": stats.avg_annotation_time,
                    "last_activity": stats.last_activity.isoformat() if stats.last_activity else None
                })
            
            return total_stats
        
        except Exception as e:
            self.logger.error(f"Failed to get user statistics: {e}")
            raise
    
    async def clear_user_events(self, session: AsyncSession, user_id: str):
        """清除用户事件数据"""
        try:
            # 删除用户统计
            await session.execute(
                delete(UserStats).where(UserStats.user_id == user_id)
            )
            
            # 删除用户的效率指标
            await session.execute(
                delete(EfficiencyMetrics).where(EfficiencyMetrics.user_id == user_id)
            )
            
            await session.commit()
            self.logger.info(f"Cleared events for user {user_id}")
        
        except Exception as e:
            await session.rollback()
            self.logger.error(f"Failed to clear user events: {e}")
            raise 