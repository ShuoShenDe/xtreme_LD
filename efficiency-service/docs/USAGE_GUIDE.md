# 用户操作数据分析系统使用指南

## 🚀 快速开始

### 1. 服务状态检查

首先确认效率监控服务正在运行：

```bash
# 检查服务状态
docker-compose ps

# 检查服务健康状态
curl http://localhost:8001/api/v1/health
```

### 2. 前端集成

#### 在Vue 3项目中使用

```typescript
// 1. 安装效率监控SDK
import { useEfficiency } from '../efficiency/useEfficiency';

// 2. 在组件中使用
export default {
  setup() {
    const { initialize, trackAnnotation, trackInteraction, trackError } = useEfficiency();
    
    // 3. 初始化效率监控
    onMounted(async () => {
      await initialize({
        userId: 'current-user-id',
        projectId: 'current-project-id',
        taskId: 'current-task-id',
        customConfig: {
          apiEndpoint: 'http://localhost:8001/api/v1/events',
          toolType: 'pc-tool' // 或 'image-tool', 'text-tool', 'main'
        }
      });
    });
    
    // 4. 追踪用户操作
    const handleAnnotation = () => {
      trackAnnotation('complete', {
        annotationType: 'cuboid',
        duration: 5000,
        metadata: { objectId: 'obj-123' }
      });
    };
    
    const handleInteraction = () => {
      trackInteraction('click', {
        timestamp: Date.now(),
        position: { x: 100, y: 200 },
        metadata: { element: 'toolbar' }
      });
    };
    
    return {
      handleAnnotation,
      handleInteraction
    };
  }
};
```

#### 在PC Tool中使用

```typescript
// src/main.ts
import { EfficiencyTracker } from '../efficiency';

const tracker = EfficiencyTracker.getInstance({
  apiUrl: 'http://localhost:8001/api/v1/events',
  userId: getCurrentUserId(),
  projectId: getCurrentProjectId(),
  tool: 'pc-tool'
});

tracker.start();
```

#### 在Image Tool中使用

```typescript
// src/main.ts
import { EfficiencyTracker } from '../efficiency';

const tracker = EfficiencyTracker.getInstance({
  apiUrl: 'http://localhost:8001/api/v1/events',
  userId: getCurrentUserId(),
  projectId: getCurrentProjectId(),
  tool: 'image-tool'
});

tracker.start();
```

### 3. API使用示例

#### 用户行为分析

```bash
# 获取用户行为分析（最近7天）
curl -X GET "http://localhost:8001/api/v1/events/analysis/user-behavior/user-123?days=7"
```

**返回数据示例**：
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
      {"action": "drag", "count": 180}
    ],
    "hourly_activity": {
      "9": 120, "10": 150, "11": 180
    }
  }
}
```

#### 操作模式分析

```bash
# 获取操作模式分析（指定工具）
curl -X GET "http://localhost:8001/api/v1/events/analysis/operation-patterns/user-123?days=7&tool=pc-tool"
```

**返回数据示例**：
```json
{
  "user_id": "user-123",
  "analysis_period": "7天",
  "tool_filter": "pc-tool",
  "operation_sequences": {
    "common_sequences": [
      "click -> drag -> release",
      "scroll -> click -> annotate"
    ]
  },
  "operation_efficiency": {
    "efficiency_score": 78.5,
    "action_efficiency": [
      {"action": "click", "avg_duration": 120},
      {"action": "drag", "avg_duration": 2500}
    ]
  }
}
```

#### 效率趋势分析

```bash
# 获取效率趋势分析（30天，每日间隔）
curl -X GET "http://localhost:8001/api/v1/events/analysis/efficiency-trends/user-123?days=30&interval=1d"
```

**返回数据示例**：
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
  "learning_curve": {
    "learning_rate": 12.5,
    "skill_level": "intermediate",
    "improvement_potential": 37.5
  }
}
```

#### 智能建议生成

```bash
# 获取个性化改进建议
curl -X GET "http://localhost:8001/api/v1/events/analysis/recommendations/user-123?days=7"
```

