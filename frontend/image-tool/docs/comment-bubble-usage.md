# 评论气泡功能使用指南

## 概述

评论气泡功能允许用户在图片上创建聊天气泡样式的标记，用于表示该位置有评论。与标准的标注工具不同，评论气泡工具创建的对象不会存储在 `resultState.list.data` 中，而是通过独立的事件系统进行管理。

## 修复后的架构

### 核心关系
1. **气泡工具** → 创建气泡 → 触发 `COMMENT_BUBBLE_CREATE` 事件
2. **CommentBubbleManager** → 处理事件 → 创建气泡 → 触发 `COMMENT_BUBBLE_CREATED` 事件（包含气泡ID）
3. **选择事件** → 统一处理物体和气泡的选择 → 高亮对应的评论或气泡
4. **评论列表** → 选择评论 → 高亮对应的气泡

### 事件流程
```
用户使用气泡工具点击图片
    ↓
触发 COMMENT_BUBBLE_CREATE 事件
    ↓
CommentBubbleManager.createBubble() 创建气泡
    ↓
触发 COMMENT_BUBBLE_CREATED 事件（包含气泡ID）
    ↓
外部处理：创建评论并保存到数据库
    ↓
通过 createBubbleByCommentId() 重新创建气泡并关联评论ID
```

### 选择流程
```
用户点击图片中的物体或气泡
    ↓
触发 SELECT 事件
    ↓
handleSelect() 统一处理选择
    ↓
如果是气泡：高亮对应的评论
如果是物体：处理物体选择逻辑
```

## 功能特性

1. **独立的事件系统**: 创建气泡时触发 `COMMENT_BUBBLE_CREATE` 事件，创建完成后触发 `COMMENT_BUBBLE_CREATED` 事件
2. **代码创建气泡**: 可以通过 API 在代码中创建气泡
3. **代码删除气泡**: 可以通过 API 删除指定的气泡
4. **统一选择处理**: 通过 SELECT 事件统一处理物体和气泡的选择
5. **气泡高亮**: 支持高亮和取消高亮气泡
6. **双向关联**: 气泡ID和评论ID相互绑定，支持双向查找和操作

## 使用方法

### 1. 基本使用

在组件中使用 `useObjectComment` hook：

```typescript
import useObjectComment from '@/ltmComponents/qualityPanel/useObjectComment';

export default {
  setup() {
    const {
      createBubble,
      createBubbleByCommentId,
      deleteBubble,
      deleteBubbleByCommentId,
      highlightBubble,
      highlightBubbleByCommentId,
      unhighlightBubbleByCommentId
    } = useObjectComment();

    // 使用这些方法...
  }
};
```

### 2. 创建气泡

#### 通过工具创建
1. 选择评论气泡工具
2. 在图片上点击，会触发 `COMMENT_BUBBLE_CREATE` 事件
3. 在 `COMMENT_BUBBLE_CREATED` 事件处理函数中创建评论并保存到数据库
4. 保存评论后，通过 `createBubbleByCommentId` 重新创建气泡并关联评论ID

#### 通过代码创建

```typescript
// 创建普通气泡
const bubbleId = createBubble({
  x: 100,
  y: 100,
  width: 60,
  height: 40,
  tailWidth: 16,
  tailHeight: 16
});

// 通过评论ID创建气泡
const bubbleId = createBubbleByCommentId('comment-123', {
  x: 200,
  y: 200,
  width: 60,
  height: 40,
  tailWidth: 16,
  tailHeight: 16
});
```

### 3. 删除气泡

```typescript
// 通过气泡ID删除
const success = deleteBubble('bubble-123');

// 通过评论ID删除
const success = deleteBubbleByCommentId('comment-123');
```

### 4. 高亮气泡

```typescript
// 通过气泡ID高亮
const success = highlightBubble('bubble-123');

// 通过评论ID高亮
const success = highlightBubbleByCommentId('comment-123');

// 通过评论ID取消高亮
const success = unhighlightBubbleByCommentId('comment-123');
```

### 5. 事件监听

