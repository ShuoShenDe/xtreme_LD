# 用户操作数据分析系统

## 概述

本系统提供了全面的用户操作数据分析功能，通过收集和分析用户在标注工具中的行为数据，为效率提升和用户体验优化提供数据支持。

## 数据收集范围

### 1. 用户交互事件
- **点击操作**: 鼠标点击、键盘输入
- **拖拽操作**: 标注框拖拽、视图平移
- **滚动操作**: 页面滚动、缩放操作
- **工具切换**: 不同标注工具的使用
- **快捷键使用**: 键盘快捷键的使用情况

### 2. 标注行为事件
- **标注创建**: 新建标注对象
- **标注修改**: 调整标注属性
- **标注删除**: 删除标注对象
- **标注完成**: 标注任务完成状态

### 3. 性能监控事件
- **渲染性能**: FPS、渲染时间
- **系统资源**: CPU使用率、内存使用率
- **网络性能**: 网络延迟、数据传输

### 4. 错误和异常事件
- **运行时错误**: JavaScript错误、API调用失败
- **用户操作错误**: 无效操作、权限错误
- **系统错误**: 服务异常、数据错误

## 分析功能

### 1. 用户行为分析

#### API端点
```
GET /api/v1/events/analysis/user-behavior/{user_id}?days=7
```

#### 分析内容
- **基础统计**: 总事件数、标注数量、任务完成数
- **交互行为**: 最常用操作、操作分布、小时活动分布
- **时间分布**: 每日活动、峰值时间、会话时长
- **工具偏好**: 工具使用频率、工具效率对比
- **效率趋势**: 效率改进率、一致性评分

#### 返回数据示例
```json
{
  "user_id": "user-123",
  "analysis_period": "7天",
  "timestamp": "2024-01-01T00:00:00Z",
  "basic_stats": {
    "total_events": 1250,
    "total_annotations": 89,
    "total_tasks": 5,
    "total_time": 3600000,
    "avg_efficiency": 0.85
  },
  "interaction_analysis": {
    "total_interactions": 850,
    "most_used_actions": [
      {"action": "click", "count": 320},
      {"action": "drag", "count": 180},
      {"action": "scroll", "count": 150}
    ],
    "hourly_activity": {
      "9": 120, "10": 150, "11": 180,
      "14": 200, "15": 160, "16": 140
    }
  },
  "time_distribution": {
    "daily_activity": [
      {"date": "2024-01-01", "activity_count": 180},
      {"date": "2024-01-02", "activity_count": 220}
    ]
  },
  "tool_preference": {
    "preferred_tools": [
      {"tool": "pc-tool", "usage_count": 450},
      {"tool": "image-tool", "usage_count": 320}
    ]
  },
  "efficiency_trend": {
    "daily_efficiency": [
      {"date": "2024-01-01", "avg_duration": 8500},
      {"date": "2024-01-02", "avg_duration": 7800}
    ],
    "improvement_rate": 8.2
  }
}
```

### 2. 操作模式分析

#### API端点
```
GET /api/v1/events/analysis/operation-patterns/{user_id}?days=7&tool=pc-tool
```

#### 分析内容
- **操作序列**: 常用操作组合、操作流程
- **操作效率**: 各操作的平均耗时、效率评分
- **错误模式**: 错误类型分布、错误趋势
- **优化建议**: 基于操作模式的改进建议

#### 返回数据示例
```json
{
  "user_id": "user-123",
  "analysis_period": "7天",
  "tool_filter": "pc-tool",
  "operation_sequences": {
    "common_sequences": [
      "click -> drag -> release",
      "scroll -> click -> annotate"
    ],
    "sequence_patterns": {
      "click -> drag": 45,
      "scroll -> click": 32
    }
  },
  "operation_efficiency": {
    "action_efficiency": [
      {"action": "click", "avg_duration": 120},
      {"action": "drag", "avg_duration": 2500},
      {"action": "annotate", "avg_duration": 8500}
    ],
    "efficiency_score": 78.5
  },
  "error_patterns": {
    "error_count": 12,
    "error_types": [
      {"type": "validation", "count": 8, "severity": "medium"},
      {"type": "permission", "count": 4, "severity": "low"}
    ]
  }
}
```

### 3. 效率趋势分析

#### API端点
```
GET /api/v1/events/analysis/efficiency-trends/{user_id}?days=30&interval=1d
```

#### 分析内容
- **标注效率趋势**: 标注速度变化、改进率
- **任务完成趋势**: 任务完成率、完成时间
- **性能指标趋势**: FPS、内存、CPU使用趋势
- **学习曲线**: 技能提升速度、学习阶段

#### 返回数据示例
```json
{
  "user_id": "user-123",
  "analysis_period": "30天",
  "time_interval": "1d",
  "annotation_efficiency_trend": {
    "timeline": [
      {"time": "2024-01-01T00:00:00Z", "avg_duration": 12000},
      {"time": "2024-01-02T00:00:00Z", "avg_duration": 11500}
    ],
    "improvement_rate": 15.2
  },
  "task_completion_trend": {
    "completed_tasks": [
      {"time": "2024-01-01T00:00:00Z", "count": 2},
      {"time": "2024-01-02T00:00:00Z", "count": 3}
    ],
    "completion_rate": 85.0
  },
  "performance_trend": {
    "fps_trend": [
      {"time": "2024-01-01T00:00:00Z", "value": 58.5},
      {"time": "2024-01-02T00:00:00Z", "value": 59.2}
    ]
  },
  "learning_curve": {
    "learning_rate": 12.5,
    "skill_level": "intermediate",
    "improvement_potential": 37.5
  }
}
```

