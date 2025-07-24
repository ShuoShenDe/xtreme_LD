# Image Tool 效率监控 (EFFM) 集成指南

## 📋 概述

本目录包含了 Image Tool 与效率监控服务 (EFFM) 的完整集成方案，提供了从初始化到具体使用的全套解决方案。

## 📁 文件结构

```
ltmComponents/efficiency/
├── index.ts                   # 主效率监控管理器
├── useEfficiency.ts          # Vue Composable Hook
├── init.ts                   # 初始化模块
├── example-integration.ts    # 集成示例代码
└── README.md                 # 本文档
```

## 🚀 快速开始

### 1. 自动初始化 (推荐)

在 `Editor.vue` 的 `onMounted` 中添加：

```typescript
import { autoInitializeEfficiency } from '@/ltmComponents/efficiency/init';

onMounted(async () => {
  // 其他初始化代码...
  
  // 自动初始化效率监控
  await autoInitializeEfficiency();
});
```

### 2. 手动初始化

如果需要更精确的控制：

```typescript
import { manualInitializeEfficiency } from '@/ltmComponents/efficiency/init';

// 手动指定配置
await manualInitializeEfficiency({
  userId: 'user123',
  projectId: 'project456',
  taskId: 'task789',
});
```

### 3. 使用 Composable Hook

在任何 Vue 组件中使用：

```typescript
import { useEfficiency } from '@/ltmComponents/efficiency/useEfficiency';

export default defineComponent({
  setup() {
    const {
      isInitialized,
      trackAnnotation,
      trackImageLoad,
      trackToolSwitch,
    } = useEfficiency();

    // 使用追踪功能...
    
    return {
      isInitialized,
      trackAnnotation,
    };
  }
});
```

## 📊 可追踪的操作类型

### 1. 图像操作
- **图像加载**: 文件名、尺寸、加载时间、成功状态
- **图像缩放**: 缩放比例变化、操作时长
- **图像平移**: 位置变化、移动距离

### 2. 标注操作
- **矩形标注**: 创建、修改、删除、完成时间
- **多边形标注**: 点数、复杂度、操作时长
- **分类标注**: 类别、置信度、标注时间

### 3. 工具效率
- **工具切换**: 从哪个工具切换到哪个工具
- **快捷键使用**: 按键组合、使用频率
- **操作响应时间**: UI 响应速度

### 4. 任务流程
- **任务状态**: 开始、暂停、继续、完成、提交
- **保存操作**: 标注数量、保存时间、成功状态
- **错误处理**: 错误类型、严重程度、上下文信息

### 5. 性能指标
- **渲染性能**: 帧率、渲染时间、对象数量
- **内存使用**: 内存占用、垃圾回收
- **网络请求**: 请求时间、成功率、错误率

## 🔧 具体使用示例

### 标注操作追踪

```typescript
import { createAnnotationTracker } from '@/ltmComponents/efficiency/useEfficiency';

export function useRectangleTool() {
  const annotationTracker = createAnnotationTracker();

  const startDrawing = () => {
    // 开始绘制矩形
    annotationTracker.startAnnotation('rectangle');
  };

  const completeDrawing = (objectId: string, bounds: any) => {
    // 完成矩形绘制
    annotationTracker.completeAnnotation('rectangle', objectId, {
      bounds,
      area: bounds.width * bounds.height,
    });
  };

  return { startDrawing, completeDrawing };
}
```

### 性能监控

```typescript
import { createPerformanceTracker } from '@/ltmComponents/efficiency/useEfficiency';

export function useImageRenderer() {
  const performanceTracker = createPerformanceTracker();

  const renderImage = async (imageData: any) => {
    // 自动追踪渲染时间
    return await performanceTracker.measureTime(
      'image_render',
      async () => {
        // 渲染逻辑
        return await doImageRender(imageData);
      }
    );
  };

  return { renderImage };
}
```

### 错误追踪

