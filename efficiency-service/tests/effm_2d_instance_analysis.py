#!/usr/bin/env python3
"""
EFFM 2D Instance专用分析脚本
专门针对2D instance类型的详细分析：
- cuboid (矩形/边界框)
- polyline (折线)  
- polygon (多边形)
- issinstance (语义分割实例)

提供个人和总体的详细效率统计
"""

import sys
import json
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import argparse
import numpy as np

try:
    from influxdb_client.client.influxdb_client import InfluxDBClient
    from influxdb_client.client.query_api import QueryApi
except ImportError:
    print("❌ 缺少 influxdb-client 依赖")
    print("请安装: pip install influxdb-client pandas numpy")
    sys.exit(1)

# InfluxDB 配置
INFLUXDB_CONFIG = {
    'url': 'http://localhost:8087',
    'token': 'Y7anaf-f1yBZaDe3M1pCy5LdfVTxH8g8odTzf0UOJd_0V4BROJmQ7HlFDTLefh8GIoWNNkOgKHdnKAeR7KMhqw==',
    'org': 'xtreme1',
    'bucket': 'efficiency_events'
}

# 2D Instance类型映射
INSTANCE_TYPE_MAPPING = {
    # 基础类型映射
    'rect': 'cuboid',
    'rectangle': 'cuboid', 
    'bounding_box': 'cuboid',
    'BOUNDING_BOX': 'cuboid',
    'RECTANGLE': 'cuboid',
    
    # 多边形类型
    'polygon': 'polygon',
    'POLYGON': 'polygon',
    
    # 折线类型
    'polyline': 'polyline',
    'POLYLINE': 'polyline',
    
    # ISS相关类型
    'iss': 'issinstance',
    'iss-rect': 'issinstance',
    'iss_unified': 'issinstance',
    'ISS': 'issinstance',
    'ISS_UNIFIED': 'issinstance',
    'ISS_RECT': 'issinstance',
    
    # 关键点（虽然不是2D instance，但包含进来）
    'keypoint': 'keypoint',
    'key-point': 'keypoint',
    'KEY_POINT': 'keypoint',
}

