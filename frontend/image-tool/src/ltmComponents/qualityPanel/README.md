# 质检面板组件

## TaskQcDialog 组件

新版的 `TaskQcDialog.vue` 组件已经实现，用于处理任务级别的质检评论。

### 功能特性

1. **动态组件渲染**: 根据 `projectMetaStore.curQcSettings.taskComponents` 配置动态渲染组件
2. **支持组件类型**:
   - `rejectReason`: 拒绝原因多选框
   - `comment`: 评论文本框
3. **表单验证**: 至少需要填写拒绝原因或评论内容
4. **深色主题**: 适配项目的深色主题样式
5. **国际化支持**: 支持中英文切换

### 使用方法

```vue
<template>
  <TaskQcDialog
    v-model="showDialog"
    :comment="comment"
    :is-submitting="isSubmitting"
    @submit="handleSubmit"
    @cancel="handleCancel"
  />
</template>
```

### Props

- `modelValue`: 控制对话框显示/隐藏
- `comment`: 评论数据，为 null 时表示新增评论
- `isSubmitting`: 提交状态，用于显示加载状态

### Events

- `update:modelValue`: 对话框显示状态变化
- `submit`: 提交评论
- `cancel`: 取消操作

### 相关文件

- `TaskQcDialog.vue`: 主组件
- `useTaskComment.ts`: 逻辑 composable
- `taskQcDialog.ts`: i18n 翻译文件

## FrameQcDialog 组件

新版的 `FrameQcDialog.vue` 组件已经实现，用于处理帧级别的质检评论。

### 功能特性

1. **动态组件渲染**: 根据 `projectMetaStore.curQcSettings.frameComponents` 配置动态渲染组件
2. **支持组件类型**:
   - `rejectReason`: 拒绝原因多选框
   - `frameRange`: 帧范围选择组件
   - `comment`: 评论文本框
3. **帧范围选择**: 支持当前帧、到最后帧、自定义范围三种模式
4. **表单验证**: 至少需要填写拒绝原因或评论内容
5. **深色主题**: 适配项目的深色主题样式
6. **国际化支持**: 支持中英文切换

### 帧范围选择功能

- **当前帧**: 只选择当前帧
- **到最后帧**: 从当前帧到最后一帧
- **自定义范围**: 手动选择起始帧和结束帧
- **索引转换**: 自动处理组件展示（从1开始）和数据库存储（从0开始）的索引差异

### 使用方法

```vue
<template>
  <FrameQcDialog
    v-model="showDialog"
    :comment="comment"
    :is-submitting="isSubmitting"
    @submit="handleSubmit"
    @cancel="handleCancel"
  />
</template>
```

### Props

- `modelValue`: 控制对话框显示/隐藏
- `comment`: 评论数据，为 null 时表示新增评论
- `isSubmitting`: 提交状态，用于显示加载状态

### Events

- `update:modelValue`: 对话框显示状态变化
- `submit`: 提交评论
- `cancel`: 取消操作

### 相关文件

- `FrameQcDialog.vue`: 主组件
- `useFrameComment.ts`: 逻辑 composable
- `frameQcDialog.ts`: i18n 翻译文件

## 与旧版的区别

1. **更清晰的代码结构**: 使用 Vue3 Composition API
2. **更好的类型支持**: 完整的 TypeScript 类型定义
3. **更简洁的实现**: 使用 composable 分离逻辑
4. **更现代的 UI**: 使用 ant-design-vue 组件
5. **更好的可维护性**: 模块化的文件结构
6. **更完善的功能**: 支持帧范围选择等新功能

## 类型定义更新

- 更新了 `FrameRange` 类型，支持 `'last'` 类型
- 完善了 `CommentParams` 和相关类型定义

## 国际化支持

- 新增了 `frameQcDialog.ts` 翻译文件
- 支持中英文切换
- 使用 `import.meta.glob` 自动加载翻译文件 