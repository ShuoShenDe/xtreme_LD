# 评论气泡系统架构

## 概述

评论气泡系统现在采用单例模式，生命周期与整个应用一致，不再与 `QualityPanel` 组件绑定。

## 架构设计

### 1. 单例模式

`CommentBubbleManager` 现在是一个全局单例：

```typescript
// 获取单例实例
const manager = CommentBubbleManager.getInstance(editor);

// 初始化（只在应用启动时调用一次）
manager.initialize();

// 销毁（只在应用关闭时调用）
CommentBubbleManager.destroyInstance();
```

### 2. 生命周期管理

- **应用启动**：在 `App.vue` 的 `Editor.vue` 中初始化
- **应用运行**：所有组件共享同一个实例
- **应用关闭**：在 `Editor.vue` 的 `onBeforeUnmount` 中销毁

### 3. 组件使用

任何需要使用气泡功能的组件都可以通过以下方式获取实例：

```typescript
import { CommentBubbleManager } from '@/ltmComponents/qualityPanel/CommentBubbleManager';

// 获取已初始化的实例
const manager = CommentBubbleManager.getInstance();

// 使用气泡功能
const bubbleId = manager.createBubble(config);
manager.highlightBubble(bubbleId);
```

## 文件结构

```
src/
├── businessNew/
│   └── Editor.vue                    # 应用主组件，负责初始化气泡管理器
├── ltmComponents/
│   └── qualityPanel/
│       ├── CommentBubbleManager.ts   # 气泡管理器单例
│       ├── useObjectComment.ts       # 气泡功能 Hook
│       └── QualityPanel.vue          # 质量面板组件
```

## 优势

1. **全局一致性**：所有组件使用同一个气泡管理器实例
2. **生命周期独立**：不再受组件挂载/卸载影响
3. **状态持久化**：气泡状态在组件切换时保持
4. **资源管理**：统一管理气泡资源，避免内存泄漏
5. **事件管理**：全局事件监听，避免重复注册

## 使用示例

### 在 QualityPanel 中使用

```typescript
import useObjectComment from './useObjectComment';

export default {
  setup() {
    const { createBubble, highlightBubble } = useObjectComment();
    
    // 创建气泡
    const bubbleId = createBubble({
      x: 100,
      y: 100,
      commentId: 'comment-123'
    });
    
    // 高亮气泡
    highlightBubble(bubbleId);
  }
}
```

### 在其他组件中使用

```typescript
import { CommentBubbleManager } from '@/ltmComponents/qualityPanel/CommentBubbleManager';

export default {
  setup() {
    const manager = CommentBubbleManager.getInstance();
    
    // 直接使用管理器
    const bubbleId = manager.createBubble(config);
    manager.highlightBubble(bubbleId);
  }
}
```

## 注意事项

1. **初始化顺序**：确保在 `Editor.vue` 的 `onMounted` 中初始化
2. **销毁时机**：在 `Editor.vue` 的 `onBeforeUnmount` 中销毁
3. **事件监听**：组件可以注册自己的事件监听器，但不会影响全局管理器
4. **状态检查**：使用 `manager.isReady()` 检查管理器是否可用

## 迁移指南

如果之前有代码直接创建 `CommentBubbleManager` 实例，需要修改为使用单例：

```typescript
// 旧代码
const manager = new CommentBubbleManager(editor);

// 新代码
const manager = CommentBubbleManager.getInstance();
``` 