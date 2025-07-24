#!/usr/bin/env python3
"""
查看最近的效率监控事件详情
"""

import sys
try:
    from influxdb_client.client.influxdb_client import InfluxDBClient
    from influxdb_client.client.query_api import QueryApi
except ImportError:
    print("❌ 缺少 influxdb-client 依赖")
    print("请安装: pip install influxdb-client")
    sys.exit(1)

from datetime import datetime

# InfluxDB 配置
INFLUXDB_CONFIG = {
    'url': 'http://localhost:8087',
    'token': 'Y7anaf-f1yBZaDe3M1pCy5LdfVTxH8g8odTzf0UOJd_0V4BROJmQ7HlFDTLefh8GIoWNNkOgKHdnKAeR7KMhqw==',
    'org': 'xtreme1',
    'bucket': 'efficiency_events'
}

def check_iss_events(client, query_api):
    """专门查询 ISS 工具相关事件"""
    print("\n🤖 专门分析 ISS 工具事件:")
    print("=" * 80)
    
    # 查询最近10分钟的 ISS 工具事件
    iss_query = f'''
    from(bucket: "{INFLUXDB_CONFIG['bucket']}")
    |> range(start: -10m)
    |> filter(fn: (r) => r._measurement == "efficiency_events")
    |> filter(fn: (r) => r.meta_toolType == "iss-rect" or r.meta_toolType == "iss-points")
    |> sort(columns: ["_time"], desc: true)
    '''
    
    try:
        result = query_api.query(org=INFLUXDB_CONFIG['org'], query=iss_query)
        
        iss_events = []
        for table in result:
            for record in table.records:
                event = {
                    'time': record.get_time(),
                    'field': record.get_field(),
                    'value': record.get_value(),
                    'type': record.values.get('type', 'N/A'),
                    'toolType': record.values.get('meta_toolType', 'N/A'),
                    'sessionId': record.values.get('meta_sessionId', 'N/A'),
                    'annotationType': record.values.get('annotationType', 'N/A'),
                    'phase': record.values.get('meta_phase', 'N/A'),
                    'success': record.values.get('meta_success', 'N/A'),
                    'errorType': record.values.get('meta_errorType', 'N/A'),
                    'generatedCount': record.values.get('meta_generatedObjectCount', 'N/A'),
                    'pointCount': record.values.get('meta_pointCount', 'N/A'),
                    'inputPointCount': record.values.get('meta_inputPointCount', 'N/A')
                }
                iss_events.append(event)
        
        if iss_events:
            print(f"✅ 找到 {len(iss_events)} 个 ISS 工具事件")
            
            # 按会话分组分析
            sessions = {}
            for event in iss_events:
                session_id = event['sessionId']
                if session_id != 'N/A':
                    if session_id not in sessions:
                        sessions[session_id] = []
                    sessions[session_id].append(event)
            
            if sessions:
                print(f"\n📝 发现 {len(sessions)} 个 AI 辅助标注会话:")
                for i, (session_id, session_events) in enumerate(sessions.items()):
                    session_events.sort(key=lambda x: x['time'])
                    print(f"\n🔸 会话 #{i+1} ({session_id[:12]}...):")
                    
                    for event in session_events:
                        time_str = event['time'].strftime('%H:%M:%S.%f')[:-3] if event['time'] else 'N/A'
                        icon = get_event_icon(event['type'])
                        print(f"   {icon} {time_str} | {event['type']:15} | {event['field']:20} = {event['value']}")
                        if event['phase'] != 'N/A':
                            print(f"      └─ 阶段: {event['phase']}")
                        if event['generatedCount'] != 'N/A':
                            print(f"      └─ 生成对象数: {event['generatedCount']}")
                        if event['pointCount'] != 'N/A' or event['inputPointCount'] != 'N/A':
                            point_info = event['pointCount'] if event['pointCount'] != 'N/A' else event['inputPointCount']
                            print(f"      └─ 点数量: {point_info}")
                        if event['errorType'] != 'N/A':
                            print(f"      └─ 错误类型: {event['errorType']}")
            
            # 显示非会话事件
            non_session_events = [e for e in iss_events if e['sessionId'] == 'N/A']
            if non_session_events:
                print(f"\n📋 其他 ISS 工具事件 ({len(non_session_events)} 个):")
                for event in non_session_events[:5]:  # 只显示前5个
                    time_str = event['time'].strftime('%H:%M:%S') if event['time'] else 'N/A'
                    icon = get_event_icon(event['type'])
                    print(f"   {icon} {time_str} | {event['toolType']:10} | {event['type']:15} | {event['field']:15} = {event['value']}")
        else:
            print("⚠️  最近10分钟内没有找到 ISS 工具事件")
            
    except Exception as e:
        print(f"❌ 查询 ISS 事件失败: {e}")

def get_event_icon(event_type):
    """根据事件类型返回图标"""
    icons = {
        'start': '🎯',
        'complete': '✅',
        'cancel': '❌',
        'mouse_down': '🖱️',
        'point_added': '📍',
        'ai_assist_start': '🤖',
        'ai_assist_complete': '✨',
        'ai_assist_error': '⚠️',
        'paused': '⏸️',
        'resumed': '▶️'
    }
    return icons.get(event_type, '📊')

