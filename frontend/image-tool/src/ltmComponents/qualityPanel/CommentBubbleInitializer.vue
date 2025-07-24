<!-- CommentBubbleInitializer.vue -->
<template>
  <!-- 这是一个虚拟组件，不渲染任何内容 -->
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useInjectBSEditor } from '@/businessNew/context';
import { Event, StatusType } from 'image-editor';
import { default as CommentBubbleManager, ICommentBubbleConfig } from './CommentBubbleManager';
import { useProjectMetaStore } from '@/stores/projectMeta';
import { useAreaComment } from './useAreaComment';
import { useCommentStore } from '@/stores/comment';
import type { BubbleConfig } from '@/ltmApi/types/comment';
import type { CommentData } from '@/ltmApi/types/comment';
import Editor from '@/package/image-editor/Editor';

// 获取依赖注入的 editor
const editor = useInjectBSEditor();
const projectMetaStore = useProjectMetaStore();
const commentStore = useCommentStore();
const { createDefaultAreaComment } = useAreaComment();

// 防抖定时器
let renderDebounceTimer: NodeJS.Timeout | null = null;
const isRendering = ref(false);

// 选择事件处理函数
const handleSelect = (preSelection: any[], currentSelection: any[]) => {
  if (currentSelection.length > 0) {
    currentSelection.forEach((object) => {
      // 检查是否是气泡
      if (object.className === 'comment-bubble') {
        const commentId = object.userData?.commentId;
        if (commentId) {
          // 高亮对应的评论
          commentStore.setHighlightCommentIds([commentId]);
        }
      } else {
        // 如果选中的不是气泡，取消所有评论高亮
        commentStore.clearHighlightCommentIds();
      }
    });
  } else {
    // 没有选中任何物体时，取消所有评论高亮
    commentStore.clearHighlightCommentIds();
  }
};

// 评论气泡创建事件处理函数
const handleCommentBubbleCreate = (config: ICommentBubbleConfig) => {
  // 检查是否是 QC 阶段
  if (projectMetaStore.phase !== 'qc') {
    return;
  }
  
  // 创建默认的区域评论，包含气泡配置
  // 将 ICommentBubbleConfig 转换为 BubbleConfig
  const bubbleConfig: BubbleConfig = {
    x: config.x,
    y: config.y,
    width: config.width,
    height: config.height,
    tailWidth: config.tailWidth,
    tailHeight: config.tailHeight
  };
  
  const areaComment = createDefaultAreaComment(bubbleConfig);
  
  // 触发事件，让父组件处理对话框显示
  editor.emit('AREA_COMMENT_CREATE', { comment: areaComment, bubbleConfig: config });
};

// 评论气泡创建完成事件处理函数
const handleCommentBubbleCreated = (data: { bubbleId: string; config: ICommentBubbleConfig }) => {
  // 可以在这里添加创建完成后的逻辑
};

