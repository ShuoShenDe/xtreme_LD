# EFFM重构总结 - 移动到Frontend层级

## 🎯 重构目标

将效率监控（EFFM）组件从 `frontend/image-tool/src/ltmComponents/efficiency/` 重构为 `frontend/efficiency/`，使其成为所有前端项目（main、pc-tool、image-tool、text-tool）的共享组件。

## ✅ 已完成的工作

### 1. 目录结构重组

**原路径**: `frontend/image-tool/src/ltmComponents/efficiency/`  
**新路径**: `frontend/efficiency/`

```
frontend/efficiency/
├── README.md
├── index.ts                      # 主入口文件
├── useEfficiency.ts              # Vue Composition API Hook
├── init.ts                       # 自动初始化模块
├── integration-example.ts        # 完整集成示例
├── example-integration.ts        # 基础使用示例
├── ISS_INTEGRATION_GUIDE.md     # ISS集成指南
├── core/                         # 核心功能模块
│   ├── EfficiencyTracker.ts
│   ├── EventCollector.ts
│   ├── DataBuffer.ts
│   └── NetworkManager.ts
├── integrations/                 # 各工具集成
│   ├── ImageToolIntegration.ts
│   ├── PcToolIntegration.ts
│   └── TextToolIntegration.ts
├── types/                        # 类型定义
│   ├── config.ts
│   └── events.ts
└── utils/                        # 工具函数
    ├── performance.ts
    ├── storage.ts
    └── validation.ts
```

### 2. Import路径更新

所有使用EFFM的文件已更新import路径：

**Editor.vue**:
```typescript
// 之前
import { useEfficiency } from '@/ltmComponents/efficiency/useEfficiency';

// 现在
import { useEfficiency } from '@/../../efficiency/useEfficiency';
```

**IssTool.ts**:
```typescript
// 之前
import { ImageToolEfficiencyManager } from '../../../../ltmComponents/efficiency/index';

// 现在
import { imageToolEfficiency } from '../../../../../../efficiency/index';
```

**result-save.ts & result-request.ts**:
```typescript
// 之前
import { ImageToolEfficiencyManager } from '../../ltmComponents/efficiency/index';

// 现在
import { imageToolEfficiency } from '../../../efficiency/index';
```

### 3. API接口统一

将原来的`ImageToolEfficiencyManager.getInstance()`模式改为直接使用导出的单例：

```typescript
// 之前
const efficiencyManager = ImageToolEfficiencyManager.getInstance();

// 现在
const efficiencyManager = imageToolEfficiency;
```

### 4. 方法调用适配

更新了所有方法调用以匹配新的API：

```typescript
// trackSaveOperation/trackLoadOperation -> trackPerformance
efficiencyManager.trackPerformance('operation_name', duration, 'ms', metadata);

// trackError 使用新的错误格式
efficiencyManager.trackError({
  errorType: 'runtime',
  message: error.message,
  severity: 'medium',
  context: { /* additional data */ }
});
```

### 5. 配置文件更新

- 移除了对特定项目store的依赖
- 使init.ts更加通用，适用于所有前端项目
- 保持向后兼容性

## 🔧 需要注意的事项

### 1. Store依赖问题

`init.ts`文件中的`getConfigFromStore`函数已被临时禁用，因为它依赖于特定项目的Pinia store。各项目需要根据自己的store结构进行适配：

```typescript
// TODO: 各项目需要根据自己的store结构更新这部分
// const projectStore = useProjectMetaStore();
```

### 2. 相对路径配置

在不同的前端项目中使用时，需要根据项目结构调整相对路径：

- **image-tool**: `@/../../efficiency/`
- **pc-tool**: `@/../../efficiency/` (需要验证)
- **text-tool**: `@/../../efficiency/` (需要验证)  
- **main**: `@/efficiency/` (需要验证)

### 3. 类型兼容性和API不匹配

某些工具文件中存在方法名不匹配的问题，需要根据实际的API接口进行调整：

- `trackAnnotationStart/trackAnnotationEnd` 不存在，应使用 `trackAnnotation`
- `trackAnnotationComplete` 不存在，应使用 `trackPerformance` 或 `trackAnnotation`
- `trackInteraction` 不存在，应使用 `trackPerformance`
- 某些类型定义需要更新（如 Vector2[] vs number[]）

### 4. Vite和TypeScript配置

已添加路径别名配置：

**vite.config.ts**:
```typescript
{
  find: /^@efficiency/,
  replacement: pathResolve('../efficiency') + '/',
}
```

**tsconfig.json**:
```typescript
"@efficiency/*": ["../efficiency/*"]
```

## 📝 使用方法

### 在新项目中集成

```typescript
// 1. 导入useEfficiency Hook
import { useEfficiency } from '@efficiency/useEfficiency';

// 2. 在组件中使用
const { initializeEfficiency, trackPerformance } = useEfficiency();

// 3. 初始化
await initializeEfficiency();

// 4. 跟踪事件
trackPerformance('operation_name', value, 'ms', { context: 'data' });
```

### 直接使用管理器

```typescript
// 1. 导入管理器实例
import { imageToolEfficiency } from '@efficiency/index';

// 2. 直接使用
imageToolEfficiency.trackPerformance('metric', 100, 'ms');
```

## 🚀 下一步计划

### 1. 修复API兼容性问题

- [ ] 修复IssTool.ts中的方法调用
- [ ] 修复IssRectTool.ts中的方法调用
- [ ] 统一所有方法名和参数格式
- [ ] 解决类型不匹配问题

### 2. 验证其他项目集成

- [ ] 为pc-tool添加Vite和TypeScript别名配置
- [ ] 为text-tool添加Vite和TypeScript别名配置  
- [ ] 为main项目添加相应的配置

### 3. 完善通用性

- [ ] 创建各项目的配置适配器
- [ ] 统一各项目的初始化流程
- [ ] 添加项目特定的事件类型

### 4. 性能优化

- [ ] 检查重构后的性能影响
- [ ] 优化import路径
- [ ] 减少包大小

### 5. 文档完善

- [ ] 更新各项目的集成文档
- [ ] 创建通用集成指南
- [ ] 添加故障排除指南

## 📊 重构效果

### ✅ 优势

1. **共享复用**: 所有前端项目可以使用同一套EFFM系统
2. **维护简化**: 只需要维护一个EFFM代码库
3. **功能统一**: 确保所有项目使用相同的效率监控标准
4. **扩展性**: 便于添加新的工具集成

### ⚠️ 注意事项

1. **路径依赖**: 各项目需要根据自己的结构调整import路径
2. **配置差异**: 需要处理不同项目的配置需求
3. **类型安全**: 确保所有项目的TypeScript类型正确

## 🔍 验证清单

- [x] ✅ 目录结构迁移完成
- [x] ✅ 核心文件import路径更新
- [x] ✅ API调用方式统一
- [x] ✅ 文档路径信息更新
- [x] ✅ Vite和TypeScript别名配置
- [ ] ⚠️ image-tool API兼容性修复
- [ ] ⏳ pc-tool集成验证
- [ ] ⏳ text-tool集成验证
- [ ] ⏳ main项目集成验证

---

**重构完成时间**: 2025年7月14日  
**重构状态**: 基础结构完成，需要各项目验证和调试 