class Effm2DInstanceAnalyzer:
    def __init__(self):
        """初始化 2D Instance 分析器"""
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
    
    def query_2d_instance_data(self, hours: int = 1) -> Optional[List[Dict]]:
        """查询2D Instance相关的EFFM事件数据"""
        try:
            query = f'''
            from(bucket: "{INFLUXDB_CONFIG['bucket']}")
              |> range(start: -{hours}h)
              |> filter(fn: (r) => r["_measurement"] == "efficiency_events")
              |> filter(fn: (r) => 
                r["annotationType"] == "rect" or
                r["annotationType"] == "rectangle" or 
                r["annotationType"] == "bounding_box" or
                r["annotationType"] == "cuboid" or
                r["annotationType"] == "polygon" or
                r["annotationType"] == "polyline" or
                r["meta_toolType"] == "rect" or
                r["meta_toolType"] == "rectangle" or
                r["meta_toolType"] == "polygon" or
                r["meta_toolType"] == "polyline" or
                r["meta_toolType"] == "iss" or
                r["toolType"] == "rect" or
                r["toolType"] == "rectangle" or
                r["toolType"] == "polygon" or
                r["toolType"] == "polyline" or
                r["toolType"] == "iss" or
                r["field"] == "rect" or 
                r["field"] == "polygon" or 
                r["field"] == "polyline" or 
                r["field"] == "iss"
              )
              |> sort(columns: ["_time"], desc: false)
            '''
            
            print(f"🔍 正在查询最近 {hours} 小时的2D Instance数据...")
            
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
            
            print(f"✅ 获取到 {len(records)} 条2D Instance记录")
            return records
            
        except Exception as e:
            print(f"❌ 查询2D Instance数据失败: {e}")
            return None
    
    def normalize_instance_type(self, tool_type: str) -> str:
        """标准化实例类型名称"""
        if not tool_type:
            return 'unknown'
        
        tool_type_clean = str(tool_type).strip().lower()
        return INSTANCE_TYPE_MAPPING.get(tool_type_clean, tool_type_clean)
    
    def analyze_2d_instance_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析2D Instance类型统计（总体和个人）"""
        if df.empty:
            return {"error": "没有数据可分析"}
        
        # 添加标准化的实例类型字段 - 包含实际数据中的字段
        df['normalized_instance_type'] = df.apply(
            lambda row: self.normalize_instance_type(
                row.get('annotationType') or 
                row.get('meta_toolType') or 
                row.get('toolType') or 
                row.get('tool_type') or 
                row.get('field', '')
            ), axis=1
        )
        
        # 过滤出2D instance相关的数据
        instance_types = ['cuboid', 'polygon', 'polyline', 'issinstance']
        instance_df = df[df['normalized_instance_type'].isin(instance_types)]
        
        if instance_df.empty:
            return {"error": "没有找到2D Instance相关数据"}
        
        # 过滤完成的标注事件
        completion_mask = (
            (instance_df.get('action', pd.Series(dtype='object')).fillna('') == 'complete') |
            (instance_df.get('event_type', pd.Series(dtype='object')).fillna('').str.contains('completion|completed', case=False, na=False)) |
            (instance_df.get('field', pd.Series(dtype='object')).fillna('').str.contains('completion|completed', case=False, na=False))
        )
        
        completion_df = instance_df[completion_mask]
        
        if completion_df.empty:
            completion_df = instance_df  # 如果没有明确的完成标识，使用全部数据
        
        # 总体统计
        total_by_type = completion_df['normalized_instance_type'].value_counts()
        
        result = {
            "total_2d_instances": len(completion_df),
            "instance_types_count": len(total_by_type),
            "overall_statistics": {
                "by_type": total_by_type.to_dict(),
                "type_percentages": (total_by_type / len(completion_df) * 100).to_dict(),
                "type_ranking": total_by_type.index.tolist()
            }
        }
        
        # 寻找用户字段
        user_fields = ['user_id', 'userId', 'createdBy', 'created_by']
        user_col = None
        for field in user_fields:
            if field in completion_df.columns:
                user_col = field
                break
        
        # 分用户统计
        if user_col and user_col in completion_df.columns:
            try:
                user_type_stats = completion_df.groupby([user_col, 'normalized_instance_type']).size().unstack(fill_value=0)
                
                # 计算每个用户的统计信息
                user_detailed_stats = {}
                for user_id in user_type_stats.index:
                    user_data = user_type_stats.loc[user_id]
                    total_user_instances = user_data.sum()
                    
                    user_detailed_stats[str(user_id)] = {
                        "total_instances": int(total_user_instances),
                        "by_type": user_data.to_dict(),
                        "type_percentages": (user_data / total_user_instances * 100).to_dict() if total_user_instances > 0 else {},
                        "most_used_type": user_data.idxmax() if total_user_instances > 0 else None,
                        "most_used_count": int(user_data.max()) if total_user_instances > 0 else 0,
                        "diversity_score": len(user_data[user_data > 0])  # 使用了多少种不同类型
                    }
                
                result["individual_statistics"] = {
                    "total_users": len(user_type_stats),
                    "user_details": user_detailed_stats,
                    "user_totals": user_type_stats.sum(axis=1).to_dict(),
                    "most_productive_users": user_type_stats.sum(axis=1).nlargest(5).to_dict(),
                    "type_specialists": self._find_type_specialists(user_type_stats),
                    "diversity_ranking": self._calculate_user_diversity(user_detailed_stats)
                }
            except Exception as e:
                result["individual_statistics"] = {"error": f"用户统计失败: {e}"}
        else:
            result["individual_statistics"] = {"error": "未找到用户信息"}
        
        return result
    
    def analyze_2d_instance_efficiency(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析2D Instance标注效率（总体和个人）"""
        if df.empty:
            return {"error": "没有数据可分析"}
        
        # 标准化实例类型 - 包含实际数据中的字段
        df['normalized_instance_type'] = df.apply(
            lambda row: self.normalize_instance_type(
                row.get('annotationType') or 
                row.get('meta_toolType') or 
                row.get('toolType') or 
                row.get('tool_type') or 
                row.get('field', '')
            ), axis=1
        )
        
        # 过滤2D instance数据
        instance_types = ['cuboid', 'polygon', 'polyline', 'issinstance']
        instance_df = df[df['normalized_instance_type'].isin(instance_types)]
        
        if instance_df.empty:
            return {"error": "没有找到2D Instance相关数据"}
        
        # 寻找时长相关字段 - 使用实际数据中的字段
        duration_fields = ['meta_averagePointInterval', 'meta_duration', 'duration', 'completion_time', 'time_taken', 'value']
        duration_col = None
        
        for field in duration_fields:
            if field in instance_df.columns:
                # 尝试转换为数值（处理字符串数值）
                try:
                    numeric_values = pd.to_numeric(instance_df[field], errors='coerce').dropna()
                    if len(numeric_values) > 0:
                        if field == 'meta_averagePointInterval':
                            # meta_averagePointInterval 通常在 100-50000 毫秒范围
                            if numeric_values.min() > 0 and numeric_values.max() < 100000:
                                duration_col = field
                                break
                        elif field != 'duration':  # 排除异常大的 duration 字段
                            # 其他字段应该在合理范围内
                            if numeric_values.min() > 0 and numeric_values.max() < 3600000:  # 小于1小时
                                duration_col = field
                                break
                except Exception:
                    continue
        
        if not duration_col:
            return {"error": f"未找到有效的时长数据。可用字段: {list(instance_df.columns)}"}
        
        # 转换 duration_col 为数值型
        instance_df[f'{duration_col}_numeric'] = pd.to_numeric(instance_df[duration_col], errors='coerce')
        
        # 过滤有效的完成事件 - 使用实际数据结构
        valid_mask = (
            (instance_df[f'{duration_col}_numeric'].notna()) & 
            (instance_df[f'{duration_col}_numeric'] > 0) &
            (
                (instance_df.get('type', pd.Series(dtype='object')).fillna('') == 'complete') |
                (instance_df.get('action', pd.Series(dtype='object')).fillna('') == 'complete') |
                (instance_df.get('event_type', pd.Series(dtype='object')).fillna('').str.contains('completion|completed', case=False, na=False)) |
                (instance_df.get('field', pd.Series(dtype='object')).fillna('').str.contains('duration|completion', case=False, na=False))
            )
        )
        
        valid_df = instance_df[valid_mask]
        
        if valid_df.empty:
            # 如果没有明确的完成标识，使用所有有duration的数据
            valid_df = instance_df[(instance_df[f'{duration_col}_numeric'].notna()) & (instance_df[f'{duration_col}_numeric'] > 0)]
        
        if valid_df.empty:
            return {"error": "没有有效的时长数据"}
        
        # 使用数值型列名进行分析
        numeric_duration_col = f'{duration_col}_numeric'
        
        # 总体效率分析
        overall_efficiency = self._analyze_overall_efficiency(valid_df, numeric_duration_col)
        
        # 按类型的效率分析
        type_efficiency = self._analyze_efficiency_by_type(valid_df, numeric_duration_col)
        
        # 按用户的效率分析
        user_efficiency = self._analyze_efficiency_by_user(valid_df, numeric_duration_col)
        
        return {
            "total_completed_instances": len(valid_df),
            "overall_efficiency": overall_efficiency,
            "efficiency_by_type": type_efficiency,
            "efficiency_by_user": user_efficiency,
            "efficiency_insights": self._generate_efficiency_insights(type_efficiency, user_efficiency)
        }
    
    def analyze_2d_instance_idle_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析2D Instance标注过程中的空闲模式（总体和个人）"""
        if df.empty:
            return {"error": "没有数据可分析"}
        
        # 标准化实例类型 - 包含实际数据中的字段
        df['normalized_instance_type'] = df.apply(
            lambda row: self.normalize_instance_type(
                row.get('annotationType') or 
                row.get('meta_toolType') or 
                row.get('toolType') or 
                row.get('tool_type') or 
                row.get('field', '')
            ), axis=1
        )
        
        # 过滤2D instance数据
        instance_types = ['cuboid', 'polygon', 'polyline', 'issinstance']
        instance_df = df[df['normalized_instance_type'].isin(instance_types)]
        
        if instance_df.empty:
            return {"error": "没有找到2D Instance相关数据"}
        
        # 寻找用户和时间字段
        user_fields = ['user_id', 'userId', 'createdBy', 'created_by']
        user_col = None
        
        for field in user_fields:
            if field in instance_df.columns:
                user_col = field
                break
        
        if not user_col or 'time' not in instance_df.columns:
            return {"error": "缺少用户或时间信息"}
        
        # 转换时间格式
        df_copy = instance_df.copy()
        df_copy['time'] = pd.to_datetime(df_copy['time'])
        
        # 总体空闲分析
        overall_idle = self._analyze_overall_idle_patterns(df_copy, user_col)
        
        # 按实例类型的空闲分析
        type_idle = self._analyze_idle_by_instance_type(df_copy, user_col)
        
        # 按用户的空闲分析
        user_idle = self._analyze_idle_by_user(df_copy, user_col)
        
        return {
            "total_users_analyzed": len(df_copy[user_col].dropna().unique()),
            "overall_idle_patterns": overall_idle,
            "idle_by_instance_type": type_idle,
            "idle_by_user": user_idle,
            "idle_insights": self._generate_idle_insights(type_idle, user_idle)
        }
    
    def _find_type_specialists(self, user_type_stats: pd.DataFrame) -> Dict[str, Any]:
        """找出各个类型的专家用户"""
        specialists = {}
        
        for instance_type in user_type_stats.columns:
            if instance_type in user_type_stats.columns:
                type_data = user_type_stats[instance_type]
                if type_data.sum() > 0:
                    top_user = type_data.idxmax()
                    specialists[instance_type] = {
                        "user": str(top_user),
                        "count": int(type_data.max()),
                        "percentage": float(type_data.max() / type_data.sum() * 100)
                    }
        
        return specialists
    
    def _calculate_user_diversity(self, user_detailed_stats: Dict) -> List[Dict]:
        """计算用户的多样性排名"""
        diversity_list = []
        
        for user_id, stats in user_detailed_stats.items():
            diversity_list.append({
                "user": user_id,
                "diversity_score": stats["diversity_score"],
                "total_instances": stats["total_instances"]
            })
        
        # 按多样性分数排序
        diversity_list.sort(key=lambda x: x["diversity_score"], reverse=True)
        return diversity_list[:10]  # 返回前10名
    
    def _analyze_overall_efficiency(self, df: pd.DataFrame, duration_col: str) -> Dict[str, Any]:
        """分析总体效率"""
        durations = df[duration_col]
        
        return {
            "avg_completion_time": float(durations.mean()),
            "median_completion_time": float(durations.median()),
            "min_completion_time": float(durations.min()),
            "max_completion_time": float(durations.max()),
            "std_completion_time": float(durations.std()) if len(durations) > 1 else 0,
            "efficiency_distribution": {
                "fast_annotations": int((durations < durations.quantile(0.25)).sum()),
                "normal_annotations": int(((durations >= durations.quantile(0.25)) & (durations <= durations.quantile(0.75))).sum()),
                "slow_annotations": int((durations > durations.quantile(0.75)).sum())
            }
        }
    
    def _analyze_efficiency_by_type(self, df: pd.DataFrame, duration_col: str) -> Dict[str, Any]:
        """按实例类型分析效率"""
        type_efficiency = {}
        
        for instance_type in df['normalized_instance_type'].dropna().unique():
            type_data = df[df['normalized_instance_type'] == instance_type][duration_col]
            
            if len(type_data) > 0:
                type_efficiency[str(instance_type)] = {
                    "count": len(type_data),
                    "avg_time": float(type_data.mean()),
                    "median_time": float(type_data.median()),
                    "min_time": float(type_data.min()),
                    "max_time": float(type_data.max()),
                    "std_time": float(type_data.std()) if len(type_data) > 1 else 0,
                    "efficiency_score": self._calculate_efficiency_score(type_data),
                    "consistency_score": self._calculate_consistency_score(type_data)
                }
        
        return type_efficiency
    
    def _analyze_efficiency_by_user(self, df: pd.DataFrame, duration_col: str) -> Dict[str, Any]:
        """按用户分析效率"""
        user_fields = ['user_id', 'userId', 'createdBy', 'created_by']
        user_col = None
        
        for field in user_fields:
            if field in df.columns:
                user_col = field
                break
        
        if not user_col:
            return {"error": "未找到用户信息"}
        
        user_efficiency = {}
        
        for user_id in df[user_col].dropna().unique():
            user_data = df[df[user_col] == user_id]
            user_durations = user_data[duration_col]
            
            if len(user_durations) > 0:
                # 按类型的效率
                type_breakdown = {}
                for instance_type in user_data['normalized_instance_type'].dropna().unique():
                    type_durations = user_data[user_data['normalized_instance_type'] == instance_type][duration_col]
                    if len(type_durations) > 0:
                        type_breakdown[str(instance_type)] = {
                            "count": len(type_durations),
                            "avg_time": float(type_durations.mean()),
                            "min_time": float(type_durations.min()),
                            "max_time": float(type_durations.max())
                        }
                
                user_efficiency[str(user_id)] = {
                    "total_instances": len(user_durations),
                    "overall_avg_time": float(user_durations.mean()),
                    "overall_median_time": float(user_durations.median()),
                    "efficiency_score": self._calculate_efficiency_score(user_durations),
                    "consistency_score": self._calculate_consistency_score(user_durations),
                    "by_instance_type": type_breakdown,
                    "improvement_trend": self._calculate_improvement_trend(user_data, duration_col)
                }
        
        return user_efficiency
    
    def _analyze_overall_idle_patterns(self, df: pd.DataFrame, user_col: str) -> Dict[str, Any]:
        """分析总体空闲模式"""
        total_idle_time = 0
        total_idle_periods = 0
        all_idle_durations = []
        
        for user_id in df[user_col].dropna().unique():
            user_data = df[df[user_col] == user_id].sort_values('time')
            
            if len(user_data) < 2:
                continue
            
            time_diffs = user_data['time'].diff().dropna()
            idle_threshold = pd.Timedelta(minutes=2)
            idle_times = time_diffs[time_diffs > idle_threshold]
            
            if len(idle_times) > 0:
                total_idle_time += idle_times.sum().total_seconds()
                total_idle_periods += len(idle_times)
                all_idle_durations.extend([t.total_seconds() for t in idle_times])
        
        return {
            "total_idle_time": total_idle_time,
            "total_idle_periods": total_idle_periods,
            "avg_idle_duration": total_idle_time / total_idle_periods if total_idle_periods > 0 else 0,
            "median_idle_duration": float(np.median(all_idle_durations)) if all_idle_durations else 0,
            "max_idle_duration": max(all_idle_durations) if all_idle_durations else 0
        }
    
    def _analyze_idle_by_instance_type(self, df: pd.DataFrame, user_col: str) -> Dict[str, Any]:
        """按实例类型分析空闲模式"""
        type_idle = {}
        
        for instance_type in df['normalized_instance_type'].dropna().unique():
            type_df = df[df['normalized_instance_type'] == instance_type]
            idle_data = []
            
            for user_id in type_df[user_col].dropna().unique():
                user_data = type_df[type_df[user_col] == user_id].sort_values('time')
                
                if len(user_data) < 2:
                    continue
                
                time_diffs = user_data['time'].diff().dropna()
                idle_threshold = pd.Timedelta(minutes=2)
                idle_times = time_diffs[time_diffs > idle_threshold]
                
                if len(idle_times) > 0:
                    idle_data.extend([t.total_seconds() for t in idle_times])
            
            if idle_data:
                type_idle[str(instance_type)] = {
                    "idle_periods_count": len(idle_data),
                    "avg_idle_duration": float(np.mean(idle_data)),
                    "median_idle_duration": float(np.median(idle_data)),
                    "max_idle_duration": max(idle_data)
                }
        
        return type_idle
    
    def _analyze_idle_by_user(self, df: pd.DataFrame, user_col: str) -> Dict[str, Any]:
        """按用户分析空闲模式"""
        user_idle = {}
        
        for user_id in df[user_col].dropna().unique():
            user_data = df[df[user_col] == user_id].sort_values('time')
            
            if len(user_data) < 2:
                continue
            
            time_diffs = user_data['time'].diff().dropna()
            idle_threshold = pd.Timedelta(minutes=2)
            long_idle_threshold = pd.Timedelta(minutes=10)
            
            idle_times = time_diffs[time_diffs > idle_threshold]
            long_idle_times = time_diffs[time_diffs > long_idle_threshold]
            
            total_session_time = (user_data['time'].max() - user_data['time'].min()).total_seconds()
            total_user_idle = idle_times.sum().total_seconds() if len(idle_times) > 0 else 0
            
            user_idle[str(user_id)] = {
                "total_instances": len(user_data),
                "session_duration": total_session_time,
                "total_idle_time": total_user_idle,
                "idle_periods_count": len(idle_times),
                "long_idle_periods_count": len(long_idle_times),
                "idle_ratio": total_user_idle / total_session_time if total_session_time > 0 else 0,
                "avg_idle_duration": total_user_idle / len(idle_times) if len(idle_times) > 0 else 0,
                "max_idle_duration": idle_times.max().total_seconds() if len(idle_times) > 0 else 0
            }
        
        return user_idle
    
    def _calculate_efficiency_score(self, durations: pd.Series) -> float:
        """计算效率分数（0-100，分数越高越高效）"""
        if len(durations) == 0:
            return 0.0
        
        # 基于时间的效率分数：快速完成获得高分
        median_time = durations.median()
        avg_time = durations.mean()
        
        # 如果平均时间接近中位数，说明稳定性好
        stability_factor = 1 - abs(avg_time - median_time) / avg_time if avg_time > 0 else 0
        
        # 基础效率分数（反比于平均时间）
        base_score = max(0, 100 - (avg_time / 10))  # 假设10秒为基准
        
        # 结合稳定性
        efficiency_score = base_score * (0.7 + 0.3 * stability_factor)
        
        return min(100.0, max(0.0, efficiency_score))
    
    def _calculate_consistency_score(self, durations: pd.Series) -> float:
        """计算一致性分数（0-100，分数越高越一致）"""
        if len(durations) <= 1:
            return 100.0
        
        # 基于变异系数的一致性分数
        cv = durations.std() / durations.mean() if durations.mean() > 0 else float('inf')
        
        # 变异系数越小，一致性越高
        consistency_score = max(0, 100 - cv * 50)
        
        return min(100.0, max(0.0, consistency_score))
    
    def _calculate_improvement_trend(self, user_data: pd.DataFrame, duration_col: str) -> str:
        """计算用户改进趋势"""
        if len(user_data) < 5:  # 需要足够的数据点
            return "insufficient_data"
        
        # 按时间排序，计算时间趋势
        sorted_data = user_data.sort_values('time')
        durations = sorted_data[duration_col].values
        
        # 简单线性趋势：比较前半部分和后半部分的平均值
        mid_point = len(durations) // 2
        first_half_avg = np.mean(durations[:mid_point])
        second_half_avg = np.mean(durations[mid_point:])
        
        improvement_ratio = (first_half_avg - second_half_avg) / first_half_avg if first_half_avg > 0 else 0
        
        if improvement_ratio > 0.1:
            return "improving"
        elif improvement_ratio < -0.1:
            return "declining"
        else:
            return "stable"
    
    def _generate_efficiency_insights(self, type_efficiency: Dict, user_efficiency: Dict) -> Dict[str, Any]:
        """生成效率洞察"""
        insights = {}
        
        if type_efficiency:
            # 最高效的实例类型
            fastest_type = min(type_efficiency.items(), key=lambda x: x[1]['avg_time'])
            slowest_type = max(type_efficiency.items(), key=lambda x: x[1]['avg_time'])
            most_consistent_type = max(type_efficiency.items(), key=lambda x: x[1]['consistency_score'])
            
            insights["type_insights"] = {
                "fastest_type": {
                    "type": fastest_type[0],
                    "avg_time": fastest_type[1]['avg_time']
                },
                "slowest_type": {
                    "type": slowest_type[0],
                    "avg_time": slowest_type[1]['avg_time']
                },
                "most_consistent_type": {
                    "type": most_consistent_type[0],
                    "consistency_score": most_consistent_type[1]['consistency_score']
                }
            }
        
        if user_efficiency:
            # 最高效的用户
            most_efficient_user = max(user_efficiency.items(), key=lambda x: x[1]['efficiency_score'])
            most_consistent_user = max(user_efficiency.items(), key=lambda x: x[1]['consistency_score'])
            
            # 改进趋势统计
            improvement_stats = {}
            for trend in ['improving', 'stable', 'declining']:
                count = sum(1 for user_data in user_efficiency.values() 
                           if user_data['improvement_trend'] == trend)
                improvement_stats[trend] = count
            
            insights["user_insights"] = {
                "most_efficient_user": {
                    "user": most_efficient_user[0],
                    "efficiency_score": most_efficient_user[1]['efficiency_score']
                },
                "most_consistent_user": {
                    "user": most_consistent_user[0],
                    "consistency_score": most_consistent_user[1]['consistency_score']
                },
                "improvement_trends": improvement_stats
            }
        
        return insights
    
    def _generate_idle_insights(self, type_idle: Dict, user_idle: Dict) -> Dict[str, Any]:
        """生成空闲时间洞察"""
        insights = {}
        
        if type_idle:
            # 找出空闲时间最多的实例类型
            highest_idle_type = max(type_idle.items(), key=lambda x: x[1]['avg_idle_duration'])
            insights["type_insights"] = {
                "highest_idle_type": {
                    "type": highest_idle_type[0],
                    "avg_idle_duration": highest_idle_type[1]['avg_idle_duration']
                }
            }
        
        if user_idle:
            # 找出最活跃和最空闲的用户
            most_active_user = min(user_idle.items(), key=lambda x: x[1]['idle_ratio'])
            most_idle_user = max(user_idle.items(), key=lambda x: x[1]['idle_ratio'])
            
            # 活跃度分类
            activity_levels = {"high": 0, "medium": 0, "low": 0}
            for user_data in user_idle.values():
                idle_ratio = user_data['idle_ratio']
                if idle_ratio < 0.2:
                    activity_levels["high"] += 1
                elif idle_ratio < 0.5:
                    activity_levels["medium"] += 1
                else:
                    activity_levels["low"] += 1
            
            insights["user_insights"] = {
                "most_active_user": {
                    "user": most_active_user[0],
                    "idle_ratio": most_active_user[1]['idle_ratio']
                },
                "most_idle_user": {
                    "user": most_idle_user[0],
                    "idle_ratio": most_idle_user[1]['idle_ratio']
                },
                "activity_distribution": activity_levels
            }
        
        return insights
    
    def generate_2d_instance_report(self, analysis: Dict[str, Any], hours: int = 1) -> str:
        """生成2D Instance专用分析报告"""
        report = f"""
{'='*90}
🎯 2D Instance 效率监控专用分析报告
📅 时间范围: 最近 {hours} 小时
🕐 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{'='*90}