```typescript
import { Event } from 'image-editor';

// 监听气泡创建事件
editor.on(Event.COMMENT_BUBBLE_CREATE, (config) => {
  console.log('气泡创建配置:', config);
  // 这里可以准备创建评论的逻辑
});

// 监听气泡创建完成事件（包含气泡ID）
editor.on('COMMENT_BUBBLE_CREATED', (data) => {
  console.log('气泡创建完成:', data.bubbleId);
  console.log('气泡配置:', data.config);
  // 在这里创建评论并保存到数据库
  // 保存评论后，通过 createBubbleByCommentId 重新创建气泡并关联评论ID
});

// 监听选择事件（统一处理物体和气泡选择）
editor.on(Event.SELECT, (preSelection, currentSelection) => {
  currentSelection.forEach(object => {
    if (object.className === 'comment-bubble') {
      const commentId = object.userData?.commentId;
      if (commentId) {
        // 高亮对应的评论
        highlightCommentInTree(commentId);
      }
    }
  });
});
```

## 事件说明

### COMMENT_BUBBLE_CREATE
当用户使用评论气泡工具点击图片时触发。

**参数**: `ICommentBubbleConfig`
```typescript
interface ICommentBubbleConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  tailWidth?: number;
  tailHeight?: number;
  commentId?: string;
}
```

### COMMENT_BUBBLE_CREATED
当气泡创建完成后触发。

**参数**: 
```typescript
{
  bubbleId: string;
  config: ICommentBubbleConfig;
}
```

### SELECT
当用户选择物体或气泡时触发。

**参数**: 
```typescript
(preSelection: any[], currentSelection: any[])
```

## 与评论系统的集成

### 1. 创建评论时创建气泡

```typescript
// 监听气泡创建完成事件
editor.on('COMMENT_BUBBLE_CREATED', async (data) => {
  try {
    // 创建评论数据
    const commentData = {
      type: 'object',
      content: '新评论',
      position: {
        x: data.config.x,
        y: data.config.y
      }
    };
    
    // 保存评论到数据库
    const savedComment = await saveCommentToDatabase(commentData);
    
    // 删除临时创建的气泡
    deleteBubble(data.bubbleId);
    
    // 创建关联评论ID的气泡
    const newBubbleId = createBubbleByCommentId(savedComment.id, data.config);
    
    console.log('评论和气泡创建成功');
  } catch (error) {
    console.error('创建评论失败:', error);
  }
});
```

### 2. 删除评论时删除气泡

```typescript
// 在评论删除成功后，删除对应的气泡
const handleCommentDeleted = async (commentId) => {
  try {
    // 删除评论
    await deleteCommentFromDatabase(commentId);
    
    // 删除对应的气泡
    const success = deleteBubbleByCommentId(commentId);
    
    if (success) {
      console.log('评论和气泡删除成功');
    }
  } catch (error) {
    console.error('删除评论失败:', error);
  }
};
```

### 3. 选择气泡时高亮评论

```typescript
// 监听选择事件
editor.on(Event.SELECT, (preSelection, currentSelection) => {
  currentSelection.forEach(object => {
    if (object.className === 'comment-bubble') {
      const commentId = object.userData?.commentId;
      if (commentId) {
        // 高亮对应的评论
        highlightCommentInTree(commentId);
        
        // 或者滚动到对应的评论
        scrollToComment(commentId);
      }
    }
  });
});
```

### 4. 选择评论时高亮气泡

```typescript
// 在评论列表中选择评论时
const handleCommentSelected = (commentId) => {
  // 高亮对应的气泡
  const success = highlightBubbleByCommentId(commentId);
  
  if (success) {
    console.log('气泡高亮成功');
  }
};
```

## 测试

评论气泡测试功能已经集成到 `QualityPanel.vue` 中，可以直接在质检面板中看到测试按钮。

## 注意事项

1. 气泡管理器会在帧切换时自动清理所有气泡
2. 气泡的样式可以通过修改 `CommentBubbleStateStyle` 配置来调整
3. 气泡的选择事件通过统一的 SELECT 事件处理，不需要单独的事件监听
4. 建议在组件卸载时调用 `bubbleManager.destroy()` 来清理资源
5. 气泡的 `userData.commentId` 用于关联评论，确保正确设置

## 扩展功能

可以根据需要扩展以下功能：

1. **气泡拖拽**: 允许用户拖拽气泡到新位置
2. **气泡大小调整**: 允许用户调整气泡的大小
3. **气泡样式自定义**: 支持不同的气泡样式
4. **气泡动画**: 添加创建、删除、高亮等动画效果
5. **批量操作**: 支持批量创建、删除、高亮气泡 