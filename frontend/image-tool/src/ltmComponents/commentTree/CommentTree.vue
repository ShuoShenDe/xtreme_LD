<!-- CommentTree.vue -->
<template>
  <div class="comment-tree">
    <!-- 评论列表 -->
    <div v-if="sortedComments.length" class="comments-list">
      <Comment
        v-for="comment in sortedComments"
        :key="comment.id"
        :comment="comment"
        :is-highlight="isCommentHighlighted(comment.id)"
        @reply="handleReply"
        @delete="handleDelete"
        @click="handleClick"
        @change-status="handleChangeStatus"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      {{ t('commentTree.comments.empty') }}
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'CommentTree',
};
</script>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Comment from './Comment.vue';
import type { CommentData } from './types';

const { t } = useI18n();

// Props 定义
const props = defineProps<{
  comments: CommentData[];
  highlightCommentIds: string[];
}>();

// Emits 定义
const emit = defineEmits<{
  (e: 'reply', payload: { id: string; content: string }): void;
  (e: 'delete', id: string): void;
  (e: 'comment-click', id: string): void;
  (e: 'change-status', payload: { id: string; status: string }): void;
}>();

// 计算评论的回复层级
const calculateReplyLevel = (comment: CommentData, commentMap: Map<string, CommentData & { children?: CommentData[] }>) => {
  let level = 0;
  let currentComment = comment;
  while (currentComment.parrentId) {
    level++;
    const parentComment = commentMap.get(currentComment.parrentId);
    if (!parentComment) break;
    currentComment = parentComment;
  }
  return level;
};

// 将树形结构展平为一维数组
const flattenTree = (comments: (CommentData & { children?: CommentData[] })[], commentMap: Map<string, CommentData & { children?: CommentData[] }>) => {
  const flattened: CommentData[] = [];
  comments.forEach(comment => {
    const { children, ...commentWithoutChildren } = comment;
    // 计算回复层级
    const replyLevel = calculateReplyLevel(comment, commentMap);
    flattened.push({
      ...commentWithoutChildren,
      replyLevel
    });
    if (children && children.length > 0) {
      // 为子评论设置父评论的创建者信息
      const childrenWithParentInfo = children.map(child => ({
        ...child,
        parrentCreator: comment.creator
      }));
      flattened.push(...flattenTree(childrenWithParentInfo, commentMap));
    }
  });
  return flattened;
};

// 计算属性：排序后的评论列表
const sortedComments = computed(() => {
  // 创建评论 Map 用于快速查找
  const commentMap = new Map<string, CommentData & { children?: CommentData[] }>();
  const rootComments: (CommentData & { children?: CommentData[] })[] = [];

  // 将评论转换为树节点格式
  props.comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, children: [] });
  });

  // 构建树形结构
  props.comments.forEach(comment => {
    const node = commentMap.get(comment.id)!;
    if (comment.parrentId) {
      // 有父评论，添加到父评论的 children 中
      const parentNode = commentMap.get(comment.parrentId);
      if (parentNode) {
        parentNode.children?.push(node);
      }
    } else {
      // 根评论
      rootComments.push(node);
    }
  });

  // 递归排序函数
  const sortCommentsByTime = (comments: (CommentData & { children?: CommentData[] })[]) => {
    // 按创建时间排序
    comments.sort((a, b) => 
      new Date(a.created).getTime() - new Date(b.created).getTime()
    );

    // 递归排序子评论
    comments.forEach(comment => {
      if (comment.children && comment.children.length > 0) {
        sortCommentsByTime(comment.children);
      }
    });

    return comments;
  };

  // 对根评论及其子评论进行排序
  const sortedRootComments = sortCommentsByTime(rootComments);

  // 将树形结构展平为一维数组，同时计算回复层级
  return flattenTree(sortedRootComments, commentMap);
});

// 方法
const isCommentHighlighted = (commentId: string): boolean => {
  return props.highlightCommentIds.includes(commentId);
};

const handleReply = (payload: { id: string; content: string }) => {
  emit('reply', payload);
};

const handleDelete = (commentId: string) => {
  emit('delete', commentId);
};

const handleClick = (commentId: string) => {
  emit('comment-click', commentId);
};

const handleChangeStatus = (payload: { id: string; status: string }) => {
  emit('change-status', payload);
};
</script>

<style scoped>
.comment-tree {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.comments-list {
  padding: 12px;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: #888;
  font-size: 14px;
}

/* 自定义滚动条样式 */
.comment-tree::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.comment-tree::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.comment-tree::-webkit-scrollbar-thumb {
  background: #3d3d3d;
  border-radius: 4px;
}

.comment-tree::-webkit-scrollbar-thumb:hover {
  background: #4d4d4d;
}
</style>
