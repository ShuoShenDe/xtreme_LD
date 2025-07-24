// 文本工具集成模块

import { EfficiencyTracker } from '../core/EfficiencyTracker';
import { AnnotationEvent, PerformanceEvent, UserInteractionEvent, ToolEfficiencyEvent } from '../types/events';

export interface TextToolIntegrationOptions {
  tracker: EfficiencyTracker;
  enableAutoTracking?: boolean;
  trackTextOperations?: boolean;
  trackUserInteractions?: boolean;
  trackAnnotationEvents?: boolean;
}

export class TextToolIntegration {
  private tracker: EfficiencyTracker;
  private enableAutoTracking: boolean;
  private trackTextOperations: boolean;
  private trackUserInteractions: boolean;
  private trackAnnotationEvents: boolean;
  
  private isMonitoring: boolean = false;

  constructor(options: TextToolIntegrationOptions) {
    this.tracker = options.tracker;
    this.enableAutoTracking = options.enableAutoTracking ?? true;
    this.trackTextOperations = options.trackTextOperations ?? true;
    this.trackUserInteractions = options.trackUserInteractions ?? true;
    this.trackAnnotationEvents = options.trackAnnotationEvents ?? true;

    if (this.enableAutoTracking) {
      this.startAutoTracking();
    }
  }

  /**
   * 开始自动追踪
   */
  startAutoTracking(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // 监听用户交互
    if (this.trackUserInteractions) {
      this.startUserInteractionMonitoring();
    }
  }

  /**
   * 停止自动追踪
   */
  stopAutoTracking(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    this.removeEventListeners();
  }

  /**
   * 追踪文本分类标注
   */
  trackTextClassification(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
    textContent?: string;
    className?: string;
    confidence?: number;
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.trackAnnotationEvents) return;

