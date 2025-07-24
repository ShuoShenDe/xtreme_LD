#!/usr/bin/env python3
"""
EFFM效率监控事件专用分析脚本
功能：
1. 每种标注类型的总数量（总体和分用户）
2. 完成一个类型的标注需要的时间
3. 用户没有操作的idle时间分析
"""

import sys
import json
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import argparse

try:
    from influxdb_client.client.influxdb_client import InfluxDBClient
    from influxdb_client.client.query_api import QueryApi
except ImportError:
    print("❌ 缺少 influxdb-client 依赖")
    print("请安装: pip install influxdb-client pandas")
    sys.exit(1)

# InfluxDB 配置
INFLUXDB_CONFIG = {
    'url': 'http://localhost:8087',
    'token': 'Y7anaf-f1yBZaDe3M1pCy5LdfVTxH8g8odTzf0UOJd_0V4BROJmQ7HlFDTLefh8GIoWNNkOgKHdnKAeR7KMhqw==',
    'org': 'xtreme1',
    'bucket': 'efficiency_events'
}

class EffmAnalyzer:
    def __init__(self):
        """初始化 EFFM 分析器"""
        self.client = None
        self.query_api = None
        
    def connect(self) -> bool:
        """连接到 InfluxDB"""
        try:
            self.client = InfluxDBClient(
                url=INFLUXDB_CONFIG['url'],
                token=INFLUXDB_CONFIG['token'],
                org=INFLUXDB_CONFIG['org']
            )
            self.query_api = self.client.query_api()
            
            # 测试连接
            health = self.client.health()
            if health.status == "pass":
                print("✅ InfluxDB 连接成功")
                return True
            else:
                print(f"❌ InfluxDB 健康检查失败: {health.status}")
                return False
                
        except Exception as e:
            print(f"❌ InfluxDB 连接失败: {e}")
            return False
    
    def query_effm_data(self, hours: int = 1) -> Optional[List[Dict]]:
        """查询EFFM事件数据"""
        try:
            query = f'''
            from(bucket: "{INFLUXDB_CONFIG['bucket']}")
              |> range(start: -{hours}h)
              |> filter(fn: (r) => r["_measurement"] == "efficiency_events")
              |> sort(columns: ["_time"], desc: false)
            '''
            
            print(f"🔍 正在查询最近 {hours} 小时的EFFM数据...")
            
            if not self.query_api:
                raise Exception("Query API not initialized")
            
            result = self.query_api.query(org=INFLUXDB_CONFIG['org'], query=query)
            
            records = []
            for table in result:
                for record in table.records:
                    records.append({
                        'time': record.get_time(),
                        'measurement': record.get_measurement(),
                        'field': record.get_field(),
                        'value': record.get_value(),
                        **record.values
                    })
            
            print(f"✅ 获取到 {len(records)} 条EFFM记录")
            return records
            
        except Exception as e:
            print(f"❌ 查询EFFM数据失败: {e}")
            return None
    
    def analyze_annotation_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析1: 每种标注类型的总数量（总体和分用户）"""
        if df.empty:
            return {"error": "没有数据可分析"}
        
        # 寻找标注类型字段
        type_fields = ['annotationType', 'annotation_type', 'toolType', 'tool_type', 'field']
        type_col = None
        
        for field in type_fields:
            if field in df.columns:
                type_col = field
                break
        
        if not type_col:
            return {"error": "未找到标注类型信息"}
        
        # 寻找用户字段
        user_fields = ['user_id', 'userId', 'createdBy', 'created_by']
        user_col = None
        for field in user_fields:
            if field in df.columns:
                user_col = field
                break
        
        # 过滤完成的标注事件
        completion_mask = (
            (df.get('action', pd.Series(dtype='object')).fillna('') == 'complete') |
            (df.get('event_type', pd.Series(dtype='object')).fillna('').str.contains('completion|completed', case=False, na=False)) |
            (df.get('field', pd.Series(dtype='object')).fillna('').str.contains('completion|completed', case=False, na=False))
        )
        
        completion_df = df[completion_mask]
        
        if completion_df.empty:
            completion_df = df  # 如果没有明确的完成标识，使用全部数据
        
        # 总体统计
        if type_col in completion_df.columns:
            total_by_type = completion_df[type_col].value_counts()
        else:
            return {"error": f"字段 {type_col} 不存在"}
        
        result = {
            "total_annotations": len(completion_df),
            "annotation_types": len(total_by_type),
            "overall_statistics": {
                "by_type": total_by_type.to_dict(),
                "type_percentages": (total_by_type / len(completion_df) * 100).to_dict()
            }
        }
        
        # 分用户统计
        if user_col and user_col in completion_df.columns:
            try:
                user_type_stats = completion_df.groupby([user_col, type_col]).size().unstack(fill_value=0)
                result["by_user_statistics"] = {
                    "total_users": len(user_type_stats),
                    "user_type_matrix": user_type_stats.to_dict(),
                    "user_totals": user_type_stats.sum(axis=1).to_dict(),
                    "most_productive_users": user_type_stats.sum(axis=1).nlargest(5).to_dict()
                }
            except Exception as e:
                result["by_user_statistics"] = {"error": f"用户统计失败: {e}"}
        else:
            result["by_user_statistics"] = {"error": "未找到用户信息"}
        
        return result
    
    def analyze_completion_time(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析2: 完成一个类型的标注需要的时间"""
        if df.empty:
            return {"error": "没有数据可分析"}
        
        # 寻找时长相关字段
        duration_fields = ['duration', 'completion_time', 'time_taken', 'value']
        duration_col = None
        
        for field in duration_fields:
            if field in df.columns and pd.api.types.is_numeric_dtype(df[field]):
                duration_col = field
                break
        
        # 寻找标注类型字段
        type_fields = ['annotationType', 'annotation_type', 'toolType', 'tool_type', 'field']
        type_col = None
        
        for field in type_fields:
            if field in df.columns:
                type_col = field
                break
        
        if not duration_col:
            return {"error": "未找到时长数据"}
        
        if not type_col:
            return {"error": "未找到标注类型信息"}
        
        # 过滤有效的完成事件
        valid_mask = (
            (df[duration_col].notna()) & 
            (df[duration_col] > 0) &
            (
                (df.get('action', pd.Series(dtype='object')).fillna('') == 'complete') |
                (df.get('event_type', pd.Series(dtype='object')).fillna('').str.contains('completion|completed', case=False, na=False)) |
                (df.get('field', pd.Series(dtype='object')).fillna('').str.contains('duration|completion', case=False, na=False))
            )
        )
        
        valid_df = df[valid_mask]
        
        if valid_df.empty:
            # 如果没有明确的完成标识，使用所有有duration的数据
            valid_df = df[(df[duration_col].notna()) & (df[duration_col] > 0)]
        
        if valid_df.empty:
            return {"error": "没有有效的时长数据"}
        
        # 按类型分组分析时长
        time_stats_by_type = {}
        
        for annotation_type in valid_df[type_col].dropna().unique():
            type_data = valid_df[valid_df[type_col] == annotation_type][duration_col]
            
            if len(type_data) > 0:
                time_stats_by_type[str(annotation_type)] = {
                    "count": len(type_data),
                    "avg_time": float(type_data.mean()),
                    "median_time": float(type_data.median()),
                    "min_time": float(type_data.min()),
                    "max_time": float(type_data.max()),
                    "std_time": float(type_data.std()) if len(type_data) > 1 else 0,
                    "total_time": float(type_data.sum()),
                    "fast_annotations": int((type_data < type_data.median()).sum()),
                    "slow_annotations": int((type_data > type_data.mean() + type_data.std()).sum())
                }
        
        # 总体统计
        all_durations = valid_df[duration_col]
        
        # 效率洞察
        efficiency_insights = {}
        if time_stats_by_type:
            fastest_type = min(time_stats_by_type.items(), key=lambda x: x[1]['avg_time'])
            slowest_type = max(time_stats_by_type.items(), key=lambda x: x[1]['avg_time'])
            most_consistent_type = min(time_stats_by_type.items(), key=lambda x: x[1]['std_time'])
            
            efficiency_insights = {
                "fastest_type": fastest_type[0],
                "fastest_avg_time": fastest_type[1]['avg_time'],
                "slowest_type": slowest_type[0],
                "slowest_avg_time": slowest_type[1]['avg_time'],
                "most_consistent_type": most_consistent_type[0],
                "most_consistent_std": most_consistent_type[1]['std_time']
            }
        
        return {
            "total_completed_annotations": len(valid_df),
            "overall_completion_time": {
                "avg_time": float(all_durations.mean()),
                "median_time": float(all_durations.median()),
                "min_time": float(all_durations.min()),
                "max_time": float(all_durations.max()),
                "std_time": float(all_durations.std()) if len(all_durations) > 1 else 0
            },
            "by_annotation_type": time_stats_by_type,
            "efficiency_insights": efficiency_insights
        }
    
    def analyze_user_idle_time(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析3: 用户没有操作的idle时间"""
        if df.empty:
            return {"error": "没有数据可分析"}
        
        # 寻找用户和时间字段
        user_fields = ['user_id', 'userId', 'createdBy', 'created_by']
        user_col = None
        
        for field in user_fields:
            if field in df.columns:
                user_col = field
                break
        
        if not user_col or 'time' not in df.columns:
            return {"error": "缺少用户或时间信息"}
        
        # 转换时间格式
        df_copy = df.copy()
        df_copy['time'] = pd.to_datetime(df_copy['time'])
        
        # 按用户分组分析空闲时间
        user_idle_stats = {}
        total_idle_time = 0
        idle_periods = []
        
        for user_id in df_copy[user_col].dropna().unique():
            user_data = df_copy[df_copy[user_col] == user_id].sort_values('time')
            
            if len(user_data) < 2:
                continue
            
            # 计算相邻事件之间的时间间隔
            time_diffs = user_data['time'].diff().dropna()  # 删除NaT值
            
            # 定义空闲阈值
            idle_threshold = pd.Timedelta(minutes=2)  # 2分钟无操作算空闲
            long_idle_threshold = pd.Timedelta(minutes=10)  # 10分钟算长时间空闲
            
            # 筛选出空闲时间段
            idle_times = time_diffs[time_diffs > idle_threshold]
            long_idle_times = time_diffs[time_diffs > long_idle_threshold]
            
            # 计算统计指标
            total_session_time = (user_data['time'].max() - user_data['time'].min()).total_seconds()
            total_user_idle = idle_times.sum().total_seconds() if len(idle_times) > 0 else 0
            
            user_idle_stats[str(user_id)] = {
                "total_events": len(user_data),
                "session_duration": total_session_time,
                "total_idle_time": total_user_idle,
                "idle_periods_count": len(idle_times),
                "long_idle_periods_count": len(long_idle_times),
                "avg_idle_time": total_user_idle / len(idle_times) if len(idle_times) > 0 else 0,
                "max_idle_time": idle_times.max().total_seconds() if len(idle_times) > 0 else 0,
                "idle_ratio": total_user_idle / total_session_time if total_session_time > 0 else 0,
                "activity_level": "高" if total_user_idle / total_session_time < 0.2 else ("中" if total_user_idle / total_session_time < 0.5 else "低")
            }
            
            total_idle_time += total_user_idle
            
            # 记录具体的空闲时间段
            idle_indices = time_diffs[time_diffs > idle_threshold].index
            for idx in idle_indices:
                if idx > 0:
                    idx_pos = user_data.index.get_loc(idx)
                    if idx_pos > 0:
                        idle_periods.append({
                            "user_id": str(user_id),
                            "idle_duration": time_diffs[idx].total_seconds(),
                            "start_time": str(user_data.iloc[idx_pos-1]['time']),
                            "end_time": str(user_data.iloc[idx_pos]['time'])
                        })
        
        # 排序找出最空闲和最活跃的用户
        sorted_users = sorted(user_idle_stats.items(), key=lambda x: x[1]['idle_ratio'], reverse=True)
        
        return {
            "total_users_analyzed": len(user_idle_stats),
            "overall_idle_statistics": {
                "total_idle_time": total_idle_time,
                "avg_idle_ratio": sum(stats['idle_ratio'] for stats in user_idle_stats.values()) / len(user_idle_stats) if user_idle_stats else 0,
                "total_idle_periods": sum(stats['idle_periods_count'] for stats in user_idle_stats.values()),
                "avg_idle_period_duration": total_idle_time / sum(stats['idle_periods_count'] for stats in user_idle_stats.values()) if sum(stats['idle_periods_count'] for stats in user_idle_stats.values()) > 0 else 0
            },
            "by_user_idle_stats": user_idle_stats,
            "idle_insights": {
                "most_idle_user": sorted_users[0][0] if sorted_users else None,
                "most_active_user": sorted_users[-1][0] if sorted_users else None,
                "users_with_high_activity": [user for user, stats in user_idle_stats.items() if stats['activity_level'] == '高'],
                "users_with_long_idle": [user for user, stats in user_idle_stats.items() if stats['long_idle_periods_count'] > 0]
            },
            "detailed_idle_periods": sorted(idle_periods, key=lambda x: x['idle_duration'], reverse=True)[:10]
        }
    
    def generate_effm_report(self, analysis: Dict[str, Any], hours: int = 1) -> str:
        """生成EFFM分析报告"""
        report = f"""
{'='*80}
🎯 EFFM效率监控分析报告
📅 时间范围: 最近 {hours} 小时
🕐 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{'='*80}

📊 1. 标注类型数量统计
{'─'*50}"""
        
        annotation_stats = analysis.get('annotation_statistics', {})
        if 'overall_statistics' in annotation_stats:
            report += f"\n总标注数: {annotation_stats.get('total_annotations', 0)}"
            report += f"\n标注类型数: {annotation_stats.get('annotation_types', 0)}\n"
            
            for ann_type, count in annotation_stats['overall_statistics']['by_type'].items():
                percentage = annotation_stats['overall_statistics']['type_percentages'].get(ann_type, 0)
                report += f"{ann_type}: {count} 次 ({percentage:.1f}%)\n"
            
            # 用户统计
            user_stats = annotation_stats.get('by_user_statistics', {})
            if 'total_users' in user_stats:
                report += f"\n👥 活跃用户数: {user_stats['total_users']}"
                report += "\n🏆 最高产用户:"
                for user, count in list(user_stats.get('most_productive_users', {}).items())[:3]:
                    report += f"\n  - {user}: {count} 次标注"
        
        report += f"""

⏱️ 2. 标注完成时间分析
{'─'*50}"""
        
        completion_time = analysis.get('annotation_completion_time', {})
        if 'overall_completion_time' in completion_time:
            overall = completion_time['overall_completion_time']
            report += f"\n总完成标注数: {completion_time.get('total_completed_annotations', 0)}"
            report += f"\n平均完成时间: {overall['avg_time']:.2f} 秒"
            report += f"\n中位数完成时间: {overall['median_time']:.2f} 秒"
            report += f"\n最快完成时间: {overall['min_time']:.2f} 秒"
            report += f"\n最慢完成时间: {overall['max_time']:.2f} 秒\n"
            
            # 按类型的时间统计
            by_type = completion_time.get('by_annotation_type', {})
            for ann_type, stats in by_type.items():
                report += f"\n{ann_type}:"
                report += f"\n  - 数量: {stats['count']}"
                report += f"\n  - 平均时间: {stats['avg_time']:.2f} 秒"
                report += f"\n  - 中位数: {stats['median_time']:.2f} 秒"
            
            # 效率洞察
            insights = completion_time.get('efficiency_insights', {})
            if insights:
                report += f"\n\n💡 效率洞察:"
                report += f"\n最快类型: {insights.get('fastest_type', 'N/A')} ({insights.get('fastest_avg_time', 0):.2f}秒)"
                report += f"\n最慢类型: {insights.get('slowest_type', 'N/A')} ({insights.get('slowest_avg_time', 0):.2f}秒)"
                report += f"\n最稳定类型: {insights.get('most_consistent_type', 'N/A')} (标准差: {insights.get('most_consistent_std', 0):.2f})"
        
        report += f"""

😴 3. 用户空闲时间分析
{'─'*50}"""
        
        idle_time = analysis.get('user_idle_time', {})
        if 'overall_idle_statistics' in idle_time:
            overall_idle = idle_time['overall_idle_statistics']
            report += f"\n分析用户数: {idle_time.get('total_users_analyzed', 0)}"
            report += f"\n总空闲时间: {overall_idle['total_idle_time']:.0f} 秒 ({overall_idle['total_idle_time']/3600:.1f} 小时)"
            report += f"\n平均空闲比例: {overall_idle['avg_idle_ratio']*100:.1f}%"
            report += f"\n空闲时间段数: {overall_idle['total_idle_periods']}"
            report += f"\n平均空闲时长: {overall_idle['avg_idle_period_duration']:.0f} 秒\n"
            
            # 用户洞察
            insights = idle_time.get('idle_insights', {})
            if insights:
                report += f"\n👤 用户活跃度分析:"
                report += f"\n高活跃度用户: {len(insights.get('users_with_high_activity', []))} 人"
                report += f"\n有长时间空闲用户: {len(insights.get('users_with_long_idle', []))} 人"
                if insights.get('most_idle_user'):
                    report += f"\n最空闲用户: {insights['most_idle_user']}"
                if insights.get('most_active_user'):
                    report += f"\n最活跃用户: {insights['most_active_user']}"
        
        report += f"\n\n{'='*80}\n📋 报告结束\n{'='*80}"
        
        return report
    
    def run_analysis(self, hours: int = 1) -> Dict[str, Any]:
        """运行完整的EFFM分析"""
        # 查询数据
        records = self.query_effm_data(hours)
        
        if not records:
            return {"error": "无法获取数据"}
        
        if len(records) == 0:
            return {"error": f"最近 {hours} 小时内没有EFFM数据"}
        
        # 转换为DataFrame
        df = pd.DataFrame(records)
        
        print("🔍 正在进行EFFM数据分析...")
        
        # 执行三个核心分析
        analysis = {
            "annotation_statistics": self.analyze_annotation_statistics(df),
            "annotation_completion_time": self.analyze_completion_time(df),
            "user_idle_time": self.analyze_user_idle_time(df),
            "data_overview": {
                "total_records": len(records),
                "time_range": {
                    "start": df['time'].min() if 'time' in df.columns else None,
                    "end": df['time'].max() if 'time' in df.columns else None
                },
                "available_fields": list(df.columns)
            }
        }
        
        return analysis
    
    def close(self):
        """关闭连接"""
        if self.client:
            self.client.close()

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='EFFM效率监控数据专用分析工具')
    parser.add_argument('--hours', type=int, default=1, help='分析最近多少小时的数据 (默认: 1)')
    parser.add_argument('--output', type=str, help='输出报告到文件')
    parser.add_argument('--json', action='store_true', help='输出 JSON 格式的分析结果')
    
    args = parser.parse_args()
    
    # 创建分析器
    analyzer = EffmAnalyzer()
    
    try:
        # 连接数据库
        if not analyzer.connect():
            sys.exit(1)
        
        # 运行分析
        analysis = analyzer.run_analysis(args.hours)
        
        if "error" in analysis:
            print(f"❌ 分析失败: {analysis['error']}")
            sys.exit(1)
        
        if args.json:
            # 输出 JSON 格式
            result = json.dumps(analysis, indent=2, default=str, ensure_ascii=False)
        else:
            # 生成文本报告
            result = analyzer.generate_effm_report(analysis, args.hours)
        
        # 输出结果
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(result)
            print(f"✅ 报告已保存到: {args.output}")
        else:
            print(result)
            
    except KeyboardInterrupt:
        print("\n⚠️ 用户中断操作")
    except Exception as e:
        print(f"❌ 执行失败: {e}")
        sys.exit(1)
    finally:
        analyzer.close()

if __name__ == "__main__":
    main() 