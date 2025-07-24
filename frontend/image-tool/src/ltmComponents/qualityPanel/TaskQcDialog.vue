<template>
  <a-modal
    v-model:visible="internalVisible"
    :title="$t('taskQcDialog.title')"
    :width="500"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="task-qc-dialog">
      <!-- 动态渲染组件 -->
      <div v-for="component in taskComponents" :key="component.type" class="component-section">
        <!-- 拒绝原因多选框 -->
        <template v-if="component.type === 'rejectReason'">
          <div class="section-title">{{ $t('taskQcDialog.rejectReason') }}</div>
          <a-select
            v-model:value="comment.attributes.params![component.valueName]"
            mode="multiple"
            :placeholder="$t('taskQcDialog.selectReason')"
            class="reject-select"
            :options="component.options?.map(option => ({
              label: option.label,
              value: option.value,
              title: option.description
            }))"
          />
        </template>

        <!-- 评论文本框 -->
        <template v-if="component.type === 'comment'">
          <div class="section-title">{{ $t('taskQcDialog.comment') }}</div>
          <a-textarea
            v-model:value="comment.attributes.content"
            :rows="4"
            :placeholder="$t('taskQcDialog.commentPlaceholder')"
            class="comment-textarea"
          />
        </template>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <a-button @click="handleCancel">
          {{ $t('taskQcDialog.actions.cancel') }}
        </a-button>
        <a-button
          type="primary"
          :loading="isSubmitting"
          :disabled="!isValid || isSubmitting"
          @click="handleSubmit"
        >
          {{ $t('taskQcDialog.actions.submit') }}
        </a-button>
      </div>
    </template>
  </a-modal>
</template>

<script lang="ts" setup>
import { computed, watch, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CommentData } from '@/ltmApi/types/comment'
import { useTaskComment } from './useTaskComment'

// Props
interface Props {
  modelValue: boolean
  comment?: CommentData | null
  isSubmitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  comment: null,
  isSubmitting: false
})

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: CommentData): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
const { createDefaultTaskComment, validateComment, taskComponents } = useTaskComment()

// 内部状态管理对话框显示
const internalVisible = ref(false)

// 监听 props.modelValue 变化，同步到内部状态
watch(
  () => props.modelValue,
  (newValue) => {
    internalVisible.value = newValue
  },
  { immediate: true }
)

// 内部评论数据
const comment = ref<CommentData>(createDefaultTaskComment())

// 监听 props.comment 变化
watch(
  () => props.comment,
  (newComment) => {
    if (newComment) {
      comment.value = { ...newComment }
    } else {
      comment.value = createDefaultTaskComment()
    }
  },
  { immediate: true }
)

// 监听 modelValue 变化，当对话框打开时重置评论
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen && !props.comment) {
      comment.value = createDefaultTaskComment()
    }
  }
)

// 验证评论是否有效
const isValid = computed(() => {
  return validateComment(comment.value)
})

// 处理取消
const handleCancel = () => {
  emit('cancel')
  internalVisible.value = false
  emit('update:modelValue', false)
}

// 处理提交
const handleSubmit = async () => {
  if (!isValid.value) {
    return
  }

  try {
    emit('submit', comment.value)
    internalVisible.value = false
    emit('update:modelValue', false)
  } catch (error) {
    console.error('提交评论失败:', error)
  }
}
</script>

<style lang="less" scoped>
.task-qc-dialog {
  .component-section {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .section-title {
    font-size: 14px;
    color: #d4d4d4;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .reject-select {
    width: 100%;
  }

  .comment-textarea {
    width: 100%;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

// 深色主题样式
:deep(.ant-modal) {
  .ant-modal-content {
    background-color: #141414;
    border: 1px solid #1d1d1d;
    border-radius: 4px;
  }

  .ant-modal-header {
    background-color: #181818;
    border-bottom: 1px solid #1d1d1d;
    padding: 12px 16px;

    .ant-modal-title {
      color: #d4d4d4;
      font-size: 14px;
    }
  }

  .ant-modal-close {
    color: #999;

    &:hover {
      color: #d4d4d4;
    }
  }

  .ant-modal-body {
    background-color: #141414;
    color: #d4d4d4;
    padding: 16px;
  }

  .ant-modal-footer {
    background-color: #141414;
    border-top: 1px solid #1d1d1d;
    padding: 12px 16px;
  }
}

:deep(.ant-select) {
  .ant-select-selector {
    background-color: #1d1d1d !important;
    border-color: #2d2d2d !important;
    color: #d4d4d4 !important;

    &:hover {
      border-color: #0066cc !important;
    }

    &.ant-select-focused {
      border-color: #0066cc !important;
      box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2) !important;
    }
  }

  .ant-select-selection-placeholder {
    color: #808080 !important;
  }

  .ant-select-selection-item {
    color: #d4d4d4 !important;
  }
}

:deep(.ant-select-dropdown) {
  background-color: #1d1d1d;
  border: 1px solid #2d2d2d;

  .ant-select-item {
    color: #d4d4d4;

    &:hover {
      background-color: #2d2d2d;
    }

    &.ant-select-item-option-selected {
      background-color: #0066cc;
      color: #ffffff;
    }
  }
}

:deep(.ant-input) {
  background-color: #1d1d1d;
  border-color: #2d2d2d;
  color: #d4d4d4;

  &:hover {
    border-color: #0066cc;
  }

  &:focus {
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
  }

  &::placeholder {
    color: #808080;
  }
}

:deep(.ant-btn) {
  background-color: #1d1d1d;
  border-color: #2d2d2d;
  color: #d4d4d4;

  &:hover {
    background-color: #2d2d2d;
    border-color: #2d2d2d;
    color: #ffffff;
  }

  &.ant-btn-primary {
    background-color: #0066cc;
    border-color: #0066cc;
    color: #ffffff;

    &:hover {
      background-color: #0052a3;
      border-color: #0052a3;
    }

    &:disabled {
      background-color: #141414;
      border-color: #1d1d1d;
      color: #808080;
    }
  }

  &:disabled {
    background-color: #141414;
    border-color: #1d1d1d;
    color: #808080;
  }
}
</style> 