🏗️ 1. 2D Instance 类型统计分析
{'─'*60}"""
        
        stats = analysis.get('instance_statistics', {})
        if 'overall_statistics' in stats:
            report += f"\n总2D Instance数: {stats.get('total_2d_instances', 0)}"
            report += f"\n实例类型数: {stats.get('instance_types_count', 0)}\n"
            
            overall = stats['overall_statistics']
            for instance_type, count in overall['by_type'].items():
                percentage = overall['type_percentages'].get(instance_type, 0)
                report += f"{instance_type}: {count} 个 ({percentage:.1f}%)\n"
            
            # 个人统计
            individual = stats.get('individual_statistics', {})
            if 'total_users' in individual:
                report += f"\n👥 活跃用户数: {individual['total_users']}"
                report += "\n🏆 最高产用户:"
                for user, count in list(individual.get('most_productive_users', {}).items())[:3]:
                    report += f"\n  - {user}: {count} 个实例"
                
                # 类型专家
                specialists = individual.get('type_specialists', {})
                if specialists:
                    report += "\n\n🎯 类型专家:"
                    for inst_type, specialist in specialists.items():
                        report += f"\n  - {inst_type}: {specialist['user']} ({specialist['count']}个, {specialist['percentage']:.1f}%)"
                
                # 多样性排名
                diversity = individual.get('diversity_ranking', [])
                if diversity:
                    report += "\n\n🌈 多样性排名 (使用类型最多的用户):"
                    for i, user_info in enumerate(diversity[:3], 1):
                        report += f"\n  {i}. {user_info['user']}: {user_info['diversity_score']} 种类型"
        
        report += f"""

