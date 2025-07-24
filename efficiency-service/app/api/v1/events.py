from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

from ...core.database import get_db
from ...services.event_processor import EventProcessor
from ...services.influxdb_service import InfluxDBService
from ...schemas.event import EventBatch, EventData
from ...utils.timezone import utc_now

logger = logging.getLogger(__name__)
router = APIRouter()

event_processor = EventProcessor()
influxdb_service = InfluxDBService()


@router.post("/batch", response_model=Dict[str, Any])
async def submit_events(
    event_batch: EventBatch,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """批量接收前端事件数据"""
    try:
        # 验证事件数据
        validated_events = []
        for event in event_batch.events:
            if await event_processor.validate_event(event):
                validated_events.append(event)
            else:
                logger.warning(f"Invalid event data: {event}")
        
        if not validated_events:
            raise HTTPException(
                status_code=400,
                detail="No valid events in batch"
            )
        
        # 后台异步处理事件
        background_tasks.add_task(
            process_events_async,
            validated_events,
            event_batch.metadata
        )
        
        return {
            "status": "success",
            "message": f"Received {len(validated_events)} events",
            "batch_id": event_batch.batch_id,
            "timestamp": utc_now().isoformat(),
            "processed_count": len(validated_events),
            "total_count": len(event_batch.events)
        }
    
    except Exception as e:
        logger.error(f"Error processing event batch: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process events: {str(e)}"
        )


async def process_events_async(
    events: List[EventData],
    metadata: Dict[str, Any]
):
    """异步处理事件数据"""
    try:
        # 存储到InfluxDB
        await influxdb_service.store_events(events, metadata)
        
        # 更新统计信息到PostgreSQL
        from ...core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            await event_processor.update_statistics(session, events)
        
        logger.info(f"Successfully processed {len(events)} events")
    
    except Exception as e:
        logger.error(f"Error in async event processing: {e}")


@router.get("/stats/{user_id}")
async def get_user_stats(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    获取用户效率统计
    """
    try:
        stats = await event_processor.get_user_statistics(db, user_id)
        return stats
    
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get user statistics: {str(e)}"
        )


@router.get("/performance/{project_id}")
async def get_project_performance(project_id: str):
    """
    获取项目性能数据
    """
    try:
        performance_data = await influxdb_service.get_project_performance(project_id)
        return performance_data
    
    except Exception as e:
        logger.error(f"Error getting project performance: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get project performance: {str(e)}"
        )


@router.delete("/events/{user_id}")
async def clear_user_events(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    清除用户的历史事件数据
    """
    try:
        await event_processor.clear_user_events(db, user_id)
        await influxdb_service.clear_user_events(user_id)
        
        return {"message": f"Cleared events for user {user_id}"}
    
    except Exception as e:
        logger.error(f"Error clearing user events: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear user events: {str(e)}"
        ) 


@router.get("/analysis/user-behavior/{user_id}")
async def analyze_user_behavior(
    user_id: str,
    days: int = Query(7, description="分析天数，默认7天"),
    db: AsyncSession = Depends(get_db)
):
    """分析用户行为模式"""
    try:
        # 获取用户基础统计
        user_stats = await event_processor.get_user_statistics(db, user_id)
        
        # 获取用户交互行为分析
        interaction_analysis = await influxdb_service.get_user_interaction_analysis(user_id, days)
        
        # 获取用户操作时间分布
        time_distribution = await influxdb_service.get_user_time_distribution(user_id, days)
        
        # 获取用户工具使用偏好
        tool_preference = await influxdb_service.get_user_tool_preference(user_id, days)
        
        # 获取用户效率趋势
        efficiency_trend = await influxdb_service.get_user_efficiency_trend(user_id, days)
        
        # 计算平均标注时间
        avg_duration = efficiency_trend.get("total_time_spent", 0) / max(efficiency_trend.get("total_annotations", 1), 1)
        
        # 计算错误率
        error_analysis = await influxdb_service.get_user_error_analysis(user_id, days)
        error_rate = error_analysis.get("error_count", 0) / max(efficiency_trend.get("total_annotations", 1), 1)
        
        return {
            "user_id": user_id,
            "analysis_period": f"{days}天",
            "timestamp": utc_now().isoformat(),
            "basic_stats": user_stats,
            "interaction_analysis": interaction_analysis,
            "time_distribution": time_distribution,
            "tool_preference": tool_preference,
            "efficiency_trend": efficiency_trend,
            "avg_duration": avg_duration,
            "error_rate": error_rate
        }
    
    except Exception as e:
        logger.error(f"Error analyzing user behavior: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze user behavior: {str(e)}"
        )


@router.get("/analysis/operation-patterns/{user_id}")
async def analyze_operation_patterns(
    user_id: str,
    days: int = Query(7, description="分析天数，默认7天"),
    tool: Optional[str] = Query(None, description="指定工具类型")
):
    """
    分析用户操作模式
    """
    try:
        # 获取操作序列分析
        operation_sequences = await influxdb_service.get_operation_sequences(user_id, days, tool)
        
        # 获取常用操作组合
        common_patterns = await influxdb_service.get_common_operation_patterns(user_id, days, tool)
        
        # 获取操作效率分析
        operation_efficiency = await influxdb_service.get_operation_efficiency_analysis(user_id, days, tool)
        
        # 获取错误模式分析
        error_patterns = await influxdb_service.get_error_patterns(user_id, days, tool)
        
        return {
            "user_id": user_id,
            "analysis_period": f"{days}天",
            "tool_filter": tool,
            "timestamp": utc_now().isoformat(),
            "operation_sequences": operation_sequences,
            "common_patterns": common_patterns,
            "operation_efficiency": operation_efficiency,
            "error_patterns": error_patterns
        }
    
    except Exception as e:
        logger.error(f"Error analyzing operation patterns: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze operation patterns: {str(e)}"
        )


@router.get("/analysis/efficiency-trends/{user_id}")
async def analyze_efficiency_trends(
    user_id: str,
    days: int = Query(30, description="分析天数，默认30天"),
    interval: str = Query("1d", description="时间间隔：1h, 6h, 1d, 1w")
):
    """
    分析用户效率趋势
    """
    try:
        # 获取标注效率趋势
        annotation_trend = await influxdb_service.get_annotation_efficiency_trend(user_id, days, interval)
        
        # 获取任务完成效率趋势
        task_completion_trend = await influxdb_service.get_task_completion_trend(user_id, days, interval)
        
        # 获取性能指标趋势
        performance_trend = await influxdb_service.get_performance_trend(user_id, days, interval)
        
        # 获取学习曲线分析
        learning_curve = await influxdb_service.get_learning_curve_analysis(user_id, days)
        
        return {
            "user_id": user_id,
            "analysis_period": f"{days}天",
            "time_interval": interval,
            "timestamp": utc_now().isoformat(),
            "annotation_efficiency_trend": annotation_trend,
            "task_completion_trend": task_completion_trend,
            "performance_trend": performance_trend,
            "learning_curve": learning_curve
        }
    
    except Exception as e:
        logger.error(f"Error analyzing efficiency trends: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze efficiency trends: {str(e)}"
        )


@router.get("/analysis/comparison/{user_id}")
async def compare_user_performance(
    user_id: str,
    comparison_users: List[str] = Query(..., description="对比用户ID列表"),
    days: int = Query(7, description="分析天数，默认7天"),
    metrics: List[str] = Query(["efficiency", "speed", "accuracy"], description="对比指标")
):
    """
    用户性能对比分析
    """
    try:
        comparison_data = {}
        
        # 获取目标用户数据
        target_user_data = await influxdb_service.get_user_comparison_data(user_id, days, metrics)
        comparison_data[user_id] = target_user_data
        
        # 获取对比用户数据
        for comp_user_id in comparison_users:
            if comp_user_id != user_id:
                comp_user_data = await influxdb_service.get_user_comparison_data(comp_user_id, days, metrics)
                comparison_data[comp_user_id] = comp_user_data
        
        # 计算排名和百分位
        rankings = await influxdb_service.calculate_user_rankings(comparison_data, metrics)
        
        return {
            "target_user": user_id,
            "comparison_users": comparison_users,
            "analysis_period": f"{days}天",
            "metrics": metrics,
            "timestamp": utc_now().isoformat(),
            "comparison_data": comparison_data,
            "rankings": rankings
        }
    
    except Exception as e:
        logger.error(f"Error comparing user performance: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compare user performance: {str(e)}"
        )


@router.get("/analysis/recommendations/{user_id}")
async def get_user_recommendations(
    user_id: str,
    days: int = Query(7, description="分析天数，默认7天")
):
    """
    基于用户行为数据生成改进建议
    """
    try:
        # 获取用户行为分析
        behavior_analysis = await influxdb_service.get_user_interaction_analysis(user_id, days)
        
        # 获取效率分析
        efficiency_analysis = await influxdb_service.get_user_efficiency(user_id, days)
        
        # 获取错误分析
        error_analysis = await influxdb_service.get_error_patterns(user_id, days)
        
        # 生成改进建议
        recommendations = await generate_recommendations(
            behavior_analysis, 
            efficiency_analysis, 
            error_analysis
        )
        
        return {
            "user_id": user_id,
            "analysis_period": f"{days}天",
            "timestamp": utc_now().isoformat(),
            "recommendations": recommendations,
            "analysis_data": {
                "behavior": behavior_analysis,
                "efficiency": efficiency_analysis,
                "errors": error_analysis
            }
        }
    
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recommendations: {str(e)}"
        )


async def generate_recommendations(behavior_analysis, efficiency_analysis, error_analysis):
    """
    基于分析数据生成改进建议
    """
    recommendations = []
    
    # 基于效率分析的建议
    if efficiency_analysis.get("total_time", 0) > 0:
        avg_duration = efficiency_analysis.get("total_time", 0) / max(efficiency_analysis.get("annotation_count", 1), 1)
        
        if avg_duration > 10000:  # 平均标注时间超过10秒
            recommendations.append({
                "type": "efficiency",
                "priority": "high",
                "title": "标注速度优化",
                "description": f"当前平均标注时间为{avg_duration/1000:.1f}秒，建议通过练习提高标注速度",
                "suggestions": [
                    "使用快捷键提高操作效率",
                    "熟悉标注工具的各种功能",
                    "建立标准化的标注流程"
                ]
            })
    
    # 基于错误分析的建议
    if error_analysis.get("error_count", 0) > 0:
        error_rate = error_analysis.get("error_count", 0) / max(efficiency_analysis.get("annotation_count", 1), 1)
        
        if error_rate > 0.1:  # 错误率超过10%
            recommendations.append({
                "type": "accuracy",
                "priority": "high",
                "title": "标注准确性提升",
                "description": f"当前错误率为{error_rate*100:.1f}%，建议提高标注准确性",
                "suggestions": [
                    "仔细检查标注结果",
                    "参考标注指南和标准",
                    "遇到不确定的情况及时咨询"
                ]
            })
    
    # 基于行为分析的建议
    if behavior_analysis.get("most_used_actions"):
        most_used = behavior_analysis["most_used_actions"][0] if behavior_analysis["most_used_actions"] else None
        
        if most_used and most_used.get("action") == "click" and most_used.get("count", 0) > 100:
            recommendations.append({
                "type": "workflow",
                "priority": "medium",
                "title": "工作流程优化",
                "description": "检测到大量点击操作，建议优化工作流程",
                "suggestions": [
                    "使用批量操作功能",
                    "设置常用工具的快捷键",
                    "考虑使用自动化标注功能"
                ]
            })
    
    # 如果没有具体问题，提供一般性建议
    if not recommendations:
        recommendations.append({
            "type": "general",
            "priority": "low",
            "title": "持续改进",
            "description": "您的标注工作表现良好，继续保持！",
            "suggestions": [
                "定期回顾和总结标注经验",
                "关注新功能和工具的更新",
                "与团队成员分享最佳实践"
            ]
        })
    
    return recommendations 


@router.get("/raw-stats/{user_id}")
async def get_user_raw_stats(
    user_id: str,
    days: int = Query(default=30, ge=1, le=90, description="Number of days to look back")
) -> Dict[str, Any]:
    """
    获取用户的原始效率统计数据
    """
    try:
        influx_service = InfluxDBService()
        client = await influx_service.get_client()
        query_api = client.query_api()
        
        logger.info(f"Getting raw stats for user {user_id} for last {days} days")
        
        # 查询用户的所有事件
        user_query = f'''
        from(bucket: "efficiency_events")
            |> range(start: -{days}d)
            |> filter(fn: (r) => r["user_id"] == "{user_id}")
        '''
        
        tables = await query_api.query(query=user_query, org="xtreme1")
        
        events = []
        for table in tables:
            for record in table.records:
                event = {
                    'time': record.get_time(),
                    'field': record.get_field(),
                    'value': record.get_value(),
                    'event_type': record.values.get('event_type', 'unknown'),
                    'action': record.values.get('action', 'unknown'),
                    'tool': record.values.get('batch_tool', record.values.get('tool', 'unknown')),
                    'all_tags': record.values
                }
                events.append(event)
        
        # 分析事件数据
        stats = analyze_user_events(events, user_id)
        
        await influx_service.close()
        return stats
        
    except Exception as e:
        logger.error(f"Error getting raw stats for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def analyze_user_events(events: list, user_id: str) -> Dict[str, Any]:
    """
    分析用户事件数据
    """
    # 基础统计
    total_events = len(events)
    
    # 事件类型分布
    event_distribution = {}
    interactions = {}
    performance_values = []
    
    for event in events:
        event_type = event['event_type']
        
        # 事件类型统计
        if event_type not in event_distribution:
            event_distribution[event_type] = 0
        event_distribution[event_type] += 1
        
        # 用户交互统计
        if event_type == 'EventType.USER_INTERACTION':
            action = event['action']
            if action not in interactions:
                interactions[action] = 0
            interactions[action] += 1
        
        # 性能数据收集
        if event_type == 'EventType.PERFORMANCE' and event['field'] == 'fps':
            try:
                fps_value = float(event['value'])
                if 0 <= fps_value <= 200:  # 合理的FPS范围
                    performance_values.append(fps_value)
            except (ValueError, TypeError):
                pass
    
    # 计算平均性能
    avg_fps = None
    if performance_values:
        avg_fps = sum(performance_values) / len(performance_values)
    
    # 计算操作时间统计
    operation_times = []
    for event in events:
        if event['field'] == 'duration' and event['event_type'] == 'EventType.USER_INTERACTION':
            try:
                duration = float(event['value'])
                if 0 <= duration <= 10000:  # 合理的操作时间范围
                    operation_times.append(duration)
            except (ValueError, TypeError):
                pass
    
    avg_operation_time = None
    if operation_times:
        avg_operation_time = sum(operation_times) / len(operation_times)
    
    # 计算效率分数
    efficiency_score = calculate_efficiency_score(
        total_events, interactions, avg_fps, avg_operation_time
    )
    
    # 用户画像
    user_profile = get_user_profile(user_id)
    
    return {
        'total_events': total_events,
        'event_distribution': event_distribution,
        'interactions': interactions,
        'avg_fps': avg_fps,
        'performance_data': {
            'avg_fps': avg_fps,
            'avg_operation_time': avg_operation_time,
            'efficiency_score': efficiency_score,
            'performance_values': performance_values[-10:] if performance_values else []  # 最近10个值
        },
        'user_profile': user_profile,
        'last_updated': datetime.now().isoformat(),
        'analysis_period_days': 30
    }

def calculate_efficiency_score(total_events: int, interactions: dict, avg_fps: float, avg_operation_time: float) -> float:
    """
    计算效率分数 (0-100)
    """
    score = 50.0  # 基础分数
    
    # 活跃度加分
    if total_events > 500:
        score += 20
    elif total_events > 200:
        score += 10
    elif total_events > 50:
        score += 5
    
    # FPS性能加分
    if avg_fps is not None:
        if avg_fps > 50:
            score += 15
        elif avg_fps > 30:
            score += 10
        elif avg_fps > 15:
            score += 5
    
    # 操作时间加分
    if avg_operation_time is not None:
        if avg_operation_time < 500:  # 快速操作
            score += 15
        elif avg_operation_time < 1000:
            score += 10
        elif avg_operation_time < 2000:
            score += 5
    
    # 交互多样性加分
    interaction_types = len(interactions)
    if interaction_types > 3:
        score += 10
    elif interaction_types > 1:
        score += 5
    
    return min(100.0, max(0.0, score))

def get_user_profile(user_id: str) -> Dict[str, Any]:
    """
    获取用户画像
    """
    profiles = {
        'temp_user_001': {
            'name': '高频操作用户',
            'description': '该用户在图像标注工具中表现出高频率的操作模式',
            'timezone': 'Europe/Berlin',
            'primaryTool': 'image-tool'
        },
        'test_user_001': {
            'name': '全功能测试用户', 
            'description': '该用户展示了完整的标注工作流程',
            'timezone': 'Asia/Shanghai',
            'primaryTool': 'mixed-tools'
        }
    }
    
    return profiles.get(user_id, {
        'name': '标准用户',
        'description': '正在使用效率监控系统',
        'timezone': 'UTC',
        'primaryTool': 'unknown'
    }) 

@router.get("/iss-analysis/{user_id}")
async def get_iss_annotation_analysis(
    user_id: str,
    days: int = Query(default=30, ge=1, le=90, description="分析天数")
) -> Dict[str, Any]:
    """
    获取 ISS 标注的详细时间分析数据
    包括：1. 标注一个ISS的时间 2. 标注一帧的时间 3. 用户idle的时间
    """
    try:
        influx_service = InfluxDBService()
        client = await influx_service.get_client()
        query_api = client.query_api()
        
        logger.info(f"Getting ISS annotation analysis for user {user_id} for last {days} days")
        
        # 查询 ISS 标注相关事件
        iss_query = f'''
        from(bucket: "efficiency_events")
            |> range(start: -{days}d)
            |> filter(fn: (r) => r["user_id"] == "{user_id}")
            |> filter(fn: (r) => r["event_type"] == "EventType.ANNOTATION" or 
                                 r["event_type"] == "EventType.USER_INTERACTION" or 
                                 r["event_type"] == "EventType.PERFORMANCE")
        '''
        
        tables = await query_api.query(query=iss_query, org="xtreme1")
        
        events = []
        for table in tables:
            for record in table.records:
                event = {
                    'time': record.get_time(),
                    'field': record.get_field(),
                    'value': record.get_value(),
                    'event_type': record.values.get('event_type', 'unknown'),
                    'action': record.values.get('action', 'unknown'),
                    'tool': record.values.get('batch_tool', record.values.get('tool', 'unknown')),
                    'metadata': record.values
                }
                events.append(event)
        
        # 分析 ISS 标注数据
        analysis = analyze_iss_annotation_data(events, user_id)
        
        await influx_service.close()
        return analysis
        
    except Exception as e:
        logger.error(f"Error getting ISS analysis for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def analyze_iss_annotation_data(events: list, user_id: str) -> Dict[str, Any]:
    """
    分析 ISS 标注数据
    """
    # 分类事件
    annotation_events = []
    interaction_events = []
    performance_events = []
    
    for event in events:
        if event['event_type'] == 'EventType.ANNOTATION':
            annotation_events.append(event)
        elif event['event_type'] == 'EventType.USER_INTERACTION':
            interaction_events.append(event)
        elif event['event_type'] == 'EventType.PERFORMANCE':
            performance_events.append(event)
    
    # 1. 分析单个 ISS 多边形标注时间
    polygon_analysis = analyze_polygon_annotation_times(annotation_events)
    
    # 2. 分析帧级别标注时间
    frame_analysis = analyze_frame_annotation_times(annotation_events, interaction_events)
    
    # 3. 分析用户空闲时间
    idle_analysis = analyze_user_idle_times(interaction_events)
    
    # 4. 计算综合效率指标
    efficiency_metrics = calculate_iss_efficiency_metrics(
        polygon_analysis, frame_analysis, idle_analysis
    )
    
    return {
        'user_id': user_id,
        'analysis_period_days': 30,
        'last_updated': datetime.now().isoformat(),
        'polygon_annotation': polygon_analysis,
        'frame_annotation': frame_analysis,
        'idle_time_analysis': idle_analysis,
        'efficiency_metrics': efficiency_metrics,
        'total_events_analyzed': len(events)
    }

def analyze_polygon_annotation_times(annotation_events: list) -> Dict[str, Any]:
    """分析单个多边形标注时间"""
    polygon_durations = []
    polygon_sessions = {}
    completed_polygons = 0
    incomplete_polygons = 0
    
    for event in annotation_events:
        metadata = event.get('metadata', {})
        action = event.get('action', '')
        
        # 检查是否是多边形级别的事件
        if metadata.get('toolType') == 'iss' and metadata.get('level') == 'polygon':
            session_id = metadata.get('polygonSessionId')
            
            if action in ['start'] and session_id:
                polygon_sessions[session_id] = {
                    'start_time': event['time'],
                    'point_count': 0,
                    'area': 0
                }
            elif action in ['complete'] and session_id and session_id in polygon_sessions:
                if event['field'] == 'duration':
                    duration = float(event['value'])
                    polygon_durations.append(duration)
                    completed_polygons += 1
                    
                    # 更新会话信息
                    polygon_sessions[session_id].update({
                        'duration': duration,
                        'point_count': metadata.get('pointCount', 0),
                        'area': metadata.get('area', 0),
                        'points_per_second': metadata.get('pointsPerSecond', 0),
                        'area_per_second': metadata.get('areaPerSecond', 0)
                    })
            elif action in ['delete'] and session_id:
                incomplete_polygons += 1
    
    # 计算统计指标
    if polygon_durations:
        avg_duration = sum(polygon_durations) / len(polygon_durations)
        min_duration = min(polygon_durations)
        max_duration = max(polygon_durations)
        median_duration = sorted(polygon_durations)[len(polygon_durations)//2]
    else:
        avg_duration = min_duration = max_duration = median_duration = 0
    
    return {
        'total_completed_polygons': completed_polygons,
        'total_incomplete_polygons': incomplete_polygons,
        'completion_rate': completed_polygons / max(completed_polygons + incomplete_polygons, 1) * 100,
        'average_duration_ms': avg_duration,
        'min_duration_ms': min_duration,
        'max_duration_ms': max_duration,
        'median_duration_ms': median_duration,
        'duration_distribution': polygon_durations[-10:] if polygon_durations else [],
        'recent_sessions': list(polygon_sessions.values())[-5:]  # 最近5个会话
    }

def analyze_frame_annotation_times(annotation_events: list, interaction_events: list) -> Dict[str, Any]:
    """分析帧级别标注时间"""
    frame_sessions = {}
    frame_durations = []
    
    for event in annotation_events:
        metadata = event.get('metadata', {})
        action = event.get('action', '')
        
        # 检查是否是帧级别的事件
        if metadata.get('toolType') == 'iss' and metadata.get('level') == 'frame':
            session_id = metadata.get('frameSessionId')
            
            if action in ['start'] and session_id:
                frame_sessions[session_id] = {
                    'start_time': event['time'],
                    'polygon_count': 0,
                    'total_idle_time': 0,
                    'efficiency_ratio': 0
                }
            elif action in ['complete'] and session_id and session_id in frame_sessions:
                if event['field'] == 'duration':
                    duration = float(event['value'])
                    frame_durations.append(duration)
                    
                    # 更新帧会话信息
                    frame_sessions[session_id].update({
                        'duration': duration,
                        'polygon_count': metadata.get('polygonCount', 0),
                        'total_idle_time': metadata.get('totalIdleTime', 0),
                        'active_time': metadata.get('activeTime', 0),
                        'efficiency_ratio': metadata.get('efficiencyRatio', 0),
                        'avg_polygon_duration': metadata.get('averagePolygonDuration', 0)
                    })
    
    # 计算帧级别统计
    if frame_durations:
        avg_frame_duration = sum(frame_durations) / len(frame_durations)
        min_frame_duration = min(frame_durations)
        max_frame_duration = max(frame_durations)
    else:
        avg_frame_duration = min_frame_duration = max_frame_duration = 0
    
    # 计算帧效率指标
    total_frames = len(frame_sessions)
    total_polygons = sum(session.get('polygon_count', 0) for session in frame_sessions.values())
    avg_polygons_per_frame = total_polygons / max(total_frames, 1)
    
    return {
        'total_frames_analyzed': total_frames,
        'total_polygons_in_frames': total_polygons,
        'average_polygons_per_frame': avg_polygons_per_frame,
        'average_frame_duration_ms': avg_frame_duration,
        'min_frame_duration_ms': min_frame_duration,
        'max_frame_duration_ms': max_frame_duration,
        'frame_duration_distribution': frame_durations[-10:] if frame_durations else [],
        'recent_frame_sessions': list(frame_sessions.values())[-3:]  # 最近3个帧会话
    }

def analyze_user_idle_times(interaction_events: list) -> Dict[str, Any]:
    """分析用户空闲时间"""
    idle_periods = []
    total_idle_time = 0
    idle_start_events = []
    idle_end_events = []
    
    for event in interaction_events:
        action = event.get('action', '')
        metadata = event.get('metadata', {})
        
        if action == 'idle_start':
            idle_start_events.append(event)
        elif action == 'idle_end':
            idle_end_events.append(event)
            if event['field'] == 'duration':
                idle_duration = float(event['value'])
                idle_periods.append(idle_duration)
                total_idle_time += idle_duration
    
    # 计算空闲时间统计
    if idle_periods:
        avg_idle_duration = sum(idle_periods) / len(idle_periods)
        min_idle_duration = min(idle_periods)
        max_idle_duration = max(idle_periods)
        median_idle_duration = sorted(idle_periods)[len(idle_periods)//2]
    else:
        avg_idle_duration = min_idle_duration = max_idle_duration = median_idle_duration = 0
    
    # 计算空闲频率
    idle_frequency = len(idle_periods)  # 空闲次数
    
    return {
        'total_idle_periods': idle_frequency,
        'total_idle_time_ms': total_idle_time,
        'average_idle_duration_ms': avg_idle_duration,
        'min_idle_duration_ms': min_idle_duration,
        'max_idle_duration_ms': max_idle_duration,
        'median_idle_duration_ms': median_idle_duration,
        'idle_frequency_per_hour': idle_frequency / max(30 * 24, 1),  # 每小时空闲次数（假设30天）
        'recent_idle_periods': idle_periods[-10:] if idle_periods else []  # 最近10个空闲时段
    }

def calculate_iss_efficiency_metrics(polygon_analysis: Dict, frame_analysis: Dict, idle_analysis: Dict) -> Dict[str, Any]:
    """计算 ISS 标注的综合效率指标"""
    
    # 多边形标注效率
    polygon_efficiency = 100 - (polygon_analysis['average_duration_ms'] / 60000 * 10)  # 基于分钟的效率评分
    polygon_efficiency = max(0, min(100, polygon_efficiency))
    
    # 帧标注效率
    frame_efficiency = frame_analysis['average_polygons_per_frame'] * 10  # 每帧多边形数量的效率评分
    frame_efficiency = max(0, min(100, frame_efficiency))
    
    # 空闲时间效率（空闲时间越少效率越高）
    if idle_analysis['total_idle_time_ms'] > 0:
        idle_efficiency = 100 - (idle_analysis['total_idle_time_ms'] / 3600000 * 20)  # 基于小时的效率评分
    else:
        idle_efficiency = 100
    idle_efficiency = max(0, min(100, idle_efficiency))
    
    # 综合效率评分
    overall_efficiency = (polygon_efficiency + frame_efficiency + idle_efficiency) / 3
    
    # 效率等级
    if overall_efficiency >= 90:
        efficiency_grade = "优秀"
    elif overall_efficiency >= 75:
        efficiency_grade = "良好"
    elif overall_efficiency >= 60:
        efficiency_grade = "一般"
    else:
        efficiency_grade = "需改进"
    
    return {
        'polygon_efficiency_score': round(polygon_efficiency, 2),
        'frame_efficiency_score': round(frame_efficiency, 2),
        'idle_efficiency_score': round(idle_efficiency, 2),
        'overall_efficiency_score': round(overall_efficiency, 2),
        'efficiency_grade': efficiency_grade,
        'completion_rate': polygon_analysis['completion_rate'],
        'productivity_indicators': {
            'avg_polygon_duration_sec': polygon_analysis['average_duration_ms'] / 1000,
            'avg_frame_duration_min': frame_analysis['average_frame_duration_ms'] / 60000,
            'avg_idle_duration_sec': idle_analysis['average_idle_duration_ms'] / 1000,
            'polygons_per_minute': 60000 / max(polygon_analysis['average_duration_ms'], 1000)
        }
    } 