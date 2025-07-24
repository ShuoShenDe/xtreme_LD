from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging
import asyncio

from influxdb_client.client.influxdb_client_async import InfluxDBClientAsync
from influxdb_client.domain.write_precision import WritePrecision
from influxdb_client import Point

from ..schemas.event import EventData, EventType
from ..core.config import settings

logger = logging.getLogger(__name__)


class InfluxDBService:
    """InfluxDB服务"""
    
    def __init__(self):
        self.client = None
        self.write_api = None
        self.query_api = None
        self.logger = logging.getLogger(__name__)
    
    async def get_client(self) -> InfluxDBClientAsync:
        """获取InfluxDB客户端"""
        if self.client is None:
            self.client = InfluxDBClientAsync(
                url=f"http://{settings.INFLUXDB_HOST}:{settings.INFLUXDB_PORT}",
                token=settings.INFLUXDB_TOKEN,
                org=settings.INFLUXDB_ORG
            )
            self.write_api = self.client.write_api()
            self.query_api = self.client.query_api()
        
        return self.client
    
    async def close(self):
        """关闭InfluxDB连接"""
        if self.client:
            await self.client.close()
    
    async def store_events(self, events: List[EventData], metadata: Dict[str, Any] = None):
        """批量存储事件到InfluxDB"""
        try:
            client = await self.get_client()
            points = []
            
            for event in events:
                # 基础事件数据
                point = Point("efficiency_events") \
                    .tag("user_id", event.user_id) \
                    .tag("project_id", event.project_id) \
                    .tag("event_type", event.event_type)
                
                # 添加事件数据字段
                for key, value in event.data.items():
                    if isinstance(value, (bool, int, float)):
                        point = point.field(key, value)
                    elif isinstance(value, str):
                        point = point.tag(key, value)
                
                # 添加事件元数据
                if event.metadata:
                    for key, value in event.metadata.items():
                        if isinstance(value, (str, bool, int, float)):
                            point = point.tag(f"meta_{key}", str(value))
                
                # 添加批次元数据
                if metadata:
                    for key, value in metadata.items():
                        if isinstance(value, (str, bool, int, float)):
                            point = point.tag(f"batch_{key}", str(value))
                
                # 设置时间戳
                point = point.time(event.timestamp)
                points.append(point)
            
            # 批量写入数据
            write_api = client.write_api()
            await write_api.write(
                bucket=settings.INFLUXDB_BUCKET,
                org=settings.INFLUXDB_ORG,
                record=points
            )
            
            self.logger.info(f"Stored {len(events)} events to InfluxDB")
            return True
        
        except Exception as e:
            self.logger.error(f"Failed to store events: {e}")
            return False

    async def store_event(self, event: EventData):
        """存储单个事件到InfluxDB（向后兼容）"""
        return await self.store_events([event])
    
    async def get_project_performance(self, project_id: str, hours: int = 24) -> Dict[str, Any]:
        """获取项目性能数据"""
        try:
            client = await self.get_client()
            
            # 查询最近24小时的性能数据
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{hours}h)
                |> filter(fn: (r) => r["_measurement"] == "efficiency_performance")
                |> filter(fn: (r) => r["project_id"] == "{project_id}")
                |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            performance_data = {
                "project_id": project_id,
                "time_range": f"{hours}h",
                "metrics": {
                    "fps": [],
                    "memory_usage": [],
                    "cpu_usage": [],
                    "render_time": [],
                    "network_latency": []
                }
            }
            
            for table in tables:
                for record in table.records:
                    metric_name = record["_field"]
                    if metric_name in performance_data["metrics"]:
                        performance_data["metrics"][metric_name].append({
                            "time": record["_time"].isoformat(),
                            "value": record["_value"]
                        })
            
            return performance_data
        
        except Exception as e:
            self.logger.error(f"Failed to get project performance: {e}")
            raise
    
    async def get_user_efficiency(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """获取用户效率数据"""
        try:
            client = await self.get_client()
            
            # 查询用户标注效率
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["_measurement"] == "efficiency_events")
                |> filter(fn: (r) => r["user_id"] == "{user_id}")
                |> filter(fn: (r) => contains(value: r["_field"], set: ["duration", "success"]))
                |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            efficiency_data = {
                "user_id": user_id,
                "time_range": f"{days}d",
                "daily_avg_duration": [],
                "total_annotations": 0,
                "total_time_spent": 0
            }
            
            for table in tables:
                for record in table.records:
                    if record["_field"] == "duration":
                        efficiency_data["daily_avg_duration"].append({
                            "date": record["_time"].strftime("%Y-%m-%d"),
                            "avg_duration": record["_value"]
                        })
                        efficiency_data["total_time_spent"] += record["_value"]
                    elif record["_field"] == "success":
                        efficiency_data["total_annotations"] += record["_value"]
            
            return efficiency_data
        
        except Exception as e:
            self.logger.error(f"Failed to get user efficiency: {e}")
            raise
    
    async def clear_user_events(self, user_id: str):
        """清除用户事件数据"""
        try:
            client = await self.get_client()
            
            # 删除用户的所有事件数据
            delete_api = client.delete_api()
            
            start = datetime.now() - timedelta(days=365)  # 删除一年内的数据
            stop = datetime.now()
            
            await delete_api.delete(
                start,
                stop,
                f'user_id="{user_id}"',
                bucket=settings.INFLUXDB_BUCKET,
                org=settings.INFLUXDB_ORG
            )
            
            self.logger.info(f"Cleared InfluxDB events for user {user_id}")
        
        except Exception as e:
            self.logger.error(f"Failed to clear user events from InfluxDB: {e}")
            raise

    # ==================== 用户操作数据分析方法 ====================

    async def get_user_interaction_analysis(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """获取用户交互行为分析"""
        try:
            client = await self.get_client()
            
            # 查询用户交互事件
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["_measurement"] == "efficiency_user_interaction")
                |> filter(fn: (r) => r["user_id"] == "{user_id}")
                |> filter(fn: (r) => r["_field"] == "count")
                |> group(columns: ["action", "element"])
                |> sum()
                |> sort(columns: ["_value"], desc: true)
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            analysis = {
                "total_interactions": 0,
                "most_used_actions": [],
                "most_used_elements": [],
                "interaction_distribution": {},
                "hourly_activity": {}
            }
            
            for table in tables:
                for record in table.records:
                    action = record.get("action", "unknown")
                    element = record.get("element", "unknown")
                    count = record["_value"]
                    
                    analysis["total_interactions"] += count
                    
                    # 统计最常用操作
                    analysis["most_used_actions"].append({
                        "action": action,
                        "count": count
                    })
                    
                    # 统计最常用元素
                    analysis["most_used_elements"].append({
                        "element": element,
                        "count": count
                    })
                    
                    # 操作分布
                    if action not in analysis["interaction_distribution"]:
                        analysis["interaction_distribution"][action] = 0
                    analysis["interaction_distribution"][action] += count
            
            # 获取小时活动分布
            hourly_query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["_measurement"] == "efficiency_user_interaction")
                |> filter(fn: (r) => r["user_id"] == "{user_id}")
                |> filter(fn: (r) => r["_field"] == "count")
                |> aggregateWindow(every: 1h, fn: sum, createEmpty: false)
            '''
            
            hourly_tables = await self.query_api.query(query=hourly_query, org=settings.INFLUXDB_ORG)
            
            for table in hourly_tables:
                for record in table.records:
                    hour = record["_time"].hour
                    count = record["_value"]
                    
                    if hour not in analysis["hourly_activity"]:
                        analysis["hourly_activity"][hour] = 0
                    analysis["hourly_activity"][hour] += count
            
            return analysis
        
        except Exception as e:
            self.logger.error(f"Failed to get user interaction analysis: {e}")
            raise

    async def get_user_time_distribution(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """获取用户操作时间分布"""
        try:
            client = await self.get_client()
            
            # 查询用户活动时间分布
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["user_id"] == "{user_id}")
                |> filter(fn: (r) => r["_field"] == "count")
                |> aggregateWindow(every: 1d, fn: sum, createEmpty: false)
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            time_distribution = {
                "daily_activity": [],
                "peak_hours": [],
                "session_duration": [],
                "break_patterns": []
            }
            
            for table in tables:
                for record in table.records:
                    date = record["_time"].strftime("%Y-%m-%d")
                    count = record["_value"]
                    
                    time_distribution["daily_activity"].append({
                        "date": date,
                        "activity_count": count
                    })
            
            return time_distribution
        
        except Exception as e:
            self.logger.error(f"Failed to get user time distribution: {e}")
            raise

    async def get_user_tool_preference(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """获取用户工具使用偏好"""
        try:
            client = await self.get_client()
            
            # 查询用户在不同工具中的活动
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["user_id"] == "{user_id}")
                |> filter(fn: (r) => r["_field"] == "count")
                |> group(columns: ["tool"])
                |> sum()
                |> sort(columns: ["_value"], desc: true)
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            tool_preference = {
                "preferred_tools": [],
                "tool_usage_time": {},
                "tool_efficiency": {}
            }
            
            for table in tables:
                for record in table.records:
                    tool = record.get("tool", "unknown")
                    count = record["_value"]
                    
                    tool_preference["preferred_tools"].append({
                        "tool": tool,
                        "usage_count": count
                    })
            
            return tool_preference
        
        except Exception as e:
            self.logger.error(f"Failed to get user tool preference: {e}")
            raise

    async def get_user_efficiency_trend(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """获取用户效率趋势"""
        try:
            client = await self.get_client()
            
            # 查询用户效率趋势
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["_measurement"] == "efficiency_annotation")
                |> filter(fn: (r) => r["user_id"] == "{user_id}")
                |> filter(fn: (r) => r["_field"] == "duration")
                |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            efficiency_trend = {
                "daily_efficiency": [],
                "improvement_rate": 0.0,
                "consistency_score": 0.0
            }
            
            durations = []
            for table in tables:
                for record in table.records:
                    date = record["_time"].strftime("%Y-%m-%d")
                    duration = record["_value"]
                    durations.append(duration)
                    
                    efficiency_trend["daily_efficiency"].append({
                        "date": date,
                        "avg_duration": duration
                    })
            
            # 计算改进率
            if len(durations) >= 2:
                first_week_avg = sum(durations[:min(7, len(durations))]) / min(7, len(durations))
                last_week_avg = sum(durations[-min(7, len(durations)):]) / min(7, len(durations))
                
                if first_week_avg > 0:
                    efficiency_trend["improvement_rate"] = (first_week_avg - last_week_avg) / first_week_avg * 100
            
            return efficiency_trend
        
        except Exception as e:
            self.logger.error(f"Failed to get user efficiency trend: {e}")
            raise

    async def get_operation_sequences(self, user_id: str, days: int = 7, tool: Optional[str] = None) -> Dict[str, Any]:
        """获取操作序列分析"""
        try:
            client = await self.get_client()
            
            # 构建查询条件
            tool_filter = f' and r["tool"] == "{tool}"' if tool else ""
            
            # 查询操作序列
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["user_id"] == "{user_id}"{tool_filter})
                |> filter(fn: (r) => r["_field"] == "count")
                |> sort(columns: ["_time"])
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            sequences = {
                "common_sequences": [],
                "sequence_patterns": {},
                "transition_matrix": {}
            }
            
            # 分析操作序列
            current_sequence = []
            for table in tables:
                for record in table.records:
                    action = record.get("action", "unknown")
                    current_sequence.append(action)
                    
                    # 限制序列长度
                    if len(current_sequence) > 10:
                        current_sequence = current_sequence[-10:]
                    
                    # 记录序列模式
                    if len(current_sequence) >= 2:
                        pattern = " -> ".join(current_sequence[-2:])
                        if pattern not in sequences["sequence_patterns"]:
                            sequences["sequence_patterns"][pattern] = 0
                        sequences["sequence_patterns"][pattern] += 1
            
            return sequences
        
        except Exception as e:
            self.logger.error(f"Failed to get operation sequences: {e}")
            raise

    async def get_common_operation_patterns(self, user_id: str, days: int = 7, tool: Optional[str] = None) -> Dict[str, Any]:
        """获取常用操作组合"""
        try:
            # 这里可以基于操作序列分析结果，提取常用的操作组合
            sequences = await self.get_operation_sequences(user_id, days, tool)
            
            patterns = {
                "frequent_patterns": [],
                "efficient_patterns": [],
                "inefficient_patterns": []
            }
            
            # 分析序列模式
            for pattern, count in sequences["sequence_patterns"].items():
                if count >= 5:  # 出现5次以上的模式
                    patterns["frequent_patterns"].append({
                        "pattern": pattern,
                        "frequency": count
                    })
            
            return patterns
        
        except Exception as e:
            self.logger.error(f"Failed to get common operation patterns: {e}")
            raise

    async def get_operation_efficiency_analysis(self, user_id: str, days: int = 7, tool: Optional[str] = None) -> Dict[str, Any]:
        """获取操作效率分析"""
        try:
            client = await self.get_client()
            
            # 查询操作效率数据
            tool_filter = f' and r["tool"] == "{tool}"' if tool else ""
            
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["user_id"] == "{user_id}"{tool_filter})
                |> filter(fn: (r) => r["_field"] == "duration")
                |> group(columns: ["action"])
                |> mean()
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            efficiency_analysis = {
                "action_efficiency": [],
                "slow_operations": [],
                "fast_operations": [],
                "efficiency_score": 0.0
            }
            
            total_duration = 0
            total_actions = 0
            
            for table in tables:
                for record in table.records:
                    action = record.get("action", "unknown")
                    avg_duration = record["_value"]
                    
                    efficiency_analysis["action_efficiency"].append({
                        "action": action,
                        "avg_duration": avg_duration
                    })
                    
                    total_duration += avg_duration
                    total_actions += 1
                    
                    # 分类操作
                    if avg_duration > 5000:  # 超过5秒的操作
                        efficiency_analysis["slow_operations"].append({
                            "action": action,
                            "avg_duration": avg_duration
                        })
                    elif avg_duration < 1000:  # 少于1秒的操作
                        efficiency_analysis["fast_operations"].append({
                            "action": action,
                            "avg_duration": avg_duration
                        })
            
            # 计算效率分数
            if total_actions > 0:
                efficiency_analysis["efficiency_score"] = 100 - (total_duration / total_actions / 100)
            
            return efficiency_analysis
        
        except Exception as e:
            self.logger.error(f"Failed to get operation efficiency analysis: {e}")
            raise

    async def get_error_patterns(self, user_id: str, days: int = 7, tool: Optional[str] = None) -> Dict[str, Any]:
        """获取错误模式分析"""
        try:
            client = await self.get_client()
            
            # 查询错误事件
            tool_filter = f' and r["tool"] == "{tool}"' if tool else ""
            
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["_measurement"] == "efficiency_error")
                |> filter(fn: (r) => r["user_id"] == "{user_id}"{tool_filter})
                |> filter(fn: (r) => r["_field"] == "count")
                |> group(columns: ["error_type", "severity"])
                |> sum()
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            error_patterns = {
                "error_count": 0,
                "error_types": [],
                "error_severity": {},
                "error_trend": [],
                "common_errors": []
            }
            
            for table in tables:
                for record in table.records:
                    error_type = record.get("error_type", "unknown")
                    severity = record.get("severity", "unknown")
                    count = record["_value"]
                    
                    error_patterns["error_count"] += count
                    
                    error_patterns["error_types"].append({
                        "type": error_type,
                        "count": count,
                        "severity": severity
                    })
                    
                    if severity not in error_patterns["error_severity"]:
                        error_patterns["error_severity"][severity] = 0
                    error_patterns["error_severity"][severity] += count
            
            return error_patterns
        
        except Exception as e:
            self.logger.error(f"Failed to get error patterns: {e}")
            raise

    async def get_user_error_analysis(self, user_id: str, days: int = 7) -> Dict[str, Any]:
        """获取用户错误分析数据"""
        try:
            client = await self.get_client()
            
            # 查询错误事件
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["_measurement"] == "efficiency_error")
                |> filter(fn: (r) => r["user_id"] == "{user_id}")
                |> filter(fn: (r) => r["_field"] == "count")
                |> group(columns: ["error_type", "severity"])
                |> sum()
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            error_analysis = {
                "error_count": 0,
                "error_types": [],
                "error_severity": {},
                "error_trend": []
            }
            
            for table in tables:
                for record in table.records:
                    error_type = record.get("error_type", "unknown")
                    severity = record.get("severity", "unknown")
                    count = record["_value"]
                    
                    error_analysis["error_count"] += count
                    
                    error_analysis["error_types"].append({
                        "type": error_type,
                        "count": count,
                        "severity": severity
                    })
                    
                    if severity not in error_analysis["error_severity"]:
                        error_analysis["error_severity"][severity] = 0
                    error_analysis["error_severity"][severity] += count
            
            # 获取错误趋势
            trend_query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["_measurement"] == "efficiency_error")
                |> filter(fn: (r) => r["user_id"] == "{user_id}")
                |> filter(fn: (r) => r["_field"] == "count")
                |> aggregateWindow(every: 1d, fn: sum, createEmpty: false)
            '''
            
            trend_tables = await self.query_api.query(query=trend_query, org=settings.INFLUXDB_ORG)
            
            for table in trend_tables:
                for record in table.records:
                    error_analysis["error_trend"].append({
                        "time": record["_time"].isoformat(),
                        "count": record["_value"]
                    })
            
            return error_analysis
        
        except Exception as e:
            self.logger.error(f"Failed to get user error analysis: {e}")
            raise

    async def get_annotation_efficiency_trend(self, user_id: str, days: int = 30, interval: str = "1d") -> Dict[str, Any]:
        """获取标注效率趋势"""
        try:
            client = await self.get_client()
            
            # 查询标注效率趋势
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["_measurement"] == "efficiency_annotation")
                |> filter(fn: (r) => r["user_id"] == "{user_id}")
                |> filter(fn: (r) => r["_field"] == "duration")
                |> aggregateWindow(every: {interval}, fn: mean, createEmpty: false)
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            trend = {
                "timeline": [],
                "improvement_rate": 0.0,
                "consistency": 0.0
            }
            
            durations = []
            for table in tables:
                for record in table.records:
                    time = record["_time"].isoformat()
                    duration = record["_value"]
                    durations.append(duration)
                    
                    trend["timeline"].append({
                        "time": time,
                        "avg_duration": duration
                    })
            
            # 计算改进率
            if len(durations) >= 2:
                first_half = durations[:len(durations)//2]
                second_half = durations[len(durations)//2:]
                
                if first_half and second_half:
                    first_avg = sum(first_half) / len(first_half)
                    second_avg = sum(second_half) / len(second_half)
                    
                    if first_avg > 0:
                        trend["improvement_rate"] = (first_avg - second_avg) / first_avg * 100
            
            return trend
        
        except Exception as e:
            self.logger.error(f"Failed to get annotation efficiency trend: {e}")
            raise

    async def get_task_completion_trend(self, user_id: str, days: int = 30, interval: str = "1d") -> Dict[str, Any]:
        """获取任务完成效率趋势"""
        try:
            client = await self.get_client()
            
            # 查询任务完成趋势
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["_measurement"] == "efficiency_task_status")
                |> filter(fn: (r) => r["user_id"] == "{user_id}")
                |> filter(fn: (r) => r["_field"] == "count")
                |> aggregateWindow(every: {interval}, fn: sum, createEmpty: false)
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            trend = {
                "completed_tasks": [],
                "completion_rate": 0.0,
                "avg_completion_time": 0.0
            }
            
            for table in tables:
                for record in table.records:
                    time = record["_time"].isoformat()
                    count = record["_value"]
                    
                    trend["completed_tasks"].append({
                        "time": time,
                        "count": count
                    })
            
            return trend
        
        except Exception as e:
            self.logger.error(f"Failed to get task completion trend: {e}")
            raise

    async def get_performance_trend(self, user_id: str, days: int = 30, interval: str = "1d") -> Dict[str, Any]:
        """获取性能指标趋势"""
        try:
            client = await self.get_client()
            
            # 查询性能指标趋势
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
                |> range(start: -{days}d)
                |> filter(fn: (r) => r["_measurement"] == "efficiency_performance")
                |> filter(fn: (r) => r["user_id"] == "{user_id}")
                |> aggregateWindow(every: {interval}, fn: mean, createEmpty: false)
            '''
            
            tables = await self.query_api.query(query=query, org=settings.INFLUXDB_ORG)
            
            trend = {
                "fps_trend": [],
                "memory_trend": [],
                "cpu_trend": [],
                "render_time_trend": []
            }
            
            for table in tables:
                for record in table.records:
                    time = record["_time"].isoformat()
                    field = record["_field"]
                    value = record["_value"]
                    
                    if field == "fps":
                        trend["fps_trend"].append({"time": time, "value": value})
                    elif field == "memory_usage":
                        trend["memory_trend"].append({"time": time, "value": value})
                    elif field == "cpu_usage":
                        trend["cpu_trend"].append({"time": time, "value": value})
                    elif field == "render_time":
                        trend["render_time_trend"].append({"time": time, "value": value})
            
            return trend
        
        except Exception as e:
            self.logger.error(f"Failed to get performance trend: {e}")
            raise

    async def get_learning_curve_analysis(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """获取学习曲线分析"""
        try:
            # 基于效率趋势数据计算学习曲线
            efficiency_trend = await self.get_annotation_efficiency_trend(user_id, days, "1d")
            
            learning_curve = {
                "learning_rate": 0.0,
                "plateau_detected": False,
                "skill_level": "beginner",
                "improvement_potential": 0.0
            }
            
            if efficiency_trend["timeline"]:
                # 计算学习率
                learning_curve["learning_rate"] = efficiency_trend["improvement_rate"]
                
                # 判断技能水平
                if learning_curve["learning_rate"] > 20:
                    learning_curve["skill_level"] = "rapid_learner"
                elif learning_curve["learning_rate"] > 10:
                    learning_curve["skill_level"] = "intermediate"
                elif learning_curve["learning_rate"] > 0:
                    learning_curve["skill_level"] = "beginner"
                else:
                    learning_curve["skill_level"] = "experienced"
                
                # 计算改进潜力
                learning_curve["improvement_potential"] = max(0, 50 - learning_curve["learning_rate"])
            
            return learning_curve
        
        except Exception as e:
            self.logger.error(f"Failed to get learning curve analysis: {e}")
            raise

    async def get_user_comparison_data(self, user_id: str, days: int = 7, metrics: List[str] = None) -> Dict[str, Any]:
        """获取用户对比数据"""
        try:
            if metrics is None:
                metrics = ["efficiency", "speed", "accuracy"]
            
            comparison_data = {
                "user_id": user_id,
                "metrics": {}
            }
            
            for metric in metrics:
                if metric == "efficiency":
                    efficiency_data = await self.get_user_efficiency(user_id, days)
                    comparison_data["metrics"]["efficiency"] = {
                        "avg_duration": efficiency_data.get("total_time_spent", 0) / max(efficiency_data.get("total_annotations", 1), 1),
                        "annotation_count": efficiency_data.get("total_annotations", 0)
                    }
                elif metric == "speed":
                    # 计算速度指标
                    efficiency_data = await self.get_user_efficiency(user_id, days)
                    comparison_data["metrics"]["speed"] = {
                        "annotations_per_hour": efficiency_data.get("total_annotations", 0) / (days * 24)
                    }
                elif metric == "accuracy":
                    # 计算准确性指标
                    error_data = await self.get_error_patterns(user_id, days)
                    efficiency_data = await self.get_user_efficiency(user_id, days)
                    
                    total_annotations = efficiency_data.get("total_annotations", 0)
                    error_count = error_data.get("error_count", 0)
                    
                    accuracy = 1.0 - (error_count / max(total_annotations, 1))
                    comparison_data["metrics"]["accuracy"] = {
                        "accuracy_rate": accuracy,
                        "error_count": error_count
                    }
            
            return comparison_data
        
        except Exception as e:
            self.logger.error(f"Failed to get user comparison data: {e}")
            raise

    async def calculate_user_rankings(self, comparison_data: Dict[str, Any], metrics: List[str]) -> Dict[str, Any]:
        """计算用户排名和百分位"""
        try:
            rankings = {
                "overall_rank": 0,
                "metric_rankings": {},
                "percentiles": {}
            }
            
            # 计算每个指标的排名
            for metric in metrics:
                metric_values = []
                for user_id, user_data in comparison_data.items():
                    if metric in user_data.get("metrics", {}):
                        metric_values.append({
                            "user_id": user_id,
                            "value": user_data["metrics"][metric]
                        })
                
                # 排序
                if metric_values:
                    metric_values.sort(key=lambda x: x["value"], reverse=True)
                    
                    # 找到目标用户的排名
                    for i, item in enumerate(metric_values):
                        if item["user_id"] == list(comparison_data.keys())[0]:  # 假设第一个是目标用户
                            rankings["metric_rankings"][metric] = {
                                "rank": i + 1,
                                "total": len(metric_values),
                                "percentile": (len(metric_values) - i) / len(metric_values) * 100
                            }
                            break
            
            return rankings
        
        except Exception as e:
            self.logger.error(f"Failed to calculate user rankings: {e}")
            raise 