// 图像工具集成模块

import { EfficiencyTracker } from '../core/EfficiencyTracker';
import { AnnotationEvent, PerformanceEvent, UserInteractionEvent, ToolEfficiencyEvent } from '../types/events';

export interface ImageToolIntegrationOptions {
  tracker: EfficiencyTracker;
  enableAutoTracking?: boolean;
  trackImageOperations?: boolean;
  trackUserInteractions?: boolean;
  trackAnnotationEvents?: boolean;
}

export class ImageToolIntegration {
  private tracker: EfficiencyTracker;
  private enableAutoTracking: boolean;
  private trackImageOperations: boolean;
  private trackUserInteractions: boolean;
  private trackAnnotationEvents: boolean;
  
  private isMonitoring: boolean = false;

  constructor(options: ImageToolIntegrationOptions) {
    this.tracker = options.tracker;
    this.enableAutoTracking = options.enableAutoTracking ?? true;
    this.trackImageOperations = options.trackImageOperations ?? true;
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
   * 追踪矩形标注
   */
  trackRectangleAnnotation(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
    position?: { x: number; y: number };
    dimensions?: { width: number; height: number };
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.trackAnnotationEvents) return;

    this.tracker.trackAnnotation({
      action,
      annotationType: 'cuboid', // ✅ 修复：矩形标注使用cuboid类型
      objectId: data.objectId,
      position: data.position,
      duration: data.duration,
      metadata: {
        ...data.metadata,
        dimensions: data.dimensions,
        shape: 'rectangle',
      },
    });
  }

  /**
   * 追踪多边形标注
   */
  trackPolygonAnnotation(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
    points?: Array<{ x: number; y: number }>;
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.trackAnnotationEvents) return;

    this.tracker.trackAnnotation({
      action,
      annotationType: 'polygon',
      objectId: data.objectId,
      duration: data.duration,
      metadata: {
        ...data.metadata,
        points: data.points,
        pointCount: data.points?.length || 0,
      },
    });
  }

  /**
   * 追踪分类标注
   */
  trackClassificationAnnotation(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
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
        className: data.className,
        confidence: data.confidence,
      },
    });
  }

  /**
   * 追踪折线标注
   */
  trackPolylineAnnotation(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
    points?: Array<{ x: number; y: number }>;
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.trackAnnotationEvents) return;

    this.tracker.trackAnnotation({
      action,
      annotationType: 'polyline', // ✅ 新增：折线标注使用polyline类型
      objectId: data.objectId,
      duration: data.duration,
      metadata: {
        ...data.metadata,
        points: data.points,
        pointCount: data.points?.length || 0,
      },
    });
  }

  /**
   * 追踪关键点标注
   */
  trackPointAnnotation(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
    position?: { x: number; y: number };
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.trackAnnotationEvents) return;

    this.tracker.trackAnnotation({
      action,
      annotationType: 'point', // ✅ 新增：关键点标注使用point类型
      objectId: data.objectId,
      position: data.position,
      duration: data.duration,
      metadata: {
        ...data.metadata,
      },
    });
  }

  /**
   * 追踪图像加载
   */
  trackImageLoad(data: {
    fileName: string;
    fileSize: number;
    imageWidth: number;
    imageHeight: number;
    loadTime: number;
    success: boolean;
    errorMessage?: string;
  }): void {
    this.tracker.trackToolEfficiency({
      toolAction: 'image_load',
      startTime: Date.now() - data.loadTime,
      endTime: Date.now(),
      duration: data.loadTime,
      success: data.success,
      errorReason: data.errorMessage,
      metadata: {
        fileName: data.fileName,
        fileSize: data.fileSize,
        imageWidth: data.imageWidth,
        imageHeight: data.imageHeight,
      },
    });
  }

  /**
   * 追踪图像缩放
   */
  trackImageZoom(data: {
    fromScale: number;
    toScale: number;
    duration?: number;
  }): void {
    this.tracker.trackUserInteraction({
      action: 'scroll',
      element: 'image_canvas',
      duration: data.duration,
      metadata: {
        fromScale: data.fromScale,
        toScale: data.toScale,
        zoomDirection: data.toScale > data.fromScale ? 'in' : 'out',
      },
    });
  }

  /**
   * 追踪图像平移
   */
  trackImagePan(data: {
    startPosition: { x: number; y: number };
    endPosition: { x: number; y: number };
    duration?: number;
  }): void {
    this.tracker.trackUserInteraction({
      action: 'drag',
      element: 'image_canvas',
      duration: data.duration,
      position: data.endPosition,
      metadata: {
        startPosition: data.startPosition,
        endPosition: data.endPosition,
        distance: Math.sqrt(
          Math.pow(data.endPosition.x - data.startPosition.x, 2) +
          Math.pow(data.endPosition.y - data.startPosition.y, 2)
        ),
      },
    });
  }

  /**
   * 追踪工具切换
   */
  trackToolSwitch(fromTool: string, toTool: string, duration?: number): void {
    this.tracker.trackToolEfficiency({
      toolAction: 'tool_switch',
      startTime: Date.now() - (duration || 0),
      endTime: Date.now(),
      duration: duration || 0,
      success: true,
      metadata: {
        fromTool,
        toTool,
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
   * 追踪图像处理性能
   */
  trackImageProcessingPerformance(data: {
    operation: string;
    processingTime: number;
    imageSize: number;
    success: boolean;
  }): void {
    this.tracker.trackPerformance({
      metricName: 'image_processing_time',
      value: data.processingTime,
      unit: 'ms',
      context: {
        operation: data.operation,
        imageSize: data.imageSize,
        success: data.success,
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
    document.addEventListener('wheel', this.handleWheel);

    // 监听键盘事件
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 移除事件监听器
   */
  private removeEventListeners(): void {
    if (typeof document === 'undefined') return;

    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 处理鼠标按下事件
   */
  private handleMouseDown = (event: MouseEvent): void => {
    if (!this.trackUserInteractions) return;

    this.tracker.trackUserInteraction({
      action: 'click',
      element: 'image_canvas',
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
    // 可以在这里处理拖拽结束等事件
  };

  /**
   * 处理鼠标移动事件
   */
  private handleMouseMove = (event: MouseEvent): void => {
    // 限制频率，避免过多事件
    if (Math.random() > 0.05) return;

    if (!this.trackUserInteractions) return;

    this.tracker.trackUserInteraction({
      action: 'mouse_move',
      element: 'image_canvas',
      position: { x: event.clientX, y: event.clientY },
    });
  };

  /**
   * 处理鼠标滚轮事件
   */
  private handleWheel = (event: WheelEvent): void => {
    if (!this.trackUserInteractions) return;

    this.tracker.trackUserInteraction({
      action: 'scroll',
      element: 'image_canvas',
      position: { x: event.clientX, y: event.clientY },
      metadata: {
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
      },
    });
  };

  /**
   * 处理键盘按下事件
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.trackUserInteractions) return;

    this.tracker.trackUserInteraction({
      action: 'keyboard',
      element: 'image_canvas',
      keyCode: event.code,
      modifiers: this.getKeyModifiers(event),
      metadata: {
        key: event.key,
      },
    });
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