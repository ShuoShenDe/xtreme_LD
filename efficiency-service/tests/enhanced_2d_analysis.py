#!/usr/bin/env python3
"""
增强版 2D Instance 效率分析脚本
增加了标注目标和标注速度的总体和个人分析
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
    'rect': 'cuboid',
    'rectangle': 'cuboid', 
    'bounding_box': 'cuboid',
    'BOUNDING_BOX': 'cuboid',
    'RECTANGLE': 'cuboid',
    'polygon': 'polygon',
    'POLYGON': 'polygon',
    'polyline': 'polyline',
    'POLYLINE': 'polyline',
    'iss': 'issinstance',
    'iss-rect': 'issinstance',
    'iss_unified': 'issinstance',
    'ISS': 'issinstance',
    'ISS_UNIFIED': 'issinstance',
    'ISS_RECT': 'issinstance',
    'keypoint': 'keypoint',
    'key-point': 'keypoint',
    'KEY_POINT': 'keypoint',
}

class Enhanced2DAnalyzer:
    def __init__(self):
        """初始化增强版 2D Instance 分析器"""
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
    
    def analyze_annotation_targets_overall(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析总体标注目标"""
        if df.empty:
            return {"error": "没有数据可分析"}
        
        # 标准化实例类型
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
        
        # 过滤完成的标注事件
        completion_df = self._filter_completion_events(instance_df)
        
        # 分析标注目标类型分布
        target_analysis = {
            "total_annotations": len(completion_df),
            "target_type_distribution": completion_df['normalized_instance_type'].value_counts().to_dict(),
            "target_type_percentages": (completion_df['normalized_instance_type'].value_counts() / len(completion_df) * 100).to_dict(),
            "most_common_target": completion_df['normalized_instance_type'].mode().iloc[0] if not completion_df.empty else None,
            "target_diversity": len(completion_df['normalized_instance_type'].unique()),
        }
        
        # 分析标注对象的复杂度（如果有相关元数据）
        complexity_analysis = self._analyze_target_complexity(completion_df)
        target_analysis["target_complexity"] = complexity_analysis
        
        return target_analysis
    
    def analyze_annotation_speed_overall(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析总体标注速度"""
        if df.empty:
            return {"error": "没有数据可分析"}
        
        # 标准化实例类型
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
        
        # 转换时间字段
        instance_df['time'] = pd.to_datetime(instance_df['time'])
        
        # 过滤完成的标注事件
        completion_df = self._filter_completion_events(instance_df)
        
        if completion_df.empty:
            return {"error": "没有完成的标注事件"}
        
        # 计算时间范围
        time_range = completion_df['time'].max() - completion_df['time'].min()
        total_hours = time_range.total_seconds() / 3600 if time_range.total_seconds() > 0 else 1
        
        # 标注速度分析
        speed_analysis = {
            "time_range": {
                "start": completion_df['time'].min().isoformat(),
                "end": completion_df['time'].max().isoformat(),
                "duration_hours": total_hours
            },
            "overall_speed": {
                "annotations_per_hour": len(completion_df) / total_hours,
                "annotations_per_minute": len(completion_df) / (total_hours * 60),
                "average_time_between_annotations": time_range.total_seconds() / len(completion_df) if len(completion_df) > 1 else 0
            }
        }
        
        # 按类型的标注速度
        speed_by_type = {}
        for inst_type in completion_df['normalized_instance_type'].unique():
            type_data = completion_df[completion_df['normalized_instance_type'] == inst_type]
            speed_by_type[str(inst_type)] = {
                "count": len(type_data),
                "annotations_per_hour": len(type_data) / total_hours,
                "percentage_of_total": len(type_data) / len(completion_df) * 100
            }
        
        speed_analysis["speed_by_type"] = speed_by_type
        
        # 分析每个物体的平均完成时间（按类型）
        completion_time_analysis = self._analyze_completion_time_by_type(completion_df)
        speed_analysis["completion_time_by_type"] = completion_time_analysis
        
        # 时间段分析（按小时）
        hourly_analysis = self._analyze_hourly_speed(completion_df)
        speed_analysis["hourly_patterns"] = hourly_analysis
        
        return speed_analysis
    
    def analyze_annotation_targets_individual(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析个人标注目标"""
        if df.empty:
            return {"error": "没有数据可分析"}
        
        # 标准化实例类型
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
        
        # 寻找用户字段
        user_col = self._find_user_column(instance_df)
        if not user_col:
            return {"error": "未找到用户信息"}
        
        # 过滤完成的标注事件
        completion_df = self._filter_completion_events(instance_df)
        
        individual_targets = {}
        
        for user_id in completion_df[user_col].dropna().unique():
            user_data = completion_df[completion_df[user_col] == user_id]
            
            if len(user_data) > 0:
                # 用户的目标类型分析
                user_targets = user_data['normalized_instance_type'].value_counts()
                
                individual_targets[str(user_id)] = {
                    "total_annotations": len(user_data),
                    "target_distribution": user_targets.to_dict(),
                    "target_percentages": (user_targets / len(user_data) * 100).to_dict(),
                    "most_common_target": user_targets.index[0] if len(user_targets) > 0 else None,
                    "target_diversity": len(user_targets),
                    "specialization_score": self._calculate_specialization_score(user_targets),
                    "complexity_preference": self._analyze_user_complexity_preference(user_data)
                }
        
        # 用户比较分析
        comparison_analysis = self._compare_user_targets(individual_targets)
        
        return {
            "individual_analysis": individual_targets,
            "comparison_analysis": comparison_analysis
        }
    
    def analyze_annotation_speed_individual(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析个人标注速度"""
        if df.empty:
            return {"error": "没有数据可分析"}
        
        # 标准化实例类型
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
        
        # 转换时间字段
        instance_df['time'] = pd.to_datetime(instance_df['time'])
        
        # 寻找用户字段
        user_col = self._find_user_column(instance_df)
        if not user_col:
            return {"error": "未找到用户信息"}
        
        # 过滤完成的标注事件
        completion_df = self._filter_completion_events(instance_df)
        
        individual_speeds = {}
        
        for user_id in completion_df[user_col].dropna().unique():
            user_data = completion_df[completion_df[user_col] == user_id].sort_values('time')
            
            if len(user_data) > 0:
                # 计算用户的时间范围
                user_time_range = user_data['time'].max() - user_data['time'].min()
                user_hours = user_time_range.total_seconds() / 3600 if user_time_range.total_seconds() > 0 else 1
                
                # 用户速度分析
                user_speed = {
                    "session_info": {
                        "start_time": user_data['time'].min().isoformat(),
                        "end_time": user_data['time'].max().isoformat(),
                        "duration_hours": user_hours,
                        "total_annotations": len(user_data)
                    },
                    "speed_metrics": {
                        "annotations_per_hour": len(user_data) / user_hours,
                        "annotations_per_minute": len(user_data) / (user_hours * 60),
                        "average_interval_seconds": user_time_range.total_seconds() / len(user_data) if len(user_data) > 1 else 0
                    }
                }
                
                # 按类型的速度
                speed_by_type = {}
                for inst_type in user_data['normalized_instance_type'].unique():
                    type_data = user_data[user_data['normalized_instance_type'] == inst_type]
                    speed_by_type[str(inst_type)] = {
                        "count": len(type_data),
                        "annotations_per_hour": len(type_data) / user_hours,
                        "percentage_of_user_total": len(type_data) / len(user_data) * 100
                    }
                
                user_speed["speed_by_type"] = speed_by_type
                
                # 速度趋势分析
                user_speed["speed_trend"] = self._analyze_user_speed_trend(user_data)
                
                # 效率等级
                user_speed["efficiency_level"] = self._calculate_efficiency_level(user_speed["speed_metrics"]["annotations_per_hour"])
                
                # 用户的完成时间分析
                user_completion_time = self._analyze_completion_time_by_type(user_data)
                user_speed["completion_time_by_type"] = user_completion_time
                
                individual_speeds[str(user_id)] = user_speed
        
        # 用户速度比较
        speed_comparison = self._compare_user_speeds(individual_speeds)
        
        return {
            "individual_analysis": individual_speeds,
            "speed_comparison": speed_comparison
        }
    
    def _filter_completion_events(self, df: pd.DataFrame) -> pd.DataFrame:
        """过滤完成的标注事件"""
        completion_mask = (
            (df.get('action', pd.Series([], dtype='object')).fillna('') == 'complete') |
            (df.get('event_type', pd.Series([], dtype='object')).fillna('').str.contains('completion|completed', case=False, na=False)) |
            (df.get('field', pd.Series([], dtype='object')).fillna('').str.contains('completion|completed', case=False, na=False))
        )
        
        completion_df = df[completion_mask]
        
        if completion_df.empty:
            completion_df = df  # 如果没有明确的完成标识，使用全部数据
        
        return completion_df
    
    def _find_user_column(self, df: pd.DataFrame) -> Optional[str]:
        """寻找用户字段"""
        user_fields = ['user_id', 'userId', 'createdBy', 'created_by']
        for field in user_fields:
            if field in df.columns:
                return field
        return None
    
    def _analyze_target_complexity(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析标注目标复杂度"""
        complexity_analysis = {
            "simple_shapes": 0,
            "complex_shapes": 0,
            "average_complexity": 0
        }
        
        # 基于类型判断复杂度
        type_complexity = {
            'cuboid': 1,  # 简单
            'polygon': 3,  # 复杂
            'polyline': 2,  # 中等
            'issinstance': 4,  # 最复杂
            'keypoint': 1  # 简单
        }
        
        for inst_type in df['normalized_instance_type'].unique():
            count = len(df[df['normalized_instance_type'] == inst_type])
            complexity = type_complexity.get(str(inst_type), 2)
            
            if complexity <= 2:
                complexity_analysis["simple_shapes"] += count
            else:
                complexity_analysis["complex_shapes"] += count
        
        total_annotations = len(df)
        if total_annotations > 0:
            weighted_complexity = sum(
                len(df[df['normalized_instance_type'] == inst_type]) * type_complexity.get(str(inst_type), 2)
                for inst_type in df['normalized_instance_type'].unique()
            )
            complexity_analysis["average_complexity"] = weighted_complexity / total_annotations
        
        return complexity_analysis
    
    def _analyze_completion_time_by_type(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析每个物体的平均完成时间（按类型）"""
        completion_time_analysis = {}
        
        # 寻找时长相关字段
        duration_fields = ['meta_averagePointInterval', 'meta_duration', 'duration', 'completion_time', 'time_taken', 'value']
        duration_col = None
        
        for field in duration_fields:
            if field in df.columns:
                # 尝试转换为数值（处理字符串数值）
                try:
                    numeric_values = pd.to_numeric(df[field], errors='coerce').dropna()
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
            return {
                "error": "未找到有效的时长数据",
                "available_fields": list(df.columns)
            }
        
        # 转换为数值型
        df[f'{duration_col}_numeric'] = pd.to_numeric(df[duration_col], errors='coerce')
        
        # 过滤有效的时长数据
        valid_df = df[(df[f'{duration_col}_numeric'].notna()) & (df[f'{duration_col}_numeric'] > 0)]
        
        if valid_df.empty:
            return {"error": "没有有效的时长数据"}
        
        # 按类型分析完成时间
        for inst_type in valid_df['normalized_instance_type'].unique():
            type_data = valid_df[valid_df['normalized_instance_type'] == inst_type]
            durations = type_data[f'{duration_col}_numeric']
            
            if len(durations) > 0:
                # 转换毫秒为秒（如果是毫秒级别的数据）
                if duration_col == 'meta_averagePointInterval' and durations.mean() > 1000:
                    durations_seconds = durations / 1000  # 毫秒转秒
                    unit = "秒"
                else:
                    durations_seconds = durations
                    unit = "秒"
                
                completion_time_analysis[str(inst_type)] = {
                    "count": len(durations),
                    "average_completion_time": float(durations_seconds.mean()),
                    "median_completion_time": float(durations_seconds.median()),
                    "min_completion_time": float(durations_seconds.min()),
                    "max_completion_time": float(durations_seconds.max()),
                    "std_completion_time": float(durations_seconds.std()) if len(durations) > 1 else 0,
                    "unit": unit,
                    "data_source": duration_col,
                    "percentiles": {
                        "25th": float(durations_seconds.quantile(0.25)),
                        "75th": float(durations_seconds.quantile(0.75)),
                        "90th": float(durations_seconds.quantile(0.90))
                    }
                }
        
        # 添加总体统计
        if completion_time_analysis:
            all_durations = valid_df[f'{duration_col}_numeric']
            if duration_col == 'meta_averagePointInterval' and all_durations.mean() > 1000:
                all_durations_seconds = all_durations / 1000
                unit = "秒"
            else:
                all_durations_seconds = all_durations
                unit = "秒"
            
            completion_time_analysis["overall"] = {
                "count": len(all_durations),
                "average_completion_time": float(all_durations_seconds.mean()),
                "median_completion_time": float(all_durations_seconds.median()),
                "min_completion_time": float(all_durations_seconds.min()),
                "max_completion_time": float(all_durations_seconds.max()),
                "std_completion_time": float(all_durations_seconds.std()) if len(all_durations) > 1 else 0,
                "unit": unit,
                "data_source": duration_col
            }
        
        return completion_time_analysis
    
    def _analyze_hourly_speed(self, df: pd.DataFrame) -> Dict[str, Any]:
        """分析每小时的标注速度模式"""
        df['hour'] = df['time'].dt.hour
        hourly_counts = df['hour'].value_counts().sort_index()
        
        return {
            "peak_hour": int(hourly_counts.idxmax()) if not hourly_counts.empty else None,
            "peak_hour_count": int(hourly_counts.max()) if not hourly_counts.empty else 0,
            "hourly_distribution": hourly_counts.to_dict(),
            "most_productive_hours": hourly_counts.nlargest(3).to_dict()
        }
    
    def _calculate_specialization_score(self, target_counts: pd.Series) -> float:
        """计算用户专业化分数（0-100，越高越专业化）"""
        if len(target_counts) <= 1:
            return 100.0
        
        # 基于香农熵计算多样性，然后转换为专业化分数
        total = target_counts.sum()
        probabilities = target_counts / total
        entropy = -sum(p * np.log2(p) for p in probabilities if p > 0)
        
        # 最大熵（完全均匀分布）
        max_entropy = np.log2(len(target_counts))
        
        # 专业化分数 = 1 - 标准化熵
        specialization = (1 - entropy / max_entropy) * 100 if max_entropy > 0 else 100
        
        return min(100.0, max(0.0, specialization))
    
    def _analyze_user_complexity_preference(self, user_data: pd.DataFrame) -> str:
        """分析用户复杂度偏好"""
        type_complexity = {
            'cuboid': 1,
            'polygon': 3,
            'polyline': 2,
            'issinstance': 4,
            'keypoint': 1
        }
        
        total_complexity = sum(
            len(user_data[user_data['normalized_instance_type'] == inst_type]) * type_complexity.get(str(inst_type), 2)
            for inst_type in user_data['normalized_instance_type'].unique()
        )
        
        avg_complexity = total_complexity / len(user_data) if len(user_data) > 0 else 0
        
        if avg_complexity <= 1.5:
            return "simple_preference"
        elif avg_complexity <= 2.5:
            return "moderate_preference"
        else:
            return "complex_preference"
    
    def _compare_user_targets(self, individual_targets: Dict) -> Dict[str, Any]:
        """比较用户目标偏好"""
        if not individual_targets:
            return {}
        
        # 找出最多样化的用户
        most_diverse_user = max(individual_targets.items(), key=lambda x: x[1]['target_diversity'])
        
        # 找出最专业化的用户
        most_specialized_user = max(individual_targets.items(), key=lambda x: x[1]['specialization_score'])
        
        # 最高产的用户
        most_productive_user = max(individual_targets.items(), key=lambda x: x[1]['total_annotations'])
        
        return {
            "most_diverse_user": {
                "user": most_diverse_user[0],
                "diversity_score": most_diverse_user[1]['target_diversity']
            },
            "most_specialized_user": {
                "user": most_specialized_user[0],
                "specialization_score": most_specialized_user[1]['specialization_score']
            },
            "most_productive_user": {
                "user": most_productive_user[0],
                "total_annotations": most_productive_user[1]['total_annotations']
            }
        }
    
    def _analyze_user_speed_trend(self, user_data: pd.DataFrame) -> str:
        """分析用户速度趋势"""
        if len(user_data) < 5:
            return "insufficient_data"
        
        # 将数据分为前后两半，比较标注间隔
        mid_point = len(user_data) // 2
        first_half = user_data.iloc[:mid_point]
        second_half = user_data.iloc[mid_point:]
        
        if len(first_half) < 2 or len(second_half) < 2:
            return "insufficient_data"
        
        first_half_interval = (first_half['time'].max() - first_half['time'].min()).total_seconds() / len(first_half)
        second_half_interval = (second_half['time'].max() - second_half['time'].min()).total_seconds() / len(second_half)
        
        if first_half_interval > 0:
            speed_change = (first_half_interval - second_half_interval) / first_half_interval
            
            if speed_change > 0.2:
                return "accelerating"
            elif speed_change < -0.2:
                return "decelerating"
            else:
                return "stable"
        
        return "stable"
    
    def _calculate_efficiency_level(self, annotations_per_hour: float) -> str:
        """计算效率等级"""
        if annotations_per_hour >= 20:
            return "very_high"
        elif annotations_per_hour >= 10:
            return "high"
        elif annotations_per_hour >= 5:
            return "medium"
        elif annotations_per_hour >= 2:
            return "low"
        else:
            return "very_low"
    
    def _compare_user_speeds(self, individual_speeds: Dict) -> Dict[str, Any]:
        """比较用户速度"""
        if not individual_speeds:
            return {}
        
        # 提取速度数据
        speed_data = {
            user: data['speed_metrics']['annotations_per_hour']
            for user, data in individual_speeds.items()
        }
        
        if not speed_data:
            return {}
        
        fastest_user = max(speed_data.items(), key=lambda x: x[1])
        slowest_user = min(speed_data.items(), key=lambda x: x[1])
        average_speed = sum(speed_data.values()) / len(speed_data)
        
        # 速度等级分布
        level_distribution = {}
        for user, data in individual_speeds.items():
            level = data['efficiency_level']
            level_distribution[level] = level_distribution.get(level, 0) + 1
        
        return {
            "fastest_user": {
                "user": fastest_user[0],
                "speed": fastest_user[1]
            },
            "slowest_user": {
                "user": slowest_user[0],
                "speed": slowest_user[1]
            },
            "average_speed": average_speed,
            "speed_range": fastest_user[1] - slowest_user[1],
            "efficiency_level_distribution": level_distribution
        }
    
    def generate_enhanced_report(self, analysis: Dict[str, Any], hours: int = 1) -> str:
        """生成增强版分析报告"""
        report = f"""
{'='*100}
🎯 增强版 2D Instance 效率监控分析报告
📅 时间范围: 最近 {hours} 小时
🕐 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{'='*100}

📊 1. 总体标注目标分析
{'─'*70}"""
        
        targets_overall = analysis.get('annotation_targets_overall', {})
        if 'total_annotations' in targets_overall:
            report += f"\n总标注数量: {targets_overall['total_annotations']}"
            report += f"\n目标类型多样性: {targets_overall['target_diversity']} 种"
            report += f"\n最常见目标: {targets_overall['most_common_target']}\n"
            
            report += "\n🎯 目标类型分布:"
            for target_type, count in targets_overall['target_type_distribution'].items():
                percentage = targets_overall['target_type_percentages'].get(target_type, 0)
                report += f"\n  {target_type}: {count} 个 ({percentage:.1f}%)"
            
            complexity = targets_overall.get('target_complexity', {})
            if complexity:
                report += f"\n\n🔧 目标复杂度分析:"
                report += f"\n  简单形状: {complexity.get('simple_shapes', 0)} 个"
                report += f"\n  复杂形状: {complexity.get('complex_shapes', 0)} 个"
                report += f"\n  平均复杂度: {complexity.get('average_complexity', 0):.1f}/4"
        
        report += f"""

🚀 2. 总体标注速度分析
{'─'*70}"""
        
        speed_overall = analysis.get('annotation_speed_overall', {})
        if 'overall_speed' in speed_overall:
            overall = speed_overall['overall_speed']
            time_info = speed_overall.get('time_range', {})
            
            report += f"\n⏰ 时间信息:"
            report += f"\n  开始时间: {time_info.get('start', 'N/A')}"
            report += f"\n  结束时间: {time_info.get('end', 'N/A')}"
            report += f"\n  持续时长: {time_info.get('duration_hours', 0):.1f} 小时"
            
            report += f"\n\n📈 整体速度指标:"
            report += f"\n  每小时标注数: {overall['annotations_per_hour']:.1f} 个/小时"
            report += f"\n  每分钟标注数: {overall['annotations_per_minute']:.2f} 个/分钟"
            report += f"\n  平均标注间隔: {overall['average_time_between_annotations']:.0f} 秒"
            
            speed_by_type = speed_overall.get('speed_by_type', {})
            if speed_by_type:
                report += f"\n\n🎯 各类型标注速度:"
                for target_type, speed_data in speed_by_type.items():
                    report += f"\n  {target_type}: {speed_data['annotations_per_hour']:.1f} 个/小时 ({speed_data['percentage_of_total']:.1f}%)"
            
            # 添加按类型的平均完成时间分析
            completion_time = speed_overall.get('completion_time_by_type', {})
            if completion_time and 'error' not in completion_time:
                report += f"\n\n⏱️ 平均完成时间分析 (按类型):"
                
                # 显示总体统计
                overall_time = completion_time.get('overall', {})
                if overall_time:
                    report += f"\n  总体平均: {overall_time.get('average_completion_time', 0):.1f} {overall_time.get('unit', '秒')}"
                    report += f" (中位数: {overall_time.get('median_completion_time', 0):.1f}{overall_time.get('unit', '秒')})"
                
                # 按类型显示
                for target_type, time_data in completion_time.items():
                    if target_type != 'overall' and isinstance(time_data, dict) and 'average_completion_time' in time_data:
                        avg_time = time_data['average_completion_time']
                        min_time = time_data['min_completion_time']
                        max_time = time_data['max_completion_time']
                        unit = time_data.get('unit', '秒')
                        
                        report += f"\n  {target_type}: 平均 {avg_time:.1f}{unit}"
                        report += f" (范围: {min_time:.1f}-{max_time:.1f}{unit})"
                        
                        # 显示分位数信息
                        percentiles = time_data.get('percentiles', {})
                        if percentiles:
                            report += f" [25%-75%: {percentiles.get('25th', 0):.1f}-{percentiles.get('75th', 0):.1f}{unit}]"
            elif completion_time and 'error' in completion_time:
                report += f"\n\n⏱️ 完成时间分析: {completion_time['error']}"
            
            hourly = speed_overall.get('hourly_patterns', {})
            if hourly:
                report += f"\n\n⏰ 时间模式分析:"
                report += f"\n  最高产时段: {hourly.get('peak_hour', 'N/A')}:00 ({hourly.get('peak_hour_count', 0)} 个)"
                productive_hours = hourly.get('most_productive_hours', {})
                report += f"\n  最高产时间段: {', '.join(f'{h}:00({c}个)' for h, c in list(productive_hours.items())[:3])}"
        
        report += f"""

👤 3. 个人标注目标分析
{'─'*70}"""
        
        targets_individual = analysis.get('annotation_targets_individual', {})
        individual_data = targets_individual.get('individual_analysis', {})
        
        if individual_data:
            report += f"\n📊 用户目标偏好:"
            for user, data in individual_data.items():
                report += f"\n\n用户 {user}:"
                report += f"\n  总标注数: {data['total_annotations']}"
                report += f"\n  目标多样性: {data['target_diversity']} 种"
                report += f"\n  专业化分数: {data['specialization_score']:.1f}/100"
                report += f"\n  复杂度偏好: {data['complexity_preference']}"
                report += f"\n  最常标注: {data['most_common_target']}"
                
                target_dist = data.get('target_distribution', {})
                if target_dist:
                    report += f"\n  类型分布: {', '.join(f'{t}({c}个)' for t, c in target_dist.items())}"
            
            comparison = targets_individual.get('comparison_analysis', {})
            if comparison:
                report += f"\n\n🏆 用户对比:"
                if 'most_diverse_user' in comparison:
                    diverse = comparison['most_diverse_user']
                    report += f"\n  最多样化: {diverse['user']} ({diverse['diversity_score']} 种类型)"
                if 'most_specialized_user' in comparison:
                    specialized = comparison['most_specialized_user']
                    report += f"\n  最专业化: {specialized['user']} (专业化分数: {specialized['specialization_score']:.1f})"
                if 'most_productive_user' in comparison:
                    productive = comparison['most_productive_user']
                    report += f"\n  最高产: {productive['user']} ({productive['total_annotations']} 个标注)"
        
        report += f"""

⚡ 4. 个人标注速度分析
{'─'*70}"""
        
        speed_individual = analysis.get('annotation_speed_individual', {})
        individual_speed_data = speed_individual.get('individual_analysis', {})
        
        if individual_speed_data:
            report += f"\n🚀 用户速度表现:"
            for user, data in individual_speed_data.items():
                session = data.get('session_info', {})
                metrics = data.get('speed_metrics', {})
                
                report += f"\n\n用户 {user}:"
                report += f"\n  会话时长: {session.get('duration_hours', 0):.1f} 小时"
                report += f"\n  总标注数: {session.get('total_annotations', 0)}"
                report += f"\n  标注速度: {metrics.get('annotations_per_hour', 0):.1f} 个/小时"
                report += f"\n  效率等级: {data.get('efficiency_level', 'unknown')}"
                report += f"\n  速度趋势: {data.get('speed_trend', 'unknown')}"
                
                speed_by_type = data.get('speed_by_type', {})
                if speed_by_type:
                    report += f"\n  分类速度: {', '.join(f'{t}({s:.1f}/小时)' for t, s in {k: v['annotations_per_hour'] for k, v in speed_by_type.items()}.items())}"
                
                # 用户的完成时间分析
                user_completion_time = data.get('completion_time_by_type', {})
                if user_completion_time and 'error' not in user_completion_time:
                    report += f"\n  完成时间:"
                    
                    # 显示用户总体完成时间
                    overall_time = user_completion_time.get('overall', {})
                    if overall_time:
                        avg_time = overall_time.get('average_completion_time', 0)
                        unit = overall_time.get('unit', '秒')
                        report += f" 平均{avg_time:.1f}{unit}"
                    
                    # 显示各类型完成时间
                    type_times = []
                    for target_type, time_data in user_completion_time.items():
                        if target_type != 'overall' and isinstance(time_data, dict) and 'average_completion_time' in time_data:
                            avg_time = time_data['average_completion_time']
                            unit = time_data.get('unit', '秒')
                            type_times.append(f"{target_type}({avg_time:.1f}{unit})")
                    
                    if type_times:
                        report += f", 分类: {', '.join(type_times)}"
            
            speed_comparison = speed_individual.get('speed_comparison', {})
            if speed_comparison:
                report += f"\n\n🏁 速度对比:"
                if 'fastest_user' in speed_comparison:
                    fastest = speed_comparison['fastest_user']
                    report += f"\n  最快用户: {fastest['user']} ({fastest['speed']:.1f} 个/小时)"
                if 'slowest_user' in speed_comparison:
                    slowest = speed_comparison['slowest_user']
                    report += f"\n  最慢用户: {slowest['user']} ({slowest['speed']:.1f} 个/小时)"
                if 'average_speed' in speed_comparison:
                    report += f"\n  平均速度: {speed_comparison['average_speed']:.1f} 个/小时"
                
                level_dist = speed_comparison.get('efficiency_level_distribution', {})
                if level_dist:
                    report += f"\n  效率分布: {', '.join(f'{level}({count}人)' for level, count in level_dist.items())}"
        
        report += f"\n\n{'='*100}\n📋 增强版分析报告结束\n{'='*100}"
        
        return report
    
    def run_enhanced_analysis(self, hours: int = 1) -> Dict[str, Any]:
        """运行完整的增强版分析"""
        # 查询数据
        records = self.query_2d_instance_data(hours)
        
        if not records:
            return {"error": "无法获取数据"}
        
        if len(records) == 0:
            return {"error": f"最近 {hours} 小时内没有2D Instance数据"}
        
        # 转换为DataFrame
        df = pd.DataFrame(records)
        
        print("🔍 正在进行增强版2D Instance分析...")
        
        # 执行分析
        analysis = {
            "annotation_targets_overall": self.analyze_annotation_targets_overall(df),
            "annotation_speed_overall": self.analyze_annotation_speed_overall(df),
            "annotation_targets_individual": self.analyze_annotation_targets_individual(df),
            "annotation_speed_individual": self.analyze_annotation_speed_individual(df),
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
    parser = argparse.ArgumentParser(description='增强版2D Instance效率监控分析工具')
    parser.add_argument('--hours', type=int, default=1, help='分析最近多少小时的数据 (默认: 1)')
    parser.add_argument('--output', type=str, help='输出报告到文件')
    parser.add_argument('--json', action='store_true', help='输出 JSON 格式的分析结果')
    
    args = parser.parse_args()
    
    # 创建分析器
    analyzer = Enhanced2DAnalyzer()
    
    try:
        # 连接数据库
        if not analyzer.connect():
            sys.exit(1)
        
        # 运行分析
        analysis = analyzer.run_enhanced_analysis(args.hours)
        
        if "error" in analysis:
            print(f"❌ 分析失败: {analysis['error']}")
            sys.exit(1)
        
        if args.json:
            # 输出 JSON 格式
            result = json.dumps(analysis, indent=2, default=str, ensure_ascii=False)
        else:
            # 生成文本报告
            result = analyzer.generate_enhanced_report(analysis, args.hours)
        
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