    this.tracker.trackAnnotation({
      action,
      annotationType: 'classification',
      objectId: data.objectId,
      duration: data.duration,
      metadata: {
        ...data.metadata,
        textContent: data.textContent,
        className: data.className,
        confidence: data.confidence,
        textLength: data.textContent?.length || 0,
      },
    });
  }

  /**
   * 追踪文本实体标注
   */
  trackTextEntityAnnotation(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
    textContent?: string;
    entityType?: string;
    startPosition?: number;
    endPosition?: number;
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.trackAnnotationEvents) return;

    this.tracker.trackAnnotation({
      action,
      annotationType: 'text',
      objectId: data.objectId,
      duration: data.duration,
      metadata: {
        ...data.metadata,
        textContent: data.textContent,
        entityType: data.entityType,
        startPosition: data.startPosition,
        endPosition: data.endPosition,
        entityLength: data.endPosition && data.startPosition ? data.endPosition - data.startPosition : 0,
      },
    });
  }

  /**
   * 追踪文本情感分析
   */
  trackSentimentAnalysis(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
    textContent?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    confidence?: number;
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.trackAnnotationEvents) return;

    this.tracker.trackAnnotation({
      action,
      annotationType: 'classification',
      objectId: data.objectId,
      duration: data.duration,
      metadata: {
        ...data.metadata,
        textContent: data.textContent,
        sentiment: data.sentiment,
        confidence: data.confidence,
        textLength: data.textContent?.length || 0,
        analysisType: 'sentiment',
      },
    });
  }

  /**
   * 追踪文本加载
   */
  trackTextLoad(data: {
    fileName: string;
    fileSize: number;
    textLength: number;
    loadTime: number;
    success: boolean;
    errorMessage?: string;
  }): void {
    this.tracker.trackToolEfficiency({
      toolAction: 'text_load',
      startTime: Date.now() - data.loadTime,
      endTime: Date.now(),
      duration: data.loadTime,
      success: data.success,
      errorReason: data.errorMessage,
      metadata: {
        fileName: data.fileName,
        fileSize: data.fileSize,
        textLength: data.textLength,
      },
    });
  }

  /**
   * 追踪文本处理
   */
  trackTextProcessing(data: {
    operation: string;
    inputLength: number;
    outputLength?: number;
    processingTime: number;
    success: boolean;
    errorMessage?: string;
  }): void {
    this.tracker.trackToolEfficiency({
      toolAction: 'text_processing',
      startTime: Date.now() - data.processingTime,
      endTime: Date.now(),
      duration: data.processingTime,
      success: data.success,
      errorReason: data.errorMessage,
      metadata: {
        operation: data.operation,
        inputLength: data.inputLength,
        outputLength: data.outputLength,
        compressionRatio: data.outputLength ? data.outputLength / data.inputLength : undefined,
      },
    });
  }

  /**
   * 追踪文本搜索
   */
  trackTextSearch(data: {
    query: string;
    resultsCount: number;
    searchTime: number;
    success: boolean;
  }): void {
    this.tracker.trackToolEfficiency({
      toolAction: 'text_search',
      startTime: Date.now() - data.searchTime,
      endTime: Date.now(),
      duration: data.searchTime,
      success: data.success,
      metadata: {
        query: data.query,
        queryLength: data.query.length,
        resultsCount: data.resultsCount,
      },
    });
  }

  /**
   * 追踪文本替换
   */
  trackTextReplace(data: {
    searchText: string;
    replaceText: string;
    replacementCount: number;
    operationTime: number;
    success: boolean;
  }): void {
    this.tracker.trackToolEfficiency({
      toolAction: 'text_replace',
      startTime: Date.now() - data.operationTime,
      endTime: Date.now(),
      duration: data.operationTime,
      success: data.success,
      metadata: {
        searchText: data.searchText,
        replaceText: data.replaceText,
        replacementCount: data.replacementCount,
      },
    });
  }

  /**
   * 追踪文本编辑
   */
  trackTextEdit(data: {
    editType: 'insert' | 'delete' | 'replace';
    position: number;
    oldText?: string;
    newText?: string;
    duration?: number;
  }): void {
    this.tracker.trackUserInteraction({
      action: 'keyboard',
      element: 'text_editor',
      duration: data.duration,
      metadata: {
        editType: data.editType,
        position: data.position,
        oldText: data.oldText,
        newText: data.newText,
        textChangeLength: data.newText?.length || 0 - (data.oldText?.length || 0),
      },
    });
  }

  /**
   * 追踪文本选择
   */
  trackTextSelection(data: {
    startPosition: number;
    endPosition: number;
    selectedText: string;
    duration?: number;
  }): void {
    this.tracker.trackUserInteraction({
      action: 'drag',
      element: 'text_editor',
      duration: data.duration,
      metadata: {
        startPosition: data.startPosition,
        endPosition: data.endPosition,
        selectedText: data.selectedText,
        selectionLength: data.endPosition - data.startPosition,
      },
    });
  }

  /**
   * 追踪文本性能指标
   */
  trackTextPerformance(data: {
    operation: string;
    textLength: number;
    processingTime: number;
    memoryUsage?: number;
  }): void {
    this.tracker.trackPerformance({
      metricName: 'text_processing_time',
      value: data.processingTime,
      unit: 'ms',
      context: {
        operation: data.operation,
        textLength: data.textLength,
        memoryUsage: data.memoryUsage,
      },
    });
  }

  /**
   * 追踪标注保存
   */
  trackAnnotationSave(data: {
    annotationCount: number;
    saveTime: number;
    success: boolean;
    errorMessage?: string;
  }): void {
    this.tracker.trackToolEfficiency({
      toolAction: 'annotation_save',
      startTime: Date.now() - data.saveTime,
      endTime: Date.now(),
      duration: data.saveTime,
      success: data.success,
      errorReason: data.errorMessage,
      metadata: {
        annotationCount: data.annotationCount,
      },
    });
  }

  /**
   * 开始用户交互监控
   */
  private startUserInteractionMonitoring(): void {
    if (typeof document === 'undefined') return;

    // 监听鼠标事件
    document.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('mousemove', this.handleMouseMove);

    // 监听键盘事件
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);

    // 监听输入事件
    document.addEventListener('input', this.handleInput);
  }

  /**
   * 移除事件监听器
   */
  private removeEventListeners(): void {
    if (typeof document === 'undefined') return;

    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('input', this.handleInput);
  }

  /**
   * 处理鼠标按下事件
   */
  private handleMouseDown = (event: MouseEvent): void => {
    if (!this.trackUserInteractions) return;

    this.tracker.trackUserInteraction({
      action: 'click',
      element: 'text_editor',
      position: { x: event.clientX, y: event.clientY },
      metadata: {
        button: event.button,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      },
    });
  };

  /**
   * 处理鼠标松开事件
   */
  private handleMouseUp = (event: MouseEvent): void => {
    // 可以在这里处理选择结束等事件
  };

  /**
   * 处理鼠标移动事件
   */
  private handleMouseMove = (event: MouseEvent): void => {
    // 限制频率，避免过多事件
    if (Math.random() > 0.02) return;

    if (!this.trackUserInteractions) return;

    this.tracker.trackUserInteraction({
      action: 'mouse_move',
      element: 'text_editor',
      position: { x: event.clientX, y: event.clientY },
    });
  };

  /**
   * 处理键盘按下事件
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.trackUserInteractions) return;

    this.tracker.trackUserInteraction({
      action: 'keyboard',
      element: 'text_editor',
      keyCode: event.code,
      modifiers: this.getKeyModifiers(event),
      metadata: {
        key: event.key,
        repeat: event.repeat,
      },
    });
  };

  /**
   * 处理键盘松开事件
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    // 可以在这里处理按键释放相关的逻辑
  };

  /**
   * 处理输入事件
   */
  private handleInput = (event: Event): void => {
    if (!this.trackUserInteractions) return;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      this.tracker.trackUserInteraction({
        action: 'keyboard',
        element: 'text_input',
        metadata: {
          inputType: target.type,
          valueLength: target.value.length,
        },
      });
    }
  };

  /**
   * 获取按键修饰符
   */
  private getKeyModifiers(event: KeyboardEvent): string[] {
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) modifiers.push('meta');
    return modifiers;
  }

  /**
   * 销毁集成模块
   */
  destroy(): void {
    this.stopAutoTracking();
  }
} 