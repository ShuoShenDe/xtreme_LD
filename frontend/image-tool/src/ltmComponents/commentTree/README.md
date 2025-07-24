# CommentTree 评论树组件

这是一个基于 `ant-design-vue` 和 `@ant-design/icons-vue` 的评论树组件，支持多级回复、标签显示、高亮等功能。

## 组件结构

```
commentTree/
├── CommentTree.vue      # 评论树主组件
├── Comment.vue          # 单个评论组件
├── TaskCommentTree.vue  # 任务评论树组件
├── types.ts             # 类型定义
├── index.ts             # 导出文件
└── README.md            # 使用说明
```

## 使用方法

### 1. 基础评论树组件

```vue
<template>
  <CommentTree
    :comments="comments"
    :highlight-comment-ids="highlightIds"
    @reply="handleReply"
    @delete="handleDelete"
    @comment-click="handleCommentClick"
    @change-status="handleStatusChange"
  />
</template>

<script setup lang="ts">
import { CommentTree } from '@/ltmComponents/commentTree';
import type { CommentData } from '@/ltmComponents/commentTree';

// 评论数据
const comments: CommentData[] = [
  {
    id: '1',
    commentVersion: '1.0',
    creator: '张三',
    created: '2024-01-01T10:00:00Z',
    parrentId: '',
    parrentCreator: '',
    content: '这是一条评论',
    labels: [
      {
        id: 'label1',
        content: '重要',
        textColor: '#f56c6c',
        backgroundColor: '#fef0f0'
      }
    ]
  }
];

// 高亮的评论ID
const highlightIds = ref<string[]>([]);

// 事件处理
const handleReply = (payload: { id: string; content: string }) => {
  console.log('回复评论:', payload);
};

const handleDelete = (commentId: string) => {
  console.log('删除评论:', commentId);
};

const handleCommentClick = (commentId: string) => {
  console.log('点击评论:', commentId);
};

const handleStatusChange = (payload: { id: string; status: string }) => {
  console.log('状态变更:', payload);
};
</script>
```

### 2. 任务评论树组件

```vue
<template>
  <TaskCommentTree />
</template>

<script setup lang="ts">
import { TaskCommentTree } from '@/ltmComponents/commentTree';
</script>
```

`TaskCommentTree` 组件是一个预配置的任务评论组件，包含：
- 模拟的任务评论数据
- 完整的评论功能（回复、删除、状态变更）
- 自动的消息提示
- 高亮功能

### 3. 在 QualityPanel 中使用

```vue
<template>
  <div class="quality-panel">
    <CollapsePanel @add="handleAddComment('task')">
      <template #title>
        <div class="collapse-header">
          <span>{{ $t('qualityPanel.groups.task') }}</span>
          <span class="comment-count">({{ taskCommentCount }})</span>
        </div>
      </template>
      <div class="collapse-content">
        <TaskCommentTree />
      </div>
    </CollapsePanel>
  </div>
</template>

<script setup lang="ts">
import { TaskCommentTree } from '@/ltmComponents/commentTree';
import CollapsePanel from '@/ltmComponents/CollapsePanel.vue';
</script>
```

### 2. 类型定义

```typescript
interface CommentData {
  id: string;                    // 评论ID
  commentVersion: string;        // 评论版本
  creator: string;               // 创建者
  created: string;               // 创建时间
  parrentId: string;             // 父评论ID（空字符串表示根评论）
  parrentCreator: string;        // 父评论创建者
  content: string;               // 评论内容
  labels: Label[];               // 标签列表
  replyLevel?: number;           // 回复层级（自动计算）
}

interface Label {
  id: string;                    // 标签ID
  content: string;               // 标签内容
  textColor: string;             // 文字颜色
  backgroundColor: string;       // 背景颜色
}
```

## Props

### CommentTree 组件

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| comments | CommentData[] | 是 | [] | 评论数据数组 |
| highlightCommentIds | string[] | 否 | [] | 需要高亮显示的评论ID数组 |

### Comment 组件

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| comment | CommentData | 是 | - | 评论数据 |
| isHighlight | boolean | 否 | false | 是否高亮显示 |

## Events

### CommentTree 组件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| reply | { id: string; content: string } | 回复评论时触发 |
| delete | commentId: string | 删除评论时触发 |
| comment-click | commentId: string | 点击评论时触发 |
| change-status | { id: string; status: string } | 变更评论状态时触发 |

### Comment 组件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| reply | { id: string; content: string } | 回复评论时触发 |
| delete | commentId: string | 删除评论时触发 |
| click | (commentId: string, event: Event) | 点击评论时触发 |
| changeStatus | { id: string; status: string } | 变更评论状态时触发 |

## 国际化支持

组件支持国际化，翻译键名如下：

### 英文翻译 (en/commentTree.ts)
```typescript
export default {
  comments: {
    empty: 'No comments yet',
    replyTo: 'Reply to {creator}',
    replyPlaceholder: 'Write your reply...'
  },
  actions: {
    reply: 'Reply',
    delete: 'Delete',
    close: 'Close',
    publish: 'Publish',
    cancel: 'Cancel'
  }
}
```

### 中文翻译 (zh-CN/commentTree.ts)
```typescript
export default {
  comments: {
    empty: '暂无评论',
    replyTo: '回复 {creator}',
    replyPlaceholder: '写下你的回复...'
  },
  actions: {
    reply: '回复',
    delete: '删除',
    close: '关闭',
    publish: '发布',
    cancel: '取消'
  }
}
```

## 功能特性

1. **多级回复**: 支持无限层级的评论回复
2. **标签显示**: 支持自定义颜色的标签
3. **高亮显示**: 支持指定评论高亮显示
4. **时间排序**: 按创建时间自动排序
5. **响应式设计**: 适配不同屏幕尺寸
6. **暗色主题**: 默认使用暗色主题样式
7. **国际化支持**: 支持中英文切换

## 样式定制

组件使用 scoped 样式，可以通过以下方式定制：

```vue
<style scoped>
/* 自定义评论样式 */
.comment {
  background: #your-color;
  border-radius: 8px;
}

/* 自定义高亮样式 */
.comment.is-highlight {
  background: #your-highlight-color;
}
</style>
```

## 注意事项

1. 确保项目中已安装 `ant-design-vue` 和 `@ant-design/icons-vue`
2. 评论数据中的 `parrentId` 用于构建树形结构，根评论的 `parrentId` 应为空字符串
3. 组件会自动计算 `replyLevel`，无需手动设置
4. 时间格式建议使用 ISO 8601 格式
5. 翻译文件会自动被 i18n 系统加载，无需手动导入 