# 质检汇总面板 (QcSummaryPanel)

质检汇总面板是一个用于显示任务质检信息汇总的组件，主要包含操作区和数据展示区两个部分。

## 功能特性

### 操作区
- 只在 `projectMetaStore.phase` 为 `qc` 时显示
- 包含 "通过" 和 "驳回" 两个按钮
- 点击按钮会将任务设置到下一个或上一个阶段
- 支持加载状态显示

### 数据展示区
- 总是显示
- 显示质检版本号和根评论总数
- 按评论状态分组显示评论（未解决、已解决、已修改）
- 点击评论可跳转到评论首次出现的帧

## 文件结构

```
qcSummaryPanel/
├── QcSummaryPanel.vue          # 主面板组件
├── SimpleCommentTree.vue        # 简化评论树组件
├── useQcSummary.ts             # 业务逻辑 composable
├── index.ts                    # 导出文件
└── README.md                   # 使用说明
```

## 使用方法

### 1. 直接使用组件

```vue
<template>
  <QcSummaryPanel />
</template>

<script setup lang="ts">
import { QcSummaryPanel } from '@/ltmComponents/qcSummaryPanel';
</script>
```

### 2. 使用 composable

```vue
<script setup lang="ts">
import { useQcSummary } from '@/ltmComponents/qcSummaryPanel';

const {
  qcVersion,
  totalRootComments,
  rootCommentsByStatus,
  handlePass,
  handleReject,
  jumpToCommentFrame
} = useQcSummary();
</script>
```

## 依赖项

- `@/stores/projectMeta` - 项目元数据 store
- `@/stores/comment` - 评论 store
- `@/ltmApi/task` - 任务 API
- `@/businessNew/components/Header/useFlowIndex` - 帧切换功能
- `ant-design-vue` - UI 组件库
- `@ant-design/icons-vue` - 图标库

## 国际化支持

组件支持中英文国际化，翻译键名如下：

### 中文翻译 (zh-CN/qcSummary.ts)
```typescript
export default {
  title: '质检汇总',
  description: '任务质检信息的汇总面板',
  operation: {
    title: '操作区',
    pass: '通过',
    reject: '驳回',
    // ...
  },
  data: {
    title: '数据展示区',
    version: '质检版本',
    totalComments: '根评论总数',
    statusGroups: {
      open: '未解决',
      close: '已解决',
      fixed: '已修改'
    }
  },
  comments: {
    empty: '暂无评论',
    clickToJump: '点击跳转到评论首次出现帧'
  }
}
```

### 英文翻译 (en/qcSummary.ts)
```typescript
export default {
  title: 'QC Summary',
  description: 'Task quality check summary panel',
  operation: {
    title: 'Operation Area',
    pass: 'Pass',
    reject: 'Reject',
    // ...
  },
  data: {
    title: 'Data Display Area',
    version: 'QC Version',
    totalComments: 'Total Root Comments',
    statusGroups: {
      open: 'Open',
      close: 'Closed',
      fixed: 'Fixed'
    }
  },
  comments: {
    empty: 'No comments yet',
    clickToJump: 'Click to jump to comment first frame'
  }
}
```

## 样式特性

- 使用暗色主题
- 响应式设计
- 自定义滚动条样式
- 悬停效果和过渡动画
- 适配项目整体设计风格

## 注意事项

1. 组件依赖于 `projectMetaStore` 和 `commentStore`，确保在使用前已正确初始化
2. 操作区的显示依赖于当前任务阶段，只有在 `qc` 阶段才会显示
3. 评论跳转功能依赖于 `useFlowIndex` 的帧切换功能
4. 组件会自动处理评论状态分组，默认状态为 "open" 