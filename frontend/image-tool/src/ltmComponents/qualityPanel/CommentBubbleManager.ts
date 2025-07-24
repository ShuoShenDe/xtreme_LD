import { CommentBubble } from 'image-editor/ImageView/shape';
import { Event } from 'image-editor/configs';
import type Editor from 'image-editor/Editor';
import type { Vector2 } from 'image-editor/types';

export interface ICommentBubbleConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  tailWidth?: number;
  tailHeight?: number;
  commentId?: string; // 关联的评论ID
}

export default class CommentBubbleManager {
  private static instance: CommentBubbleManager | null = null;
  private editor: Editor;
  private bubbles: Map<string, CommentBubble> = new Map();
  private bubbleIdCounter = 0;
  private bubbleGroup: any; // Konva.Group for bubbles
  private isDestroyed = false;
  private isInitialized = false;

  private constructor(editor: Editor) {
    this.editor = editor;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(editor?: Editor): CommentBubbleManager {
    if (!CommentBubbleManager.instance) {
      if (!editor) {
        throw new Error('Editor is required for first initialization of CommentBubbleManager');
      }
      CommentBubbleManager.instance = new CommentBubbleManager(editor);
    }
    return CommentBubbleManager.instance;
  }

  /**
   * 销毁单例实例
   */
  public static destroyInstance(): void {
    if (CommentBubbleManager.instance) {
      CommentBubbleManager.instance.destroy();
      CommentBubbleManager.instance = null;
    }
  }

  /**
   * 初始化管理器
   */
  public initialize(): void {
    if (this.isInitialized || this.isDestroyed) {
      return;
    }

    this.initBubbleGroup();
    this.initEventListeners();
    this.isInitialized = true;
  }

  /**
   * 检查是否已初始化
   */
  public isReady(): boolean {
    return this.isInitialized && !this.isDestroyed;
  }

  private initBubbleGroup() {
    // 创建一个专门的组来管理气泡，不通过 dataManager
    this.bubbleGroup = new (window as any).Konva.Group({
      name: 'comment-bubbles-group',
      visible: true,
      listening: true
    });
    
    // 将气泡组添加到 renderLayer，确保在最上层显示
    this.editor.mainView.renderLayer.add(this.bubbleGroup);
  }

  private initEventListeners() {
    // 注意：不再监听 COMMENT_BUBBLE_CREATE 事件，因为 CommentBubbleInitializer 已经处理了
    // 避免重复监听同一事件导致的问题

    // 监听帧切换事件，清理气泡
    this.editor.on(Event.FRAME_CHANGE, () => {
      if (!this.isDestroyed) {
        this.clearAllBubbles();
      }
    });
  }

  /**
   * 创建气泡
   */
  createBubble(config: ICommentBubbleConfig): string {
    if (!this.isReady() || !this.bubbleGroup) {
      console.warn('CommentBubbleManager is not ready or bubbleGroup is null');
      return '';
    }

    const bubbleId = `comment-bubble-${++this.bubbleIdCounter}`;
    
    const bubble = new CommentBubble({
      ...config,
      id: bubbleId
    });

    // 手动设置 userData，确保 commentId 正确设置
    bubble.userData = {
      commentId: config.commentId,
      bubbleId: bubbleId
    };



    // 确保气泡可见且可选择
    bubble.setAttrs({ 
      selectable: true,
      visible: true,
      listening: true
    });

    // 确保 renderLayer 启用了事件监听
    this.editor.mainView.renderLayer.listening(true);

    // 直接添加到气泡组，不通过 dataManager
    this.bubbleGroup.add(bubble);
    
    // 强制重新渲染
    this.editor.mainView.renderLayer.batchDraw();

    // 存储气泡引用
    this.bubbles.set(bubbleId, bubble);

    return bubbleId;
  }

  /**
   * 通过评论ID创建气泡
   */
  createBubbleByCommentId(commentId: string, config: ICommentBubbleConfig): string {
    // 检查是否已经存在该评论ID的气泡
    const existingBubble = this.getBubbleByCommentId(commentId);
    if (existingBubble) {
      return '';
    }
    
    return this.createBubble({
      ...config,
      commentId
    });
  }

  /**
   * 删除气泡
   */
  deleteBubble(bubbleId: string): boolean {
    if (!this.isReady()) {
      return false;
    }

    const bubble = this.bubbles.get(bubbleId);
    if (!bubble) {
      return false;
    }

    // 从气泡组中移除
    bubble.destroy();
    
    // 强制重新渲染
    this.editor.mainView.renderLayer.batchDraw();

    // 从管理器中移除
    this.bubbles.delete(bubbleId);

    return true;
  }

  /**
   * 通过评论ID删除气泡
   */
  deleteBubbleByCommentId(commentId: string): boolean {
    for (const [bubbleId, bubble] of this.bubbles) {
      if (bubble.userData?.commentId === commentId) {
        return this.deleteBubble(bubbleId);
      }
    }
    return false;
  }

  /**
   * 获取气泡
   */
  getBubble(bubbleId: string): CommentBubble | undefined {
    return this.bubbles.get(bubbleId);
  }

  /**
   * 通过评论ID获取气泡
   */
  getBubbleByCommentId(commentId: string): CommentBubble | undefined {
    for (const bubble of this.bubbles.values()) {
      if (bubble.userData?.commentId === commentId) {
        return bubble;
      }
    }
    return undefined;
  }

  /**
   * 高亮气泡
   */
  highlightBubble(bubbleId: string): boolean {
    if (!this.isReady()) {
      return false;
    }

    const bubble = this.bubbles.get(bubbleId);
    if (!bubble) {
      return false;
    }

    this.editor.mainView.setState(bubble, { select: true });
    return true;
  }

  /**
   * 通过评论ID高亮气泡
   */
  highlightBubbleByCommentId(commentId: string): boolean {
    const bubble = this.getBubbleByCommentId(commentId);
    if (!bubble) {
      return false;
    }

    this.editor.mainView.setState(bubble, { select: true });
    return true;
  }

  /**
   * 取消高亮气泡
   */
  unhighlightBubble(bubbleId: string): boolean {
    if (!this.isReady()) {
      return false;
    }

    const bubble = this.bubbles.get(bubbleId);
    if (!bubble) {
      return false;
    }

    this.editor.mainView.setState(bubble, { select: false });
    return true;
  }

  /**
   * 通过评论ID取消高亮气泡
   */
  unhighlightBubbleByCommentId(commentId: string): boolean {
    const bubble = this.getBubbleByCommentId(commentId);
    if (!bubble) {
      return false;
    }

    this.editor.mainView.setState(bubble, { select: false });
    return true;
  }

  /**
   * 清除所有气泡
   */
  clearAllBubbles(): void {
    if (!this.isReady()) {
      return;
    }

    // 销毁所有气泡
    this.bubbles.forEach(bubble => {
      bubble.destroy();
    });
    
    // 强制重新渲染
    this.editor.mainView.renderLayer.batchDraw();
    
    // 清空管理器
    this.bubbles.clear();
  }

  /**
   * 获取所有气泡
   */
  getAllBubbles(): CommentBubble[] {
    return Array.from(this.bubbles.values());
  }

  /**
   * 获取所有气泡的 ID 和对象映射
   */
  getAllBubblesWithIds(): Array<{ bubbleId: string; bubble: CommentBubble }> {
    return Array.from(this.bubbles.entries()).map(([bubbleId, bubble]) => ({
      bubbleId,
      bubble
    }));
  }



  /**
   * 销毁管理器
   */
  destroy(): void {
    this.isDestroyed = true;
    
    // 移除事件监听器
    this.editor.off(Event.FRAME_CHANGE);
    
    this.clearAllBubbles();
    this.bubbles.clear();
    
    // 移除气泡组
    if (this.bubbleGroup) {
      this.bubbleGroup.destroy();
      this.bubbleGroup = null;
    }

    this.isInitialized = false;
  }
} 