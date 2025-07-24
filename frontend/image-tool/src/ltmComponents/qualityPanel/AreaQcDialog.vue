<template>
  <a-modal
    v-model:visible="internalVisible"
    :title="$t('areaQcDialog.title')"
    :width="500"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="area-qc-dialog">
      <!-- 动态渲染组件 -->
      <div v-for="component in areaComponents" :key="component.type" class="component-section">
        <!-- 拒绝原因多选框 -->
        <template v-if="component.type === 'rejectReason'">
          <div class="section-title">{{ $t('areaQcDialog.rejectReason') }}</div>
          <a-select
            v-model:value="comment.attributes.params![component.valueName]"
            mode="multiple"
            :placeholder="$t('areaQcDialog.selectReason')"
            class="reject-select"
            :options="component.options?.map((option: any) => ({
              label: option.label,
              value: option.value,
              title: option.description
            }))"
          />
        </template>

        <!-- 帧范围选择 -->
        <template v-if="component.type === 'frameRange'">
          <div class="section-title">{{ $t('areaQcDialog.frameRange') }}</div>
          <a-radio-group 
            v-model:value="comment.attributes.params![component.valueName].type"
            class="frame-range-group"
          >
            <a-radio value="current">{{ $t('areaQcDialog.currentFrame') }}</a-radio>
            <a-radio value="last">{{ $t('areaQcDialog.toLastFrame') }}</a-radio>
            <a-radio value="custom">{{ $t('areaQcDialog.customRange') }}</a-radio>
          </a-radio-group>
          <div 
            v-if="comment.attributes.params![component.valueName].type === 'custom'"
            class="custom-range"
          >
            <a-input-number
              v-model:value="comment.attributes.params![component.valueName].start"
              :min="1"
              :max="maxFrameNum"
              :placeholder="$t('areaQcDialog.startFrame')"
              class="frame-input"
            />
            <span class="range-separator">-</span>
            <a-input-number
              v-model:value="comment.attributes.params![component.valueName].end"
              :min="comment.attributes.params![component.valueName].start || 1"
              :max="maxFrameNum"
              :placeholder="$t('areaQcDialog.endFrame')"
              class="frame-input"
            />
          </div>
        </template>

        <!-- 评论文本框 -->
        <template v-if="component.type === 'comment'">
          <div class="section-title">{{ $t('areaQcDialog.comment') }}</div>
          <a-textarea
            v-model:value="comment.attributes.content"
            :rows="4"
            :placeholder="$t('areaQcDialog.commentPlaceholder')"
            class="comment-textarea"
          />
        </template>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <a-button @click="handleCancel">
          {{ $t('areaQcDialog.actions.cancel') }}
        </a-button>
        <a-button
          type="primary"
          :loading="isSubmitting"
          :disabled="!isValid || isSubmitting"
          @click="handleSubmit"
        >
          {{ $t('areaQcDialog.actions.submit') }}
        </a-button>
      </div>
    </template>
  </a-modal>
</template>

<script lang="ts" setup>
import { computed, watch, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CommentData } from '@/ltmApi/types/comment'
import { useAreaComment } from '@/ltmComponents/qualityPanel/useAreaComment'

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
const { createDefaultAreaComment, validateComment, areaComponents, maxFrameNum } = useAreaComment()

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
const comment = ref<CommentData>(createDefaultAreaComment())

// 监听 props.comment 变化
watch(
  () => props.comment,
  (newComment) => {
    if (newComment) {
      comment.value = { ...newComment }
    } else {
      comment.value = createDefaultAreaComment()
    }
  },
  { immediate: true }
)

// 监听 modelValue 变化，当对话框打开时重置评论
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen && !props.comment) {
      comment.value = createDefaultAreaComment()
    }
  }
)

// 验证评论是否有效
const isValid = computed(() => {
  return validateComment(comment.value)
})

// 处理取消
const handleCancel = () => {
  // 如果有气泡配置，删除对应的临时气泡
  const bubbleConfig = comment.value.attributes.params?.bubbleConfig;
  if (bubbleConfig) {
    // 获取气泡管理器实例
    import('./CommentBubbleManager').then(({ default: CommentBubbleManager }) => {
      const bubbleManager = CommentBubbleManager.getInstance();
      
      if (bubbleManager && bubbleManager.isReady()) {
        // 查找并删除没有 commentId 的临时气泡
        const allBubblesWithIds = bubbleManager.getAllBubblesWithIds();
        allBubblesWithIds.forEach(({ bubbleId, bubble }) => {
          if (!bubble.userData?.commentId) {
            // 这是临时创建的气泡，删除它
            bubbleManager.deleteBubble(bubbleId);
          }
        });
      }
    }).catch(error => {
      console.error('导入 CommentBubbleManager 失败:', error);
    });
  }
  
  internalVisible.value = false
  emit('update:modelValue', false)
}

// 处理提交
const handleSubmit = async () => {
  if (!isValid.value) {
    return
  }

  try {
    // 根据帧范围类型设置frames
    const frameRange = comment.value.attributes.params?.frameRange
    if (frameRange) {
      let selectedFrames: number[] = []
      const editor = (window as any).editor

      if (frameRange.type === 'current') {
        // 当前帧
        const currentFrame = editor.getCurrentFrame()
        const frameIdx = editor.getFrameIndex(currentFrame.id)
        selectedFrames = [frameIdx]
      } else if (frameRange.type === 'last') {
        // 从当前帧到最后
        const currentFrame = editor.getCurrentFrame()
        const frameIdx = editor.getFrameIndex(currentFrame.id)
        selectedFrames = Array.from(
          { length: maxFrameNum.value - frameIdx },
          (_, i) => frameIdx + i
        )
      } else if (frameRange.type === 'custom') {
        // 自定义范围，注意索引从0开始，组件展示从1开始
        const { start, end } = frameRange
        if (typeof start === 'number' && typeof end === 'number') {
          selectedFrames = Array.from(
            { length: end - start + 1 },
            (_, i) => start + i - 1 // 转换为0开始的索引
          )
        }
      }

      // 将计算后的帧范围存入评论数据
      comment.value.attributes.frames = selectedFrames
    }

    emit('submit', comment.value)
    internalVisible.value = false
    emit('update:modelValue', false)
  } catch (error) {
    console.error('提交评论失败:', error)
  }
}
</script>

<style lang="less" scoped>
.area-qc-dialog {
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

  .frame-range-group {
    width: 100%;
    margin-bottom: 8px;
  }

  .custom-range {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }

  .frame-input {
    width: 120px;
  }

  .range-separator {
    color: #d4d4d4;
    font-size: 14px;
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

:deep(.ant-radio-group) {
  .ant-radio-wrapper {
    color: #d4d4d4;

    .ant-radio {
      .ant-radio-inner {
        background-color: #1d1d1d;
        border-color: #2d2d2d;

        &:hover {
          border-color: #0066cc;
        }
      }

      &.ant-radio-checked .ant-radio-inner {
        border-color: #0066cc;
        background-color: #0066cc;
      }
    }
  }
}

:deep(.ant-input-number) {
  background-color: #1d1d1d;
  border-color: #2d2d2d;
  color: #d4d4d4;

  .ant-input-number-input {
    background-color: #1d1d1d;
    color: #d4d4d4;

    &::placeholder {
      color: #808080;
    }
  }

  &:hover {
    border-color: #0066cc;
  }

  &:focus {
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
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
}
</style>
