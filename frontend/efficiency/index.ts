// Image Tool 效率监控集成模块

import { EfficiencyTracker, createTracker } from './core/EfficiencyTracker';
import { ImageToolIntegration } from './integrations/ImageToolIntegration';
import { EfficiencyTrackerConfig } from './types/config';

export class ImageToolEfficiencyManager {
  private tracker: EfficiencyTracker | null = null;
  private integration: ImageToolIntegration | null = null;
  private isInitialized = false;

  // 配置
  private config: Partial<EfficiencyTrackerConfig> = {
    apiEndpoint: '/efficiency/api/v1',
    toolType: 'image-tool',
    batchSize: 50,
    flushInterval: 30000, // 30秒
    maxRetries: 2, // 减少重试次数
    retryDelay: 2000, // 2秒
    performanceMonitoring: {
      enabled: true,
      samplingRate: 1.0,
      metricsInterval: 5000,
      captureUserInteractions: true,
      captureErrors: true,
      capturePerformance: true,
    },
    storage: {
      enabled: true,
      maxSize: 10 * 1024 * 1024, // 10MB
      storageKey: 'xtreme1-efficiency-tracker',
      clearOnStart: false,
    },
    debug: {
      enabled: typeof window !== 'undefined' && window.location.hostname === 'localhost',
      logLevel: 'info',
      logToConsole: true,
      logToServer: false,
    },
  };

  /**
   * 初始化效率监控
   */
  async initialize(options: {
    userId: string;
    projectId: string;
    taskId: string;
    customConfig?: Partial<EfficiencyTrackerConfig>;
  }): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const finalConfig = options.customConfig || {
        userId: options.userId || '',
        projectId: options.projectId || '',
        taskId: options.taskId || '',
      };

      // 使用默认值，如果参数为空
      // 注意：在生产环境中，这些应该被实际的用户、项目和任务ID替换
      if (!finalConfig.userId || !finalConfig.projectId || !finalConfig.taskId) {
        finalConfig.userId = finalConfig.userId || 'temp_user_001';
        finalConfig.projectId = finalConfig.projectId || 'temp_project_001';
        finalConfig.taskId = finalConfig.taskId || 'temp_task_001';
      }

      // 确保 apiEndpoint 有值
      const mergedConfig = {
        ...this.config,
        ...finalConfig,
        apiEndpoint: this.config.apiEndpoint || '/efficiency/api/v1',
      } as EfficiencyTrackerConfig;

      // 创建追踪器
      this.tracker = createTracker({
        config: mergedConfig,
        onError: (error) => {
          // 错误处理回调
        },
        onFlush: (events) => {
          // 数据刷新回调
        },
        onStatusChange: (status) => {
          // 状态变化回调
        }
      });

      // 创建集成模块
      this.integration = new ImageToolIntegration({
        tracker: this.tracker,
        enableAutoTracking: true,
        trackImageOperations: true,
        trackUserInteractions: true,
        trackAnnotationEvents: true,
      });

      // 启动追踪
      await this.tracker.start();
      