⚡ 2. 2D Instance 效率分析
{'─'*60}"""
        
        efficiency = analysis.get('instance_efficiency', {})
        if 'overall_efficiency' in efficiency:
            overall_eff = efficiency['overall_efficiency']
            report += f"\n总完成实例数: {efficiency.get('total_completed_instances', 0)}"
            report += f"\n平均完成时间: {overall_eff['avg_completion_time']:.2f} 秒"
            report += f"\n中位数完成时间: {overall_eff['median_completion_time']:.2f} 秒"
            report += f"\n最快完成时间: {overall_eff['min_completion_time']:.2f} 秒"
            report += f"\n最慢完成时间: {overall_eff['max_completion_time']:.2f} 秒\n"
            
            # 效率分布
            dist = overall_eff.get('efficiency_distribution', {})
            report += f"\n📊 效率分布:"
            report += f"\n快速标注: {dist.get('fast_annotations', 0)} 个"
            report += f"\n正常标注: {dist.get('normal_annotations', 0)} 个"
            report += f"\n慢速标注: {dist.get('slow_annotations', 0)} 个"
            
            # 按类型的效率
            by_type = efficiency.get('efficiency_by_type', {})
            if by_type:
                report += f"\n\n🔍 各实例类型效率:"
                for inst_type, eff_data in by_type.items():
                    report += f"\n{inst_type}:"
                    report += f"\n  - 数量: {eff_data['count']}"
                    report += f"\n  - 平均时间: {eff_data['avg_time']:.2f} 秒"
                    report += f"\n  - 效率分数: {eff_data['efficiency_score']:.1f}/100"
                    report += f"\n  - 一致性分数: {eff_data['consistency_score']:.1f}/100"
            
            # 效率洞察
            insights = efficiency.get('efficiency_insights', {})
            if insights:
                type_insights = insights.get('type_insights', {})
                if type_insights:
                    report += f"\n\n💡 类型效率洞察:"
                    report += f"\n最快类型: {type_insights.get('fastest_type', {}).get('type', 'N/A')} ({type_insights.get('fastest_type', {}).get('avg_time', 0):.2f}秒)"
                    report += f"\n最慢类型: {type_insights.get('slowest_type', {}).get('type', 'N/A')} ({type_insights.get('slowest_type', {}).get('avg_time', 0):.2f}秒)"
                    report += f"\n最稳定类型: {type_insights.get('most_consistent_type', {}).get('type', 'N/A')} (一致性: {type_insights.get('most_consistent_type', {}).get('consistency_score', 0):.1f})"
                
                user_insights = insights.get('user_insights', {})
                if user_insights:
                    report += f"\n\n👤 用户效率洞察:"
                    report += f"\n最高效用户: {user_insights.get('most_efficient_user', {}).get('user', 'N/A')} (效率分数: {user_insights.get('most_efficient_user', {}).get('efficiency_score', 0):.1f})"
                    report += f"\n最稳定用户: {user_insights.get('most_consistent_user', {}).get('user', 'N/A')} (一致性分数: {user_insights.get('most_consistent_user', {}).get('consistency_score', 0):.1f})"
                    
                    trends = user_insights.get('improvement_trends', {})
                    report += f"\n改进趋势: 提升中({trends.get('improving', 0)}人) | 稳定({trends.get('stable', 0)}人) | 下降中({trends.get('declining', 0)}人)"
        
        report += f"""

