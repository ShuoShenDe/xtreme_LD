<!-- FrameCommentTree.vue -->
<template>
  <CommentTree 
    :comments="frameComments" 
    :highlight-comment-ids="highlightCommentIds"
    @reply="handleReply" 
    @delete="handleDelete" 
    @comment-click="handleCommentClick"
    @change-status="handleChangeStatus" 
  />
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { message } from 'ant-design-vue';
import CommentTree from './CommentTree.vue';
import { useFrameComment } from '@/ltmComponents/qualityPanel/useFrameComment';
import { useCommentStore } from '@/stores/comment';
import useObjectCommentManager from '@/ltmComponents/qualityPanel/useObjectComment';
import type { CommentData } from './types';

const { t } = useI18n();
const { 
  frameComments, 
  handleReply: replyComment, 
  handleDelete: deleteComment, 
  handleChangeStatus: changeStatus 
} = useFrameComment();

// 获取评论 store
const commentStore = useCommentStore();

// 获取气泡管理相关方法
const objectCommentManager = useObjectCommentManager();
const { unhighlightBubbleByCommentId } = objectCommentManager;

// 高亮的评论ID
const highlightCommentIds = computed(() => commentStore.highlightCommentIds);

// 处理评论点击
const handleCommentClick = (commentId: string) => {
  // 如果之前已经高亮了则取消高亮
  if (commentStore.highlightCommentIds.includes(commentId)) {
    commentStore.removeHighlightCommentId(commentId);
  } else {
    // 清除所有之前高亮的气泡
    commentStore.highlightCommentIds.forEach(id => {
      unhighlightBubbleByCommentId(id);
    });
    
    commentStore.setHighlightCommentIds([commentId]);
  }
};

// 处理评论删除
const handleDelete = async (commentId: string) => {
  try {
    await deleteComment(commentId);
    message.success(t('commentTree.comments.deleteSuccess'));
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot delete comment with children') {
      message.warning(t('commentTree.comments.deleteWithChildren'));
    } else {
      message.error(t('commentTree.comments.deleteFailed'));
    }
    console.error('删除评论失败:', error);
  }
};

// 处理评论回复
const handleReply = async (payload: { id: string; content: string }) => {
  try {
    await replyComment(payload);
    message.success(t('commentTree.comments.replySuccess'));
  } catch (error) {
    message.error(t('commentTree.comments.replyFailed'));
    console.error('回复评论失败:', error);
  }
};

// 处理评论状态变更
const handleChangeStatus = async (payload: { id: string; status: string }) => {
  try {
    await changeStatus(payload);
    message.success(t('commentTree.comments.statusUpdateSuccess'));
  } catch (error) {
    message.error(t('commentTree.comments.statusUpdateFailed'));
    console.error('更新评论状态失败:', error);
  }
};
</script>

<style scoped>
/* 样式继承自 CommentTree 组件 */
</style>