**返回数据示例**：
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
    }
  ]
}
```

### 4. 数据可视化集成

#### 使用Chart.js创建图表

```html
<!DOCTYPE html>
<html>
<head>
    <title>用户效率分析</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <canvas id="efficiencyChart"></canvas>
    
    <script>
        // 获取效率趋势数据
        async function loadEfficiencyData() {
            const response = await fetch('http://localhost:8001/api/v1/events/analysis/efficiency-trends/user-123?days=30&interval=1d');
            const data = await response.json();
            
            // 创建图表
            const ctx = document.getElementById('efficiencyChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.annotation_efficiency_trend.timeline.map(item => 
                        new Date(item.time).toLocaleDateString()
                    ),
                    datasets: [{
                        label: '平均标注时间（秒）',
                        data: data.annotation_efficiency_trend.timeline.map(item => 
                            item.avg_duration / 1000
                        ),
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        loadEfficiencyData();
    </script>
</body>
</html>
```

#### 使用Vue 3 + ECharts

```vue
<template>
  <div class="efficiency-dashboard">
    <div ref="chartRef" style="width: 100%; height: 400px;"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as echarts from 'echarts';

const chartRef = ref(null);

const loadEfficiencyData = async () => {
  try {
    const response = await fetch('http://localhost:8001/api/v1/events/analysis/efficiency-trends/user-123?days=30&interval=1d');
    const data = await response.json();
    
    const chart = echarts.init(chartRef.value);
    
    const option = {
      title: {
        text: '用户效率趋势'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: data.annotation_efficiency_trend.timeline.map(item => 
          new Date(item.time).toLocaleDateString()
        )
      },
      yAxis: {
        type: 'value',
        name: '平均标注时间（秒）'
      },
      series: [{
        name: '标注时间',
        type: 'line',
        data: data.annotation_efficiency_trend.timeline.map(item => 
          item.avg_duration / 1000
        ),
        smooth: true
      }]
    };
    
    chart.setOption(option);
  } catch (error) {
    console.error('加载数据失败:', error);
  }
};

onMounted(() => {
  loadEfficiencyData();
});
</script>
```

### 5. 实际应用场景

#### 个人效率提升

```typescript
// 个人仪表板组件
export default {
  setup() {
    const efficiencyData = ref(null);
    const recommendations = ref([]);
    
    const loadPersonalData = async () => {
      // 加载个人效率数据
      const response = await fetch(`/api/v1/events/analysis/user-behavior/${userId}?days=7`);
      efficiencyData.value = await response.json();
      
      // 加载改进建议
      const recResponse = await fetch(`/api/v1/events/analysis/recommendations/${userId}?days=7`);
      recommendations.value = (await recResponse.json()).recommendations;
    };
    
    return {
      efficiencyData,
      recommendations,
      loadPersonalData
    };
  }
};
```

#### 团队管理

```typescript
// 团队管理组件
export default {
  setup() {
    const teamData = ref([]);
    
    const loadTeamData = async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      
      for (const userId of userIds) {
        const response = await fetch(`/api/v1/events/analysis/comparison/${userId}?comparison_users=${userIds.join(',')}&days=7&metrics=efficiency,speed,accuracy`);
        const data = await response.json();
        teamData.value.push(data);
      }
    };
    
    return {
      teamData,
      loadTeamData
    };
  }
};
```

### 6. 配置和调优

#### 前端配置

```typescript
// 效率监控配置
const config = {
  apiEndpoint: 'http://localhost:8001/api/v1/events',
  userId: 'current-user-id',
  projectId: 'current-project-id',
  taskId: 'current-task-id',
  toolType: 'pc-tool',
  
  // 性能监控配置
  performanceMonitoring: {
    enabled: true,
    samplingRate: 0.1, // 10%采样率
    metricsInterval: 5000, // 5秒间隔
    captureUserInteractions: true,
    captureErrors: true
  },
  
  // 数据缓冲配置
  batchSize: 100,
  flushInterval: 10000, // 10秒刷新
  
  // 调试配置
  debug: {
    enabled: false,
    logLevel: 'info'
  }
};
```

#### 后端配置

```yaml
# docker-compose.yml 环境变量
environment:
  - POSTGRES_HOST=postgres
  - POSTGRES_PORT=5432
  - POSTGRES_USER=postgres
  - POSTGRES_PASSWORD=password
  - POSTGRES_DB=xtreme1_efficiency
  - INFLUXDB_HOST=influxdb
  - INFLUXDB_PORT=8086
  - INFLUXDB_TOKEN=your_token
  - INFLUXDB_ORG=xtreme1
  - INFLUXDB_BUCKET=efficiency_events
  - REDIS_HOST=redis
  - REDIS_PORT=6379
```

### 7. 故障排除

#### 常见问题

1. **服务无法启动**
   ```bash
   # 检查端口占用
   netstat -ano | findstr :8001
   
   # 检查Docker容器状态
   docker-compose logs efficiency_service
   ```

2. **数据收集失败**
   ```bash
   # 检查网络连接
   curl http://localhost:8001/api/v1/health
   
   # 检查数据库连接
   docker-compose exec postgres psql -U postgres -d xtreme1_efficiency
   ```

3. **分析结果为空**
   ```bash
   # 检查是否有数据
   curl http://localhost:8001/api/v1/events/stats/test_user_001
   
   # 检查InfluxDB数据
   docker-compose exec influxdb influx query "from(bucket: \"efficiency_events\") |> range(start: -1d)"
   ```

#### 日志查看

```bash
# 查看服务日志
docker-compose logs -f efficiency_service

# 查看Worker日志
docker-compose logs -f efficiency_worker

# 查看数据库日志
docker-compose logs -f postgres
```

### 8. 性能优化

#### 前端优化

```typescript
// 减少数据收集频率
const config = {
  performanceMonitoring: {
    samplingRate: 0.05, // 5%采样率
    metricsInterval: 10000 // 10秒间隔
  }
};

// 使用防抖减少API调用
import { debounce } from 'lodash';

const debouncedTrack = debounce(trackAnnotation, 1000);
```

#### 后端优化

```python
# 增加缓存
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

# 优化数据库查询
async def get_user_stats_optimized(user_id: str):
    # 使用缓存
    cache_key = f"user_stats:{user_id}"
    cached_data = await cache.get(cache_key)
    if cached_data:
        return cached_data
    
    # 数据库查询
    data = await database.query(...)
    
    # 设置缓存
    await cache.set(cache_key, data, expire=300)  # 5分钟缓存
    return data
```

## 📚 总结

这个用户操作数据分析系统提供了：

1. **完整的数据收集** - 自动收集用户交互、标注、性能数据
2. **丰富的分析功能** - 行为分析、模式识别、趋势预测
3. **灵活的API接口** - RESTful API，支持多种查询参数
4. **可视化支持** - 易于集成各种图表库
5. **个性化建议** - 基于数据的智能改进建议

通过合理配置和使用，可以显著提升个人和团队的标注效率，为产品优化和管理决策提供有力支持。 