😴 3. 2D Instance 空闲时间分析
{'─'*60}"""
        
        idle = analysis.get('instance_idle_patterns', {})
        if 'overall_idle_patterns' in idle:
            overall_idle = idle['overall_idle_patterns']
            report += f"\n分析用户数: {idle.get('total_users_analyzed', 0)}"
            report += f"\n总空闲时间: {overall_idle['total_idle_time']:.0f} 秒 ({overall_idle['total_idle_time']/3600:.1f} 小时)"
            report += f"\n空闲时间段数: {overall_idle['total_idle_periods']}"
            report += f"\n平均空闲时长: {overall_idle['avg_idle_duration']:.0f} 秒"
            report += f"\n最长空闲时间: {overall_idle['max_idle_duration']:.0f} 秒\n"
            
            # 按类型的空闲分析
            by_type_idle = idle.get('idle_by_instance_type', {})
            if by_type_idle:
                report += f"\n🔍 各实例类型空闲情况:"
                for inst_type, idle_data in by_type_idle.items():
                    report += f"\n{inst_type}: 平均空闲 {idle_data['avg_idle_duration']:.0f}秒 ({idle_data['idle_periods_count']}次)"
            
            # 空闲洞察
            idle_insights = idle.get('idle_insights', {})
            if idle_insights:
                type_insights = idle_insights.get('type_insights', {})
                if type_insights:
                    highest_idle = type_insights.get('highest_idle_type', {})
                    report += f"\n\n💤 空闲洞察:"
                    report += f"\n空闲最多的类型: {highest_idle.get('type', 'N/A')} (平均 {highest_idle.get('avg_idle_duration', 0):.0f}秒)"
                
                user_insights = idle_insights.get('user_insights', {})
                if user_insights:
                    report += f"\n最活跃用户: {user_insights.get('most_active_user', {}).get('user', 'N/A')} (空闲比例: {user_insights.get('most_active_user', {}).get('idle_ratio', 0)*100:.1f}%)"
                    report += f"\n最空闲用户: {user_insights.get('most_idle_user', {}).get('user', 'N/A')} (空闲比例: {user_insights.get('most_idle_user', {}).get('idle_ratio', 0)*100:.1f}%)"
                    
                    activity_dist = user_insights.get('activity_distribution', {})
                    report += f"\n活跃度分布: 高活跃({activity_dist.get('high', 0)}人) | 中活跃({activity_dist.get('medium', 0)}人) | 低活跃({activity_dist.get('low', 0)}人)"
        
        report += f"\n\n{'='*90}\n📋 2D Instance 专用报告结束\n{'='*90}"
        
        return report
    
    def run_2d_instance_analysis(self, hours: int = 1) -> Dict[str, Any]:
        """运行完整的2D Instance分析"""
        # 查询数据
        records = self.query_2d_instance_data(hours)
        
        if not records:
            return {"error": "无法获取数据"}
        
        if len(records) == 0:
            return {"error": f"最近 {hours} 小时内没有2D Instance数据"}
        
        # 转换为DataFrame
        df = pd.DataFrame(records)
        
        print("🔍 正在进行2D Instance专用分析...")
        
        # 执行三个核心分析
        analysis = {
            "instance_statistics": self.analyze_2d_instance_statistics(df),
            "instance_efficiency": self.analyze_2d_instance_efficiency(df),
            "instance_idle_patterns": self.analyze_2d_instance_idle_patterns(df),
            "data_overview": {
                "total_records": len(records),
                "time_range": {
                    "start": df['time'].min() if 'time' in df.columns else None,
                    "end": df['time'].max() if 'time' in df.columns else None
                },
                "available_fields": list(df.columns),
                "instance_type_mapping": INSTANCE_TYPE_MAPPING
            }
        }
        
        return analysis
    
    def close(self):
        """关闭连接"""
        if self.client:
            self.client.close()

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='2D Instance效率监控专用分析工具')
    parser.add_argument('--hours', type=int, default=1, help='分析最近多少小时的数据 (默认: 1)')
    parser.add_argument('--output', type=str, help='输出报告到文件')
    parser.add_argument('--json', action='store_true', help='输出 JSON 格式的分析结果')
    
    args = parser.parse_args()
    
    # 创建分析器
    analyzer = Effm2DInstanceAnalyzer()
    
    try:
        # 连接数据库
        if not analyzer.connect():
            sys.exit(1)
        
        # 运行分析
        analysis = analyzer.run_2d_instance_analysis(args.hours)
        
        if "error" in analysis:
            print(f"❌ 分析失败: {analysis['error']}")
            sys.exit(1)
        
        if args.json:
            # 输出 JSON 格式
            result = json.dumps(analysis, indent=2, default=str, ensure_ascii=False)
        else:
            # 生成文本报告
            result = analyzer.generate_2d_instance_report(analysis, args.hours)
        
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