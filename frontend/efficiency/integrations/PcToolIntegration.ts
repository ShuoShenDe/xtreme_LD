// PC工具集成模块

import { EfficiencyTracker } from '../core/EfficiencyTracker';
import { AnnotationEvent, PerformanceEvent, UserInteractionEvent, ToolEfficiencyEvent } from '../types/events';

export interface PcToolIntegrationOptions {
  tracker: EfficiencyTracker;
  enableAutoTracking?: boolean;
  trackRenderingPerformance?: boolean;
  trackUserInteractions?: boolean;
  trackAnnotationEvents?: boolean;
}

export class PcToolIntegration {
  private tracker: EfficiencyTracker;
  private enableAutoTracking: boolean;
  private trackRenderingEnabled: boolean;
  private trackUserInteractions: boolean;
  private trackAnnotationEvents: boolean;
  
  private renderingTimer: number | null = null;
  private lastRenderTime: number = 0;
  private frameCount: number = 0;
  private isMonitoring: boolean = false;

  constructor(options: PcToolIntegrationOptions) {
    this.tracker = options.tracker;
    this.enableAutoTracking = options.enableAutoTracking ?? true;
    this.trackRenderingEnabled = options.trackRenderingPerformance ?? true;
    this.trackUserInteractions = options.trackUserInteractions ?? true;
    this.trackAnnotationEvents = options.trackAnnotationEvents ?? true;

    if (this.enableAutoTracking) {
      this.startAutoTracking();
    }
  }

  /**
   * 开始自动追踪
   */
  private startAutoTracking(): void {
    if (this.trackRenderingEnabled) {
      this.startRenderingMonitoring();
    }

    if (this.trackUserInteractions) {
      this.startUserInteractionMonitoring();
    }
  }

  /**
   * 开始渲染性能监控
   */
  private startRenderingMonitoring(): void {
    this.isMonitoring = true;
    this.renderingTimer = window.setInterval(() => {
      this.measureRenderingPerformance();
    }, 1000);
  }

  /**
   * 停止渲染性能监控
   */
  private stopRenderingMonitoring(): void {
    this.isMonitoring = false;
    if (this.renderingTimer) {
      clearInterval(this.renderingTimer);
      this.renderingTimer = null;
    }
    
    this.removeEventListeners();
  }

  /**
   * 追踪立方体标注
   */
  trackCuboidAnnotation(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
    position?: { x: number; y: number; z: number };
    dimensions?: { width: number; height: number; depth: number };
    rotation?: { x: number; y: number; z: number };
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.trackAnnotationEvents) return;