      this.isInitialized = true;
    } catch (error) {
      // 初始化失败时的错误处理
      throw error;
    }
  }

  /**
   * 追踪标注开始
   */
  trackAnnotationStart(annotationType: string, data: {
    timestamp: number;
    toolType: string;
    mode: string;
    metadata?: Record<string, any>;
  }): void {
    if (!this.tracker) {
      return;
    }

    this.tracker.trackAnnotation({
      action: 'start',
      annotationType: annotationType as any,
      timestamp: data.timestamp,
      metadata: data.metadata,
    });
  }

  /**
   * 追踪标注结束
   */
  trackAnnotationEnd(annotationType: string, data: {
    timestamp: number;
    startTime: number;
    success: boolean;
    metadata?: Record<string, any>;
  }): void {
    if (!this.tracker) {
      return;
    }

    this.tracker.trackAnnotation({
      action: 'complete',
      annotationType: annotationType as any,
      timestamp: data.timestamp,
      duration: data.timestamp - data.startTime,
      metadata: data.metadata,
    });
  }

  /**
   * 追踪标注完成
   */
  trackAnnotationComplete(annotationType: string, data: {
    timestamp: number;
    startTime: number;
    objectId?: string;
    metadata?: Record<string, any>;
  }): void {
    if (!this.tracker) {
      return;
    }

    this.tracker.trackAnnotation({
      action: 'complete',
      annotationType: annotationType as any,
      timestamp: data.timestamp,
      objectId: data.objectId,
      duration: data.timestamp - data.startTime,
      metadata: data.metadata,
    });
  }

  /**
   * 追踪用户交互
   */
  trackInteraction(interactionType: string, data: {
    timestamp: number;
    position?: { x: number; y: number };
    metadata?: Record<string, any>;
  }): void {
    if (!this.tracker) {
      return;
    }

    this.tracker.trackUserInteraction({
      action: interactionType as any,
      element: 'annotation-tool',
      timestamp: data.timestamp,
      position: data.position,
    });
  }

  /**
   * 追踪AI操作
   */
  trackAIOperation(operation: string, data: {
    timestamp: number;
    startTime?: number;
    success?: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): void {
    if (!this.tracker) {
      return;
    }

    this.tracker.trackBackendComputation({
      computationType: 'auto_annotation',
      status: data.success === false ? 'error' : 'complete',
      timestamp: data.timestamp,
      duration: data.startTime ? data.timestamp - data.startTime : undefined,
      errorMessage: data.errorMessage,
      computationId: `${operation}-${Date.now()}`,
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
    this.integration?.trackImageLoad(data);
  }

  /**
   * 追踪标注操作
   */
  trackAnnotation(action: 'start' | 'complete' | 'modify' | 'delete', data: {
    annotationType: 'rectangle' | 'polygon' | 'polyline' | 'point' | 'classification';
    objectId?: string;
    duration?: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.integration) return;

    switch (data.annotationType) {
      case 'rectangle':
        this.integration.trackRectangleAnnotation(action, {
          objectId: data.objectId,
          duration: data.duration,
          metadata: data.metadata,
        });
        break;
      case 'polygon':
        this.integration.trackPolygonAnnotation(action, {
          objectId: data.objectId,
          duration: data.duration,
          metadata: data.metadata,
        });
        break;
      case 'polyline':
        this.integration.trackPolylineAnnotation(action, {
          objectId: data.objectId,
          duration: data.duration,
          metadata: data.metadata,
        });
        break;
      case 'point':
        this.integration.trackPointAnnotation(action, {
          objectId: data.objectId,
          duration: data.duration,
          metadata: data.metadata,
        });
        break;
      case 'classification':
        this.integration.trackClassificationAnnotation(action, {
          objectId: data.objectId,
          duration: data.duration,
          metadata: data.metadata,
        });
        break;
    }
  }

  /**
   * 追踪工具切换
   */
  trackToolSwitch(fromTool: string, toTool: string, duration?: number): void {
    this.integration?.trackToolSwitch(fromTool, toTool, duration);
  }

  /**
   * 追踪图像操作
   */
  trackImageOperation(operation: 'zoom' | 'pan', data: any): void {
    if (!this.integration) return;

    switch (operation) {
      case 'zoom':
        this.integration.trackImageZoom(data);
        break;
      case 'pan':
        this.integration.trackImagePan(data);
        break;
    }
  }

  /**
   * 追踪保存操作
   */
  trackSaveOperation(data: {
    annotationCount: number;
    saveTime: number;
    success: boolean;
    errorMessage?: string;
  }): void {
    this.integration?.trackAnnotationSave(data);
  }

  /**
   * 追踪任务状态变化
   */
  trackTaskStatus(status: 'started' | 'paused' | 'resumed' | 'completed' | 'submitted', data?: {
    timeSpent?: number;
    completionPercentage?: number;
    qualityScore?: number;
  }): void {
    this.tracker?.trackTaskStatus({
      status,
      timeSpent: data?.timeSpent,
      completionPercentage: data?.completionPercentage,
      qualityScore: data?.qualityScore,
    });
  }

  /**
   * 追踪错误
   */
  trackError(error: {
    errorType: 'runtime' | 'network' | 'validation' | 'ui' | 'performance';
    message: string;
    stack?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, any>;
  }): void {
    this.tracker?.trackError(error);
  }

  /**
   * 追踪性能指标
   */
  trackPerformance(metricName: string, value: number, unit: 'ms' | 'fps' | 'mb' | 'count', context?: Record<string, any>): void {
    this.tracker?.trackPerformance({
      metricName,
      value,
      unit,
      context,
    });
  }

  /**
   * 手动刷新数据
   */
  async flush(): Promise<void> {
    await this.tracker?.flush();
  }

  /**
   * 销毁追踪器
   */
  async destroy(): Promise<void> {
    if (this.integration) {
      this.integration.destroy();
      this.integration = null;
    }

    if (this.tracker) {
      await this.tracker.stop();
      this.tracker = null;
    }

    this.isInitialized = false;
  }

  /**
   * 检查是否已初始化
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取追踪器实例
   */
  get trackerInstance(): EfficiencyTracker | null {
    return this.tracker;
  }
}

// 创建全局单例
export const imageToolEfficiency = new ImageToolEfficiencyManager();

// 默认导出
export default imageToolEfficiency; 