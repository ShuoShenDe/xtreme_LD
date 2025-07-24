# Operation Tabs 组件

## 概述

Operation 组件现在使用竖着的 Tabs 结构，支持数据驱动的方式管理 tab 内容。

## 文件结构

```
Operation/
├── index.vue          # 主组件，包含 Tabs 结构
├── config.ts          # Tab 配置文件
├── types.ts           # 类型定义
├── OperationTab.vue   # 操作 tab 内容（原有内容）
├── QualityCheckTab.vue    # 质量检查 tab（占位）
├── QcSummaryTab.vue       # QC 总结 tab（占位）
├── ObjectInfoTab.vue      # 对象信息 tab（占位）
└── README.md          # 说明文档
```

## 如何添加新的 Tab

### 1. 创建新的 Tab 组件

在 `Operation/` 目录下创建新的 Vue 组件，例如 `NewFeatureTab.vue`：

```vue
<template>
  <div class="new-feature-tab">
    <!-- 你的内容 -->
  </div>
</template>

<script setup lang="ts">
// 你的逻辑
</script>

<style lang="less" scoped>
.new-feature-tab {
  height: 100%;
  // 你的样式
}
</style>
```

### 2. 更新配置文件

在 `config.ts` 中添加新的 tab 配置：

```typescript
import { NewFeatureOutlined } from '@ant-design/icons-vue';

export const tabConfig: TabItem[] = [
  // ... 现有配置
  {
    key: 'new-feature',
    icon: NewFeatureOutlined,
    component: defineAsyncComponent(() => import('./NewFeatureTab.vue')),
    title: '新功能'
  }
];
```

### 3. 可选：设置默认激活的 tab

如果需要将新 tab 设为默认激活，更新 `defaultActiveKey`：

```typescript
export const defaultActiveKey = 'new-feature';
```

## Tab 配置选项

每个 tab 支持以下配置：

- `key`: 唯一标识符
- `icon`: 图标组件（来自 @ant-design/icons-vue）
- `component`: 对应的内容组件
- `title`: 显示标题（可选）
- `disabled`: 是否禁用（可选）

## 样式定制

可以通过修改 `index.vue` 中的样式来自定义外观：

- `.tabs-sidebar`: 侧边栏样式
- `.tab-item`: 单个 tab 项样式
- `.tab-icon`: 图标样式
- `.tabs-content`: 内容区域样式

## 注意事项

1. 所有 tab 组件都应该设置 `height: 100%` 以确保正确显示
2. 使用 `defineAsyncComponent` 进行懒加载以提高性能
3. 图标来自 `@ant-design/icons-vue`，确保已正确安装
4. 支持禁用状态，可以通过设置 `disabled: true` 来禁用某个 tab 