    this.tracker.trackAnnotation({
      action,
      annotationType: 'cuboid',
      objectId: data.objectId,
      position: data.position,
      duration: data.duration,
      metadata: {
        toolType: 'pc-tool',
        toolName: 'create3DBox',
        ...data.metadata,
        dimensions: data.dimensions,
        rotation: data.rotation,
      },
    });
  }

  /**
   * 追踪折线标注
   */
  trackPolylineAnnotation(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
    points?: Array<{ x: number; y: number; z: number }>;
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.trackAnnotationEvents) return;

    this.tracker.trackAnnotation({
      action,
      annotationType: 'polyline',
      objectId: data.objectId,
      duration: data.duration,
      metadata: {
        toolType: 'pc-tool',
        toolName: 'createPolyline3D',
        ...data.metadata,
        points: data.points,
        pointCount: data.points?.length || 0,
      },
    });
  }

  /**
   * 追踪点标注
   */
  trackPointAnnotation(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
    position?: { x: number; y: number; z: number };
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.trackAnnotationEvents) return;

    this.tracker.trackAnnotation({
      action,
      annotationType: 'point',
      objectId: data.objectId,
      position: data.position,
      duration: data.duration,
      metadata: {
        toolType: 'pc-tool',
        toolName: 'createPoint3D',
        ...data.metadata,
      },
    });
  }

  /**
   * 追踪多边形标注
   */
  trackPolygonAnnotation(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
    points?: Array<{ x: number; y: number; z: number }>;
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
        toolType: 'pc-tool',
        toolName: 'createPolygon3D',
        ...data.metadata,
        points: data.points,
        pointCount: data.points?.length || 0,
      },
    });
  }

  /**
   * 追踪分割标注
   */
  trackSegmentationAnnotation(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    objectId?: string;
    points?: Array<{ x: number; y: number; z: number }>;
    indices?: number[];
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.trackAnnotationEvents) return;

    // 使用扩展元数据以避免类型冲突
    const extendedMetadata = {
      toolType: 'pc-tool',
      toolName: 'createSegmentation3D',
      ...data.metadata,
      points: data.points,
      indices: data.indices,
      pointCount: data.points?.length || 0,
      indexCount: data.indices?.length || 0,
    };

    this.tracker.trackAnnotation({
      action,
      annotationType: 'segmentation',
      objectId: data.objectId,
      duration: data.duration,
      metadata: extendedMetadata,
    });
  }

  /**
   * 追踪用户交互
   */
  trackUserInteraction(action: string, data: {
    element?: string;
    position?: { x: number; y: number };
    duration?: number;
  }): void {
    if (!this.trackUserInteractions) return;

    // 限制action为已知类型
    const validActions = ['click', 'keydown', 'scroll', 'mouse_move', 'drag'];
    const validAction = validActions.includes(action) ? action : 'unknown';

    this.tracker.trackUserInteraction({
      action: validAction as any,
      element: data.element || 'unknown',
      duration: data.duration,
      position: data.position,
    });
  }

  /**
   * 追踪工具激活
   */
  trackToolActivation(toolName: string, metadata?: Record<string, any>): void {
    const toolMetadata = {
      toolType: 'pc-tool',
      toolName,
      ...metadata,
    };

    this.tracker.trackToolEfficiency({
      toolAction: 'tool_activation',
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      success: true,
      metadata: toolMetadata,
    });
  }

  /**
   * 追踪工具完成
   */
  trackToolCompletion(toolName: string, duration: number, metadata?: Record<string, any>): void {
    const toolMetadata = {
      toolType: 'pc-tool',
      toolName,
      ...metadata,
    };

    this.tracker.trackToolEfficiency({
      toolAction: 'tool_completion',
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      success: true,
      metadata: toolMetadata,
    });
  }

  /**
   * 追踪PC标注操作
   */
  trackPcAnnotation(toolName: string, action: string, metadata?: Record<string, any>): void {
    this.tracker.trackAnnotation({
      action: 'complete',
      annotationType: 'cuboid',
      metadata: {
        toolType: 'pc-tool',
        toolName,
        actionType: action,
        ...metadata,
      },
    });
  }

  /**
   * 追踪渲染性能
   */
  trackRenderingPerformance(data: {
    fps?: number;
    renderTime?: number;
    dataSize?: number;
    complexity?: number;
    renderMode?: string;
  }): void {
    if (!this.trackRenderingEnabled) return;

    this.tracker.trackPerformance({
      metricName: 'rendering_performance',
      value: data.fps || 0,
      unit: 'fps',
      context: {
        dataSize: data.dataSize,
        complexity: data.complexity,
        renderMode: data.renderMode,
      },
    });
  }

  /**
   * 追踪点云加载性能
   */
  trackPointCloudLoading(data: {
    loadTime: number;
    pointCount: number;
    fileSize: number;
    success: boolean;
  }): void {
    const loadingMetadata = {
      toolType: 'pc-tool',
      pointCount: data.pointCount,
      fileSize: data.fileSize,
    };

    this.tracker.trackToolEfficiency({
      toolAction: 'point_cloud_loading',
      startTime: Date.now() - data.loadTime,
      endTime: Date.now(),
      duration: data.loadTime,
      success: data.success,
      metadata: loadingMetadata,
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
    const saveMetadata = {
      toolType: 'pc-tool',
      annotationCount: data.annotationCount,
    };

    this.tracker.trackToolEfficiency({
      toolAction: 'annotation_save',
      startTime: Date.now() - data.saveTime,
      endTime: Date.now(),
      duration: data.saveTime,
      success: data.success,
      errorReason: data.errorMessage,
      metadata: saveMetadata,
    });
  }

  /**
   * 开始用户交互监控
   */
  private startUserInteractionMonitoring(): void {
    this.addEventListeners();
  }

  /**
   * 测量渲染性能
   */
  private measureRenderingPerformance(): void {
    if (!this.isMonitoring) return;

    const now = performance.now();
    if (this.lastRenderTime > 0) {
      const deltaTime = now - this.lastRenderTime;
      const fps = 1000 / deltaTime;
      
      this.trackRenderingPerformance({
        fps: Math.round(fps * 100) / 100,
      });

      this.frameCount++;
    }
    this.lastRenderTime = now;
  }

  /**
   * 添加事件监听器
   */
  private addEventListeners(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.onUserClick);
      document.addEventListener('keydown', this.onUserKeydown);
    }
  }

  /**
   * 移除事件监听器
   */
  private removeEventListeners(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this.onUserClick);
      document.removeEventListener('keydown', this.onUserKeydown);
    }
  }

  /**
   * 处理用户点击事件
   */
  private onUserClick = (event: MouseEvent): void => {
    this.trackUserInteraction('click', {
      element: (event.target as HTMLElement)?.tagName || 'unknown',
      position: { x: event.clientX, y: event.clientY },
    });
  };

  /**
   * 处理用户键盘事件
   */
  private onUserKeydown = (event: KeyboardEvent): void => {
    this.trackUserInteraction('keydown', {
      element: (event.target as HTMLElement)?.tagName || 'unknown',
    });
  };

  /**
   * 停止追踪
   */
  stop(): void {
    this.stopRenderingMonitoring();
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    return {
      frameCount: this.frameCount,
      isMonitoring: this.isMonitoring,
      lastRenderTime: this.lastRenderTime,
    };
  }
} 