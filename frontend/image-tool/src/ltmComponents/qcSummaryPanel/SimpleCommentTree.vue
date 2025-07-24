<template>
  <div class="simple-comment-tree">
    <!-- 评论列表 -->
    <div v-if="comments.length" class="comments-list">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="comment-item"
        @click="handleCommentClick(comment)"
      >
        <div class="comment-header">
          <span class="comment-version">v{{ comment.attributes.version || '1' }}</span>
          <span class="comment-author">{{ comment.attributes.creator }}</span>
          <span class="comment-time">{{ formatDate(comment.attributes.created) }}</span>
        </div>
        <div class="comment-content">
          <div class="comment-text">{{ comment.attributes.content || '无内容' }}</div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      {{ $t('qcSummary.comments.empty') }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import type { CommentData } from '@/ltmApi/types/comment'

const { t } = useI18n()

// Props 定义
const props = defineProps<{
  comments: CommentData[]
}>()

// Emits 定义
const emit = defineEmits<{
  (e: 'comment-click', comment: CommentData): void
}>()

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString()
}

// 处理评论点击
const handleCommentClick = (comment: CommentData) => {
  emit('comment-click', comment)
}
</script>

<style lang="less" scoped>
.simple-comment-tree {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;

  .comments-list {
    padding: 8px 0;

    .comment-item {
      padding: 12px;
      margin-bottom: 8px;
      background: #2a2a2a;
      border-radius: 6px;
      border: 1px solid #333;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #3a3a3a;
        border-color: #1890ff;
      }

      &:last-child {
        margin-bottom: 0;
      }

      .comment-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 12px;

        .comment-version {
          color: #1890ff;
          font-weight: 500;
        }

        .comment-author {
          color: #d4d4d4;
          font-weight: 500;
        }

        .comment-time {
          color: #888;
        }
      }

      .comment-content {
        .comment-text {
          color: #d4d4d4;
          font-size: 14px;
          line-height: 1.5;
          word-break: break-word;
        }
      }
    }
  }

  .empty-state {
    padding: 24px;
    text-align: center;
    color: #888;
    font-size: 14px;
  }
}

/* 自定义滚动条样式 */
.simple-comment-tree::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.simple-comment-tree::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.simple-comment-tree::-webkit-scrollbar-thumb {
  background: #3d3d3d;
  border-radius: 3px;
}

.simple-comment-tree::-webkit-scrollbar-thumb:hover {
  background: #4d4d4d;
}
</style> 