// 渲染评论气泡到图片上
const renderCommentBubbles = () => {
  // 如果正在渲染，跳过
  if (isRendering.value) {
    return;
  }
  
  isRendering.value = true;
  
  try {
    // 获取当前帧索引
    const editor = (window as any).editor as Editor;
    let currentFrameIdx = 0;
    if (editor) {
      const currentFrame = editor.getCurrentFrame();
      currentFrameIdx = editor.getFrameIndex(currentFrame.id);
    } else {
      console.error('Editor not initialized yet, using frame 0');
    }
    
    // 获取数据库中的原始评论数据
    const allDbComments = commentStore.allComments.data;
    
    // 获取气泡管理器
    const bubbleManager = CommentBubbleManager.getInstance();
    if (!bubbleManager) {
      console.warn('气泡管理器实例不存在，跳过渲染');
      return;
    }
    
    if (!bubbleManager.isReady()) {
      console.warn('气泡管理器未准备好，延迟重试');
      // 延迟重试
      setTimeout(() => {
        isRendering.value = false;
        renderCommentBubbles();
      }, 100);
      return;
    }
    
    // 获取当前所有气泡
    const existingBubbles = bubbleManager.getAllBubbles();
    const existingCommentIds = new Set<string>();
    
    // 收集现有气泡的评论ID
    existingBubbles.forEach(bubble => {
      const commentId = bubble.userData?.commentId;
      if (commentId && typeof commentId === 'string' && commentId.trim() !== '') {
        existingCommentIds.add(commentId);
      }
    });
    
    // 过滤出根评论（没有父评论的评论）且包含当前帧的评论
    const rootComments = allDbComments.filter(comment => {
      // 检查是否有父评论
      if (comment.attributes.parent) {
        return false;
      }
      
      // 检查 frames 是否包含当前帧
      const frames = comment.attributes.frames;
      if (!frames || frames.length === 0) {
        return false;
      }
      
      // 确保 frames 是数字数组进行比较
      const frameNumbers = frames.map((f: string | number) => Number(f));
      return frameNumbers.includes(currentFrameIdx);
    });
    
    // 创建缺失的气泡
    rootComments.forEach(comment => {
      const bubbleConfig = comment.attributes?.params?.bubbleConfig;
      if (bubbleConfig && !existingCommentIds.has(comment.id)) {
        const bubbleId = bubbleManager.createBubbleByCommentId(comment.id, {
          x: bubbleConfig.x,
          y: bubbleConfig.y,
          width: bubbleConfig.width,
          height: bubbleConfig.height,
          tailWidth: bubbleConfig.tailWidth,
          tailHeight: bubbleConfig.tailHeight,
          commentId: comment.id
        });
        
        if (!bubbleId) {
          console.error('气泡创建失败');
        }
      }
    });
    
    // 删除不再存在的气泡或不在当前帧的气泡
    const allBubblesWithIds = bubbleManager.getAllBubblesWithIds();
    allBubblesWithIds.forEach(({ bubbleId, bubble }) => {
      const commentId = bubble.userData?.commentId;
      if (commentId && typeof commentId === 'string' && commentId.trim() !== '') {
        // 检查评论是否还存在
        const commentExists = allDbComments.some(c => c.id === commentId);
        if (!commentExists) {
          bubbleManager.deleteBubble(bubbleId);
          return;
        }
        
        // 检查评论是否包含当前帧
        const comment = allDbComments.find(c => c.id === commentId);
        if (comment) {
          const frames = comment.attributes.frames;
          if (!frames || frames.length === 0) {
            bubbleManager.deleteBubble(bubbleId);
            return;
          }
          
          const frameNumbers = frames.map((f: string | number) => Number(f));
          if (!frameNumbers.includes(currentFrameIdx)) {
            bubbleManager.deleteBubble(bubbleId);
            return;
          }
        }
      } else {
        // 删除没有有效评论ID的气泡
        bubbleManager.deleteBubble(bubbleId);
      }
    });
  } finally {
    isRendering.value = false;
  }
};

// 防抖渲染函数
const debouncedRender = () => {
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer);
  }
  
  renderDebounceTimer = setTimeout(() => {
    renderCommentBubbles();
    renderDebounceTimer = null;
  }, 200); // 200ms 防抖延迟
};

onMounted(() => {
  // 确保气泡管理器已初始化
  const bubbleManager = CommentBubbleManager.getInstance(editor);
  if (!bubbleManager.isReady()) {
    bubbleManager.initialize();
  }
  
  // 注册事件监听器
  editor.on(Event.SELECT, handleSelect);
  editor.on(Event.COMMENT_BUBBLE_CREATE, handleCommentBubbleCreate);
  editor.on('COMMENT_BUBBLE_CREATED', handleCommentBubbleCreated);
  editor.on(Event.FRAME_CHANGE, () => {
    // 帧切换时重新渲染气泡
    setTimeout(() => {
      renderCommentBubbles();
    }, 100);
  });
  
  // 监听评论数据变化，自动渲染气泡
  const unwatch = commentStore.$subscribe(() => {
    // 使用防抖渲染，避免重复触发
    debouncedRender();
  });
  
  // 等待 editor 完全初始化后再渲染气泡
  const waitForEditorReady = () => {
    if (editor.state.status === StatusType.Default) {
      renderCommentBubbles();
    } else {
      setTimeout(waitForEditorReady, 100);
    }
  };
  
  // 延迟等待 editor 初始化
  setTimeout(waitForEditorReady, 500);
});

onBeforeUnmount(() => {
  // 清理防抖定时器
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = null;
  }
  
  // 清理事件监听器
  editor.off(Event.SELECT, handleSelect);
  editor.off(Event.COMMENT_BUBBLE_CREATE, handleCommentBubbleCreate);
  editor.off('COMMENT_BUBBLE_CREATED', handleCommentBubbleCreated);
  editor.off(Event.FRAME_CHANGE);
});
</script>

<style scoped>
/* 虚拟组件，不需要样式 */
</style> 