def analyze_ai_performance(client, query_api):
    """分析 AI 辅助标注性能"""
    print("\n📈 AI 辅助标注性能分析:")
    print("=" * 60)
    
    # 查询最近1小时的 AI 辅助事件
    ai_query = f'''
    from(bucket: "{INFLUXDB_CONFIG['bucket']}")
    |> range(start: -1h)
    |> filter(fn: (r) => r._measurement == "efficiency_events")
    |> filter(fn: (r) => r.type == "ai_assist_complete" or r.type == "ai_assist_error")
    '''
    
    try:
        result = query_api.query(org=INFLUXDB_CONFIG['org'], query=ai_query)
        
        success_count = 0
        error_count = 0
        total_duration = 0
        total_objects = 0
        error_types = {}
        
        for table in result:
            for record in table.records:
                event_type = record.values.get('type')
                if event_type == 'ai_assist_complete':
                    success_count += 1
                    if record.get_field() == 'duration':
                        total_duration += record.get_value()
                    generated_count = record.values.get('meta_generatedObjectCount', 0)
                    if isinstance(generated_count, (int, float)):
                        total_objects += generated_count
                elif event_type == 'ai_assist_error':
                    error_count += 1
                    error_type = record.values.get('meta_errorType', 'unknown')
                    error_types[error_type] = error_types.get(error_type, 0) + 1
        
        total_attempts = success_count + error_count
        if total_attempts > 0:
            success_rate = (success_count / total_attempts) * 100
            avg_duration = total_duration / success_count if success_count > 0 else 0
            avg_objects = total_objects / success_count if success_count > 0 else 0
            
            print(f"📊 总体统计:")
            print(f"   AI 处理尝试: {total_attempts} 次")
            print(f"   成功次数: {success_count} 次")
            print(f"   失败次数: {error_count} 次")
            print(f"   成功率: {success_rate:.1f}%")
            print(f"   平均处理时间: {avg_duration:.0f} 毫秒")
            print(f"   平均生成对象数: {avg_objects:.1f}")
            
            if error_types:
                print(f"\n❌ 错误类型分布:")
                for error_type, count in error_types.items():
                    print(f"   {error_type}: {count} 次")
        else:
            print("⚠️  最近1小时内没有 AI 辅助标注活动")
            
    except Exception as e:
        print(f"❌ 分析 AI 性能失败: {e}")

def check_latest_events():
    """查看最近5分钟的事件详情"""
    try:
        client = InfluxDBClient(
            url=INFLUXDB_CONFIG['url'],
            token=INFLUXDB_CONFIG['token'],
            org=INFLUXDB_CONFIG['org']
        )
        
        query_api = client.query_api()
        
        # 查询最近5分钟的所有事件
        query = f'''
        from(bucket: "{INFLUXDB_CONFIG['bucket']}")
        |> range(start: -5m)
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: 20)
        '''
        
        print("📋 查询最近5分钟的事件...")
        result = query_api.query(org=INFLUXDB_CONFIG['org'], query=query)
        
        events = []
        for table in result:
            for record in table.records:
                events.append({
                    'time': record.get_time(),
                    'measurement': record.get_measurement(),
                    'field': record.get_field(),
                    'value': record.get_value(),
                    'type': record.values.get('type', 'N/A'),
                    'annotationType': record.values.get('annotationType', 'N/A'),
                    'toolType': record.values.get('meta_toolType', 'N/A'),
                    'sessionId': record.values.get('meta_sessionId', 'N/A'),
                    'userId': record.values.get('meta_userId', 'N/A')
                })
        
        if events:
            print(f"\n✅ 找到 {len(events)} 个最近事件:")
            print("=" * 100)
            
            # 按时间排序
            events.sort(key=lambda x: x['time'], reverse=True)
            
            # 只显示非系统监控事件
            annotation_events = [e for e in events if e['type'] not in ['N/A'] and e['toolType'] not in ['N/A']]
            
            if annotation_events:
                print(f"\n🎯 标注相关事件 ({len(annotation_events)} 个):")
                for i, event in enumerate(annotation_events[:10]):
                    time_str = event['time'].strftime('%H:%M:%S') if event['time'] else 'N/A'
                    icon = get_event_icon(event['type'])
                    print(f"\n{icon} 事件 #{i+1}")
                    print(f"   时间: {time_str}")
                    print(f"   工具类型: {event['toolType']}")
                    print(f"   事件类型: {event['type']}")
                    print(f"   字段: {event['field']} = {event['value']}")
                    if event['sessionId'] != 'N/A':
                        session_short = event['sessionId'][:12] + '...' if len(str(event['sessionId'])) > 12 else event['sessionId']
                        print(f"   会话ID: {session_short}")
                    print("-" * 60)
            else:
                print("📊 最近事件主要是系统性能监控数据")
        else:
            print("⚠️  最近5分钟内没有找到任何事件")
        
        # 调用专门的 ISS 事件分析
        check_iss_events(client, query_api)
        
        # 调用 AI 性能分析
        analyze_ai_performance(client, query_api)
        
        # 查询所有不同的工具类型统计
        query2 = f'''
        from(bucket: "{INFLUXDB_CONFIG['bucket']}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "efficiency_events" and r.type == "complete")
        |> group(columns: ["meta_toolType", "annotationType"])
        |> count()
        '''
        
        print("\n📈 最近1小时工具类型统计:")
        print("=" * 50)
        result2 = query_api.query(org=INFLUXDB_CONFIG['org'], query=query2)
        
        stats = []
        for table in result2:
            for record in table.records:
                stats.append({
                    'toolType': record.values.get('meta_toolType', 'N/A'),
                    'annotationType': record.values.get('annotationType', 'N/A'),
                    'count': record.get_value()
                })
        
        if stats:
            for stat in stats:
                print(f"   工具: {stat['toolType']:12} | 标注类型: {stat['annotationType']:12} | 数量: {stat['count']:3}")
        else:
            print("   没有找到完成的标注事件")
            
        client.close()
        
    except Exception as e:
        print(f"❌ 查询失败: {e}")

if __name__ == "__main__":
    check_latest_events() 