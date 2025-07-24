<template>
  <div class="quality-panel">
    <CollapsePanel @add="handleAddComment('object')">
      <template #title>
        <div class="collapse-header">
          <span>{{ $t('qualityPanel.groups.object') }}</span>
          <span class="comment-count">({{ objectCommentCount }})</span>
        </div>
      </template>
      <div class="collapse-content">
        <ObjectCommentTree />
      </div>
    </CollapsePanel>

    <!-- 传感器评论暂不支持 -->
    <CollapsePanel @add="handleAddComment('sensor')" v-if="false">
      <template #title>
        <div class="collapse-header">
          <span>{{ $t('qualityPanel.groups.sensor') }}</span>
          <span class="comment-count">({{ sensorCommentCount }})</span>
        </div>
      </template>
      <div class="collapse-content">
        <div class="placeholder-content">
          <CheckCircleOutlined class="placeholder-icon" />
          <p>{{ $t('qualityPanel.placeholder.sensor') }}</p>
        </div>
      </div>
    </CollapsePanel>

    <CollapsePanel @add="handleAddComment('frame')">
      <template #title>
        <div class="collapse-header">
          <span>{{ $t('qualityPanel.groups.frame') }}</span>
          <span class="comment-count">({{ frameCommentCount }})</span>
        </div>
      </template>
      <div class="collapse-content">
        <FrameCommentTree />
      </div>
    </CollapsePanel>

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

    <!-- 任务质检对话框 -->
    <TaskQcDialog
      v-model="showTaskQcDialog"
      :comment="taskComment"
      :is-submitting="isSubmitting"
      @submit="handleCommentSubmit"
      @cancel="handleTaskQcCancel"
    />

    <!-- 帧质检对话框 -->
    <FrameQcDialog
      v-model="showFrameQcDialog"
      :comment="frameComment"
      :is-submitting="isSubmitting"
      @submit="handleCommentSubmit"
      @cancel="handleFrameQcCancel"
    />

    <!-- 区域质检对话框 -->
    <AreaQcDialog
      v-model="showAreaQcDialog"
      :comment="areaComment"
      :is-submitting="isSubmitting"
      @submit="handleAreaCommentSubmit"
      @cancel="handleAreaQcCancel"
    />

    <!-- 物体质检对话框 -->
    <ObjectQcDialog
      v-model="showObjectQcDialog"
      :comment="objectComment"
      :selected-object="selectedObject"
      :is-submitting="isSubmitting"
      @submit="handleObjectCommentSubmit"
      @cancel="handleObjectQcCancel"
    />


  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { CheckCircleOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import CollapsePanel from '../CollapsePanel.vue';
import { TaskCommentTree, FrameCommentTree, ObjectCommentTree } from '../commentTree';
import TaskQcDialog from './TaskQcDialog.vue';
import FrameQcDialog from './FrameQcDialog.vue';
import AreaQcDialog from './AreaQcDialog.vue';
import ObjectQcDialog from './ObjectQcDialog.vue';
import { useCommentStore } from '@/stores/comment';
import { useTaskComment } from './useTaskComment';
import { useFrameComment } from './useFrameComment';
import { useAreaComment } from './useAreaComment';
import { useProjectMetaStore } from '@/stores/projectMeta';
import useObjectComment from './useObjectComment';
import { useQualityPanel } from './useQualityPanel';
import type { CommentData, BubbleConfig } from '@/ltmApi/types/comment';
import hotkeys from 'hotkeys-js';

// 定义质检面板的快捷键作用域
const QUALITY_PANEL_SCOPE = 'quality-panel-scope';

// i18n
const { t } = useI18n();

// Store
const commentStore = useCommentStore();
const { createDefaultTaskComment } = useTaskComment();
const { createDefaultFrameComment } = useFrameComment();
const { createDefaultAreaComment } = useAreaComment();
const projectMetaStore = useProjectMetaStore();
const { handleQualityPanelLeave } = useQualityPanel();

// 物体评论相关
const {
  createBubble,
  createBubbleByCommentId,
  deleteBubble,
  deleteBubbleByCommentId,
  highlightBubble,
  highlightBubbleByCommentId,
  unhighlightBubbleByCommentId,
  createDefaultObjectComment
} = useObjectComment();

// 对话框状态
const showTaskQcDialog = ref(false);
const showFrameQcDialog = ref(false);
const showAreaQcDialog = ref(false);
const showObjectQcDialog = ref(false);
const taskComment = ref<CommentData | null>(null);
const frameComment = ref<CommentData | null>(null);
const areaComment = ref<CommentData | null>(null);
const objectComment = ref<CommentData | null>(null);
const selectedObject = ref<any>(null);
const isSubmitting = ref(false);

// 计算属性 - 从 store 获取实际数据
const objectCommentCount = computed(() => {
  return commentStore.allComments.data.filter(comment => comment.attributes.type === 'object' || comment.attributes.type === 'area').length;
});

const sensorCommentCount = computed(() => {
  return commentStore.allComments.data.filter(comment => comment.attributes.type === 'sensor').length;
});

const frameCommentCount = computed(() => {
  return commentStore.allComments.data.filter(comment => comment.attributes.type === 'frame').length;
});

const taskCommentCount = computed(() => {
  return commentStore.allComments.data.filter(comment => comment.attributes.type === 'task').length;
});

// 处理添加评论
const handleAddComment = (type: 'object' | 'sensor' | 'frame' | 'task') => {
  if (type === 'task') {
    // 创建新的任务评论
    taskComment.value = createDefaultTaskComment();
    showTaskQcDialog.value = true;
  } else if (type === 'frame') {
    // 创建新的帧评论
    frameComment.value = createDefaultFrameComment();
    showFrameQcDialog.value = true;
  } else if (type === 'object') {
    // 检查是否选中了物体
    const editor = (window as any).editor;
    const currentSelection = editor?.selection || [];
    if (!currentSelection || currentSelection.length === 0) {
      // 使用 i18n 翻译
      message.warning(t('qualityPanel.messages.selectObjectFirst'));
      return;
    }

    const object = currentSelection[0];
    
    // 检查物体类型是否支持
    if (object.className !== 'rect' && object.className !== 'polygon' && object.className !== 'polyline') {
      message.warning(t('qualityPanel.messages.unsupportedObjectType', { type: object.className }));
      return;
    }

    // 保存选中的物体
    selectedObject.value = object;

    // 计算气泡位置
    let bubbleConfig: BubbleConfig | undefined;
    if (object.className === 'rect') {
      // 对于矩形，将气泡放到其上方中心位置
      const attrs = object.attrs;
      bubbleConfig = {
        x: attrs.x + attrs.width / 2 - 30, // 气泡宽度60，居中
        y: attrs.y - 50, // 在物体上方50像素
        width: 60,
        height: 40,
        tailWidth: 16,
        tailHeight: 16
      };
    } else if (object.className === 'polygon' || object.className === 'polyline') {
      // 对于多边形或折线，暂时放到第一个点的上方
      const firstPoint = object.attrs.points[0];
      bubbleConfig = {
        x: firstPoint.x,
        y: firstPoint.y - 50,
        width: 60,
        height: 40,
        tailWidth: 16,
        tailHeight: 16
      };
    }

    // 创建新的物体评论
    objectComment.value = createDefaultObjectComment(object, bubbleConfig);
    showObjectQcDialog.value = true;
  } else {
    // 其他类型的评论后续实现
  }
};

// 处理评论提交
const handleCommentSubmit = async (comment: CommentData) => {
  try {
    isSubmitting.value = true;
    
    // 调用 store 的添加评论方法
    await commentStore.addComment(comment);
    
    // 刷新评论列表
    await commentStore.fetchAllComments();
  } catch (error) {
    console.error('添加任务评论失败:', error);
  } finally {
    isSubmitting.value = false;
  }
};

// 处理任务质检取消
const handleTaskQcCancel = () => {
  taskComment.value = null;
  showTaskQcDialog.value = false;
};

// 处理帧质检取消
const handleFrameQcCancel = () => {
  frameComment.value = null;
  showFrameQcDialog.value = false;
};

// 处理区域评论提交
const handleAreaCommentSubmit = async (comment: CommentData) => {
  try {
    isSubmitting.value = true;
    
    // 调用 store 的添加评论方法
    await commentStore.addComment(comment);
    
    // 刷新评论列表
    await commentStore.fetchAllComments();
    
    // 重新渲染气泡
    setTimeout(() => {
      // const { createBubbleByCommentId } = useObjectComment();
      const bubbleConfig = comment.attributes.params?.bubbleConfig;
      if (bubbleConfig) {
        createBubbleByCommentId(comment.id, {
          x: bubbleConfig.x,
          y: bubbleConfig.y,
          width: bubbleConfig.width,
          height: bubbleConfig.height,
          tailWidth: bubbleConfig.tailWidth,
          tailHeight: bubbleConfig.tailHeight,
          commentId: comment.id
        });
      }
    }, 100);
  } catch (error) {
    console.error('添加区域评论失败:', error);
  } finally {
    isSubmitting.value = false;
  }
};

// 处理区域质检取消
const handleAreaQcCancel = () => {
  // 删除临时创建的气泡
  if (areaComment.value?.attributes.params?.bubbleConfig) {
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
  
  areaComment.value = null;
  showAreaQcDialog.value = false;
};

// 处理物体评论提交
const handleObjectCommentSubmit = async (comment: CommentData) => {
  try {
    isSubmitting.value = true;
    
    // 调用 store 的添加评论方法
    await commentStore.addComment(comment);
    
    // 刷新评论列表
    await commentStore.fetchAllComments();
    
    // 重新渲染气泡
    setTimeout(() => {
      const bubbleConfig = comment.attributes.params?.bubbleConfig;
      if (bubbleConfig) {
        createBubbleByCommentId(comment.id, {
          x: bubbleConfig.x,
          y: bubbleConfig.y,
          width: bubbleConfig.width,
          height: bubbleConfig.height,
          tailWidth: bubbleConfig.tailWidth,
          tailHeight: bubbleConfig.tailHeight,
          commentId: comment.id
        });
      }
    }, 100);
  } catch (error) {
    console.error('添加物体评论失败:', error);
  } finally {
    isSubmitting.value = false;
  }
};

// 处理物体质检取消
const handleObjectQcCancel = () => {
  objectComment.value = null;
  selectedObject.value = null;
  showObjectQcDialog.value = false;
};



onMounted(() => {
  // 设置作用域
  hotkeys.setScope(QUALITY_PANEL_SCOPE);
  hotkeys('t', () => {
    handleAddComment('task');
  });
  hotkeys('f', () => {
    handleAddComment('frame');
  });
  hotkeys('s', () => {
    handleAddComment('sensor');
  });
  hotkeys('o', () => {
    handleAddComment('object');
  });
  
  // 监听区域评论创建事件
  const editor = (window as any).editor;
  if (editor) {
    editor.on('AREA_COMMENT_CREATE', (data: { comment: CommentData; bubbleConfig: BubbleConfig }) => {
      areaComment.value = data.comment;
      showAreaQcDialog.value = true;
    });
  }
  

});

onUnmounted(() => {
  // 删除作用域，这样会清理该作用域下的所有快捷键
  hotkeys.deleteScope(QUALITY_PANEL_SCOPE);
  hotkeys.unbind('t');
  hotkeys.unbind('f');
  hotkeys.unbind('s');
  hotkeys.unbind('o');
  
  // 处理质检面板离开事件
  handleQualityPanelLeave();
});
</script>

<style lang="less" scoped>
.quality-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #252525;
  color: #ffffff;
  padding: 16px;
  overflow-y: auto;
}

.collapse-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.comment-count {
  color: #888;
  font-size: 12px;
  font-weight: normal;
}

.collapse-content {
  padding: 12px 0;
}

.placeholder-content {
  text-align: center;
  color: #999;
  padding: 20px 0;
}

.placeholder-icon {
  font-size: 24px;
  margin-bottom: 8px;
  color: #666;
}

.placeholder-content p {
  margin: 0;
  font-size: 12px;
}


</style> 