```typescript
import { useEfficiency } from '@/ltmComponents/efficiency/useEfficiency';

export function useErrorHandler() {
  const { trackError } = useEfficiency();

  const handleApiError = (error: Error, context: string) => {
    trackError({
      errorType: 'network',
      message: error.message,
      severity: 'high',
      context: { 
        operation: context,
        timestamp: Date.now(),
      },
    });
  };

  return { handleApiError };
}
```

## ⚙️ 配置选项

### 默认配置

```typescript
const defaultConfig = {
  apiEndpoint: '/efficiency/api/v1',
  toolType: 'image-tool',
  batchSize: 50,
  flushInterval: 30000, // 30秒
  performanceMonitoring: {
    enabled: true,
    samplingRate: 1.0,
    captureUserInteractions: true,
    captureErrors: true,
    capturePerformance: true,
  },
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    logLevel: 'info',
    logToConsole: true,
  },
};
```

### 自定义配置

```typescript
import imageToolEfficiency from '@/ltmComponents/efficiency';

await imageToolEfficiency.initialize({
  userId: 'user123',
  projectId: 'project456', 
  taskId: 'task789',
  customConfig: {
    batchSize: 100,
    flushInterval: 60000, // 1分钟
    debug: {
      enabled: true,
      logLevel: 'debug',
    },
  },
});
```

## 🎯 集成要点

### 1. 初始化时机
- **建议**: 在 `Editor.vue` 的 `onMounted` 中进行
- **必须**: 确保有用户ID、项目ID、任务ID

### 2. 数据获取
- **URL参数**: `userId`, `projectId`, `taskId`
- **localStorage**: 备用数据源
- **Pinia Store**: 从状态管理中获取

### 3. 生命周期管理
- **初始化**: 应用启动时自动初始化
- **清理**: 应用关闭时自动清理
- **错误处理**: 初始化失败时的降级策略

### 4. 性能考虑
- **批量上报**: 避免频繁网络请求
- **缓存机制**: 离线时本地缓存
- **采样率**: 可调节的性能监控采样

## 🔍 调试和监控

### 开发环境调试

```typescript
// 开启详细日志
const config = {
  debug: {
    enabled: true,
    logLevel: 'debug',
    logToConsole: true,
  },
};
```

### 查看追踪状态

```typescript
import imageToolEfficiency from '@/ltmComponents/efficiency';

// 检查初始化状态
console.log('EFFM 已初始化:', imageToolEfficiency.initialized);

// 获取追踪器实例
const tracker = imageToolEfficiency.trackerInstance;
```

### 手动刷新数据

```typescript
import { useEfficiency } from '@/ltmComponents/efficiency/useEfficiency';

const { flushData } = useEfficiency();

// 手动上报缓存的数据
await flushData();
```

## 📈 数据查看

启动效率监控服务后，可以通过以下方式查看数据：

1. **API端点**: http://localhost:8001/api/v1/health
2. **Flower监控**: http://localhost:5555
3. **API文档**: http://localhost:8001/docs

## ⚠️ 注意事项

1. **隐私保护**: 不追踪敏感用户数据
2. **性能影响**: 监控代码应该轻量级，不影响用户体验
3. **错误处理**: 监控功能失败不应影响主要功能
4. **网络依赖**: 考虑离线情况下的处理策略

## 🛠️ 故障排除

### 常见问题

1. **初始化失败**
   - 检查 userId, projectId, taskId 是否有效
   - 确认 EFFM 服务是否正常运行
   - 查看控制台错误信息

2. **数据未上报**
   - 检查网络连接
   - 验证 API 端点配置
   - 确认批量上报时间间隔

3. **性能影响**
   - 调整采样率
   - 减少追踪频率
   - 优化批量大小

### 调试命令

```bash
# 检查 EFFM 服务状态
curl http://localhost:8001/api/v1/health

# 查看服务日志
docker-compose -f efficiency-service/docker-compose.yml logs -f
```

## 📚 更多资源

- [EFFM 服务文档](../../../../efficiency-service/README.md)
- [集成示例代码](./example-integration.ts) 