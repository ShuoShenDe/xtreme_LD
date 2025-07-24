# 对象信息面板 (ObjectInfoPanel)

这个组件用于展示当前选择对象的属性信息，支持两种视图模式：JSON 模式和组件模式。

## 功能特性

- **双视图模式**: 支持 JSON 模式和组件模式切换
- **动态配置**: 根据 `projectMetaStore.curLabelSettings` 配置动态展示属性
- **属性编辑器**: 支持多种属性类型的编辑器（String、Number、Boolean、StringMapping）
- **高亮支持**: 支持属性高亮显示，用于质检时标记错误的属性
- **响应式设计**: 适配深色主题，支持滚动和自适应布局

## 文件结构

```
src/ltmComponents/objectInfoPanel/
├── ObjectInfoPanel.vue          # 主面板组件
├── useObjectInfoPanel.ts        # 面板逻辑 composable
├── types.ts                     # 类型定义
├── utils.ts                     # 工具函数
├── index.ts                     # 导出文件
├── components/
│   └── ObjectProperties.vue     # 属性展示组件
└── editors/
    ├── PropertyEditor.vue       # 属性编辑器分发器
    ├── StringEditor.vue         # 字符串编辑器
    ├── NumberEditor.vue         # 数字编辑器
    ├── BooleanEditor.vue        # 布尔值编辑器
    └── StringMappingEditor.vue  # 字符串映射编辑器
```

## 使用方法

```vue
<template>
  <ObjectInfoPanel />
</template>

<script setup lang="ts">
import { ObjectInfoPanel } from '@/ltmComponents/objectInfoPanel';
</script>
```

## 配置说明

组件模式需要根据 `projectMetaStore.curLabelSettings` 中的配置来展示对象的属性。配置示例：

```json
{
  "labelSettings": {
    "rect": {
      "commonProps": [
        {
          "label": "track name",
          "propName": "userData.trackName",
          "propType": "String",
          "propTypeSettings": {}
        }
      ],
      "objectProps": [
        {
          "label": "坐标x:",
          "propName": "attrs.x",
          "propType": "Number",
          "propTypeSettings": {
            "precision": 4
          }
        }
      ]
    }
  }
}
```

## 支持的属性类型

- **String**: 字符串输入框
- **Number**: 数字输入框，支持精度设置
- **Boolean**: 开关组件
- **StringMapping**: 下拉选择框，支持映射配置

## 事件处理

组件会监听编辑器的选择事件，自动更新显示的对象信息。当用户修改属性时，会触发 `change` 事件，包含以下信息：

```typescript
interface PropertyChangeEvent {
  selectedObject: any;
  propSetting: ObjectInfoItem;
  oldValue: any;
  newValue: any;
}
```

## 样式定制

组件使用深色主题，支持自定义高亮颜色。可以通过 `highlightColor` 属性为特定属性设置背景色，用于质检时标记错误的属性。 