### 4. 用户性能对比

#### API端点
```
GET /api/v1/events/analysis/comparison/{user_id}?comparison_users=user-456,user-789&days=7&metrics=efficiency,speed,accuracy
```

#### 分析内容
- **多用户对比**: 与指定用户的性能对比
- **指标排名**: 效率、速度、准确性排名
- **百分位分析**: 在团队中的位置
- **改进空间**: 相对于其他用户的改进潜力

#### 返回数据示例
```json
{
  "target_user": "user-123",
  "comparison_users": ["user-456", "user-789"],
  "analysis_period": "7天",
  "metrics": ["efficiency", "speed", "accuracy"],
  "comparison_data": {
    "user-123": {
      "metrics": {
        "efficiency": {"avg_duration": 8500, "annotation_count": 89},
        "speed": {"annotations_per_hour": 12.7},
        "accuracy": {"accuracy_rate": 0.92, "error_count": 7}
      }
    },
    "user-456": {
      "metrics": {
        "efficiency": {"avg_duration": 9200, "annotation_count": 76},
        "speed": {"annotations_per_hour": 10.9},
        "accuracy": {"accuracy_rate": 0.88, "error_count": 9}
      }
    }
  },
  "rankings": {
    "metric_rankings": {
      "efficiency": {"rank": 1, "total": 3, "percentile": 100},
      "speed": {"rank": 1, "total": 3, "percentile": 100},
      "accuracy": {"rank": 1, "total": 3, "percentile": 100}
    }
  }
}
```

### 5. 智能建议生成

#### API端点
```
GET /api/v1/events/analysis/recommendations/{user_id}?days=7
```

#### 分析内容
- **效率建议**: 基于标注速度的优化建议
- **准确性建议**: 基于错误率的改进建议
- **工作流程建议**: 基于操作模式的优化建议
- **学习建议**: 基于学习曲线的提升建议

#### 返回数据示例
```json
{
  "user_id": "user-123",
  "analysis_period": "7天",
  "recommendations": [
    {
      "type": "efficiency",
      "priority": "high",
      "title": "标注速度优化",
      "description": "当前平均标注时间为8.5秒，建议通过练习提高标注速度",
      "suggestions": [
        "使用快捷键提高操作效率",
        "熟悉标注工具的各种功能",
        "建立标准化的标注流程"
      ]
    },
    {
      "type": "workflow",
      "priority": "medium",
      "title": "工作流程优化",
      "description": "检测到大量点击操作，建议优化工作流程",
      "suggestions": [
        "使用批量操作功能",
        "设置常用工具的快捷键",
        "考虑使用自动化标注功能"
      ]
    }
  ]
}
```

## 数据存储

### InfluxDB 时序数据库
- **测量值**: `efficiency_annotation`, `efficiency_user_interaction`, `efficiency_performance`, `efficiency_error`
- **标签**: `user_id`, `project_id`, `tool`, `action`, `element`
- **字段**: `duration`, `count`, `fps`, `memory_usage`, `error_type`

### PostgreSQL 关系数据库
- **用户统计表**: `user_stats`
- **项目统计表**: `project_stats`
- **效率指标表**: `efficiency_metrics`

## 使用场景

### 1. 个人效率提升
- 分析个人操作习惯，发现效率瓶颈
- 跟踪学习进度，制定改进计划
- 对比历史数据，评估改进效果

### 2. 团队管理
- 识别高效用户，推广最佳实践
- 发现需要培训的用户
- 评估团队整体效率水平

### 3. 产品优化
- 分析用户操作模式，优化界面设计
- 识别常用功能，改进用户体验
- 发现系统性能问题，进行技术优化

### 4. 质量控制
- 监控标注质量，识别错误模式
- 评估标注一致性，改进标注标准
- 跟踪质量改进效果

## 技术实现

### 前端数据收集
- **事件收集器**: 自动收集用户交互事件
- **数据缓冲**: 本地缓存，批量上报
- **网络管理**: 断网重试，数据压缩

### 后端数据处理
- **异步处理**: Celery任务队列
- **实时分析**: InfluxDB时序查询
- **统计分析**: PostgreSQL聚合计算

### 数据安全
- **用户隐私**: 数据匿名化处理
- **访问控制**: 基于用户权限的数据访问
- **数据保留**: 可配置的数据保留策略

## 配置参数

### 分析参数
- `days`: 分析时间范围（默认7天）
- `interval`: 时间间隔（1h, 6h, 1d, 1w）
- `tool`: 工具类型过滤
- `metrics`: 对比指标选择

### 性能参数
- `sampling_rate`: 事件采样率（0.1-1.0）
- `batch_size`: 批量处理大小
- `flush_interval`: 数据刷新间隔

## 监控和告警

### 性能监控
- API响应时间监控
- 数据库查询性能监控
- 系统资源使用监控

### 异常告警
- 数据收集异常告警
- 分析结果异常告警
- 系统错误告警

## 扩展功能

### 机器学习集成
- 用户行为预测
- 异常模式检测
- 个性化建议生成

### 可视化界面
- 实时数据仪表板
- 趋势图表展示
- 对比分析界面

### 报告生成
- 定期效率报告
- 自定义分析报告
- 数据导出功能 