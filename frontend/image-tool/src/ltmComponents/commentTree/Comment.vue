<template>
  <div 
    class="comment" 
    :class="{ 'is-highlight': isHighlight, 'is-reply': comment.parrentId }"
    @click.stop="$emit('click', comment.id, $event)"
  >
    <div class="comment-header">
      <div class="header-left">
        <span class="comment-version">v{{ comment.commentVersion }}</span>
        <span class="comment-author">{{ comment.creator }}</span>
        <span class="comment-time">{{ formatDate(comment.created) }}</span>
      </div>
      <div class="header-actions">
        <template v-if="comment.labels?.length">
          <a-tooltip :title="t('commentTree.actions.close')" placement="top">
            <a-button 
              type="text" 
              size="small" 
              class="custom-action-btn" 
              @click.stop="handleStatusChange"
            >
              <template #icon>
                <CheckCircleOutlined />
              </template>
            </a-button>
          </a-tooltip>
        </template>
        <a-tooltip :title="t('commentTree.actions.reply')" placement="top">
          <a-button 
            type="text" 
            size="small" 
            class="custom-action-btn" 
            @click.stop="handleReplyClick"
          >
            <template #icon>
              <MessageOutlined />
            </template>
          </a-button>
        </a-tooltip>
        <a-tooltip :title="t('commentTree.actions.delete')" placement="top">
          <a-button 
            type="text" 
            size="small" 
            class="custom-action-btn" 
            @click.stop="$emit('delete', comment.id)"
          >
            <template #icon>
              <DeleteOutlined />
            </template>
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <div class="comment-content">
      <!-- 回复信息 - 只在二级及以上回复时显示 -->
      <div v-if="comment.parrentCreator && comment.replyLevel && comment.replyLevel > 1" class="reply-info">
        {{ t('commentTree.comments.replyTo', { creator: comment.parrentCreator }) }}
      </div>

      <!-- 标签列表 -->
      <div v-if="comment.labels?.length" class="labels">
        <a-tag
          v-for="label in comment.labels"
          :key="label.id"
          :style="{
            color: label.textColor,
            backgroundColor: label.backgroundColor,
            borderColor: label.textColor
          }"
          size="small"
          class="label-tag"
        >
          {{ label.content }}
        </a-tag>
      </div>

      <!-- 评论内容 -->
      <div class="comment-text">{{ comment.content }}</div>

      <!-- 回复输入框 -->
      <div v-if="showReplyInput" class="reply-input-container" @click.stop>
        <a-textarea
          v-model:value="replyContent"
          :rows="3"
          :placeholder="t('commentTree.comments.replyPlaceholder')"
          @blur="handleReplyBlur"
          ref="replyInputRef"
        />
        <div class="reply-actions">
          <a-button
            type="primary"
            size="small"
            :disabled="!replyContent.trim()"
            @click="handleReplySubmit"
          >
            {{ t('commentTree.actions.publish') }}
          </a-button>
          <a-button
            size="small"
            @click="cancelReply"
          >
            {{ t('commentTree.actions.cancel') }}
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'Comment',
};
</script>

<script lang="ts" setup>
import { ref, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { 
  Tooltip as ATooltip, 
  Tag as ATag, 
  Input as AInput, 
  Button as AButton 
} from 'ant-design-vue';
import { 
  CheckCircleOutlined, 
  MessageOutlined, 
  DeleteOutlined 
} from '@ant-design/icons-vue';
import type { CommentData } from './types';

const { t } = useI18n();

// Props 定义
const props = defineProps<{
  comment: CommentData;
  isHighlight: boolean;
}>();

// Emits 定义
const emit = defineEmits<{
  (e: 'reply', payload: { id: string; content: string }): void;
  (e: 'delete', id: string): void;
  (e: 'click', id: string, event: Event): void;
  (e: 'changeStatus', payload: { id: string; status: string }): void;
}>();

// 响应式变量
const showReplyInput = ref(false);
const replyContent = ref('');
const replyInputRef = ref<InstanceType<typeof AInput.TextArea> | null>(null);

// 方法
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString();
};

// 回复相关方法
const handleReplyClick = async (event: Event) => {
  event.stopPropagation();
  showReplyInput.value = true;
  await nextTick();
  // 使用 setTimeout 确保 DOM 更新完成后再聚焦
  setTimeout(() => {
    const textareaElement = replyInputRef.value?.$el?.querySelector('textarea');
    if (textareaElement) {
      textareaElement.focus();
    }
  }, 100);
};

const handleReplyBlur = () => {
  // 使用 setTimeout 避免点击发布按钮时输入框已经消失
  setTimeout(() => {
    if (!showReplyInput.value) return;
    cancelReply();
  }, 200);
};

const handleReplySubmit = (event: Event) => {
  event.stopPropagation();
  if (!replyContent.value.trim()) return;
  
  emit('reply', {
    id: props.comment.id,
    content: replyContent.value.trim()
  });
  
  cancelReply();
};

const cancelReply = () => {
  showReplyInput.value = false;
  replyContent.value = '';
};

const handleStatusChange = (event: Event) => {
  event.stopPropagation();
  emit('changeStatus', {
    id: props.comment.id,
    status: 'close'
  });
};
</script>

<style scoped>
.comment {
  background: #363636;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.comment:hover {
  background: #404040;
}

.comment.is-highlight {
  background: #264d73;
}

.comment.is-reply {
  margin-left: 20px;
  border-left: 2px solid #0066cc;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #888;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.comment-version {
  color: #0066cc;
  font-weight: bold;
  flex-shrink: 0;
}

.comment-author {
  flex-shrink: 0;
}

.comment-time {
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  gap: 0;
  flex-shrink: 0;
  margin-left: 8px;
}

.custom-action-btn {
  padding: 4px;
  color: #888;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: 0 1px;
}

.custom-action-btn:hover {
  background: #3d3d3d;
  color: #fff;
}

.comment-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reply-info {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.label-tag {
  font-size: 12px;
  border: 1px solid;
}

.comment-text {
  color: #e0e0e0;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.reply-input-container {
  margin-top: 12px;
  padding: 12px;
  background: #2d2d2d;
  border-radius: 4px;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

:deep(.ant-input) {
  background-color: #363636;
  border-color: #4a4a4a;
  color: #e0e0e0;
}

:deep(.ant-input:focus) {
  border-color: #0066cc;
}

:deep(.ant-input::placeholder) {
  color: #888;
}

:deep(.ant-btn-text) {
  color: #888;
}

:deep(.ant-btn-text:hover) {
  background: #3d3d3d;
  color: #fff;
}
</style>
