<!-- ObjectCommentTree.vue -->
<template>
  <CommentTree 
    :comments="formattedComments" 
    :highlight-comment-ids="highlightCommentIds"
    @reply="handleReply" 
    @delete="handleDelete" 
    @comment-click="handleCommentClick"
    @change-status="handleChangeStatus" 
  />
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { message } from 'ant-design-vue';
import CommentTree from './CommentTree.vue';
import { useAreaComment } from '@/ltmComponents/qualityPanel/useAreaComment';
import useObjectCommentManager from '@/ltmComponents/qualityPanel/useObjectComment';
import type { CommentData } from './types';
import { useCommentStore } from '@/stores/comment';

const { t } = useI18n();

// 获取评论相关的方法
const { 
  areaComments, 
  handleReply: replyAreaComment, 
  handleDelete: deleteAreaComment, 
  handleChangeStatus: changeAreaStatus 
} = useAreaComment();

// 获取气泡管理相关方法（只调用一次）
const objectCommentManager = useObjectCommentManager();
const {
  objectComments,
  handleReply: replyObjectComment, 
  handleDelete: deleteObjectComment, 
  handleChangeStatus: changeObjectStatus,
  highlightBubbleByCommentId,
  unhighlightBubbleByCommentId
} = objectCommentManager;

// 获取评论 store
const commentStore = useCommentStore();

// 高亮的评论ID
const highlightCommentIds = computed(() => commentStore.highlightCommentIds);

// 合并 area 和 object 评论
const formattedComments = computed(() => {
  const areaCommentsData = areaComments.value;
  const objectCommentsData = objectComments.value;
  
  // 合并评论并设置父评论创建者信息
  const allComments = [...areaCommentsData, ...objectCommentsData];
  
  // 为每个评论设置父评论创建者信息
  return allComments.map(comment => {
    if (comment.parrentId) {
      const parentComment = allComments.find(c => c.id === comment.parrentId);
      if (parentComment) {
        comment.parrentCreator = parentComment.creator;
      }
    }
    return comment;
  });
});

// 处理评论点击
const handleCommentClick = async (commentId: string) => {
  // 如果之前已经高亮了则取消高亮
  if (commentStore.highlightCommentIds.includes(commentId)) {
    commentStore.removeHighlightCommentId(commentId);
    // 取消气泡高亮
    unhighlightBubbleByCommentId(commentId);
  } else {
    // 清除所有之前高亮的气泡
    commentStore.highlightCommentIds.forEach(id => {
      unhighlightBubbleByCommentId(id);
    });
    
    commentStore.setHighlightCommentIds([commentId]);
    // 高亮气泡
    highlightBubbleByCommentId(commentId);
  }
};

// 处理评论删除
const handleDelete = async (commentId: string) => {
  try {
    // 判断评论类型并调用相应的删除方法
    const areaComment = areaComments.value.find(c => c.id === commentId);
    const objectComment = objectComments.value.find(c => c.id === commentId);
    
    if (areaComment) {
      await deleteAreaComment(commentId);
    } else if (objectComment) {
      await deleteObjectComment(commentId);
    } else {
      throw new Error('Comment not found');
    }
    
    // 从高亮列表中移除（会自动取消气泡高亮）
    commentStore.removeHighlightCommentId(commentId);
    
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
    // 判断评论类型并调用相应的回复方法
    const areaComment = areaComments.value.find(c => c.id === payload.id);
    const objectComment = objectComments.value.find(c => c.id === payload.id);
    
    if (areaComment) {
      await replyAreaComment(payload);
    } else if (objectComment) {
      await replyObjectComment(payload);
    } else {
      throw new Error('Comment not found');
    }
    
    message.success(t('commentTree.comments.replySuccess'));
  } catch (error) {
    message.error(t('commentTree.comments.replyFailed'));
    console.error('回复评论失败:', error);
  }
};

// 处理评论状态变更
const handleChangeStatus = async (payload: { id: string; status: string }) => {
  try {
    // 判断评论类型并调用相应的状态变更方法
    const areaComment = areaComments.value.find(c => c.id === payload.id);
    const objectComment = objectComments.value.find(c => c.id === payload.id);
    
    if (areaComment) {
      await changeAreaStatus(payload);
    } else if (objectComment) {
      await changeObjectStatus(payload);
    } else {
      throw new Error('Comment not found');
    }
    
    message.success(t('commentTree.comments.statusUpdateSuccess'));
  } catch (error) {
    message.error(t('commentTree.comments.statusUpdateFailed'));
    console.error('更新评论状态失败:', error);
  }
};

// 组件挂载时初始化
onMounted(() => {
  console.log('ObjectCommentTree 组件已挂载');
});

// 组件卸载时清理
onBeforeUnmount(() => {
  console.log('ObjectCommentTree 组件即将卸载');
});
</script>

<style scoped>
/* 样式继承自 CommentTree 组件 */
</style>
