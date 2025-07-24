// Vue Composable Hook for 效率监控

import { ref, computed, onBeforeUnmount } from 'vue';
import imageToolEfficiency, { ImageToolEfficiencyManager } from './index';

export interface UseEfficiencyOptions {
  autoInitialize?: boolean;
  userId?: string;
  projectId?: string;
  taskId?: string;
}

export function useEfficiency(options: UseEfficiencyOptions = {}) {
  const isInitialized = ref(imageToolEfficiency.initialized);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * 初始化效率监控
   */
  const initializeEfficiency = async (config?: {
    userId: string;
    projectId: string;
    taskId: string;
  }) => {
    if (isInitialized.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      const finalConfig = config || {
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

      await imageToolEfficiency.initialize(finalConfig);
      isInitialized.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '初始化失败';
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 追踪图像加载
   */
  const trackImageLoad = (data: {
    fileName: string;
    fileSize: number;
    imageWidth: number;
    imageHeight: number;
    loadTime: number;
    success: boolean;
    errorMessage?: string;
  }) => {
    if (!isInitialized.value) return;
    imageToolEfficiency.trackImageLoad(data);
  };

  /**
   * 追踪标注操作
   */
  const trackAnnotation = (
    action: 'start' | 'complete' | 'modify' | 'delete',
    data: {
      annotationType: 'rectangle' | 'polygon' | 'polyline' | 'point' | 'classification';
      objectId?: string;
      duration?: number;
      metadata?: Record<string, any>;
    }
  ) => {
    if (!isInitialized.value) return;
    imageToolEfficiency.trackAnnotation(action, data);
  };

  /**
   * 追踪工具切换
   */
  const trackToolSwitch = (fromTool: string, toTool: string, duration?: number) => {
    if (!isInitialized.value) return;
    imageToolEfficiency.trackToolSwitch(fromTool, toTool, duration);
  };

  /**
   * 追踪图像操作
   */
  const trackImageOperation = (operation: 'zoom' | 'pan', data: any) => {
    if (!isInitialized.value) return;
    imageToolEfficiency.trackImageOperation(operation, data);
  };

  /**
   * 追踪保存操作
   */
  const trackSaveOperation = (data: {
    annotationCount: number;
    saveTime: number;
    success: boolean;
    errorMessage?: string;
  }) => {
    if (!isInitialized.value) return;
    imageToolEfficiency.trackSaveOperation(data);
  };

  /**
   * 追踪任务状态
   */
  const trackTaskStatus = (
    status: 'started' | 'paused' | 'resumed' | 'completed' | 'submitted',
    data?: {
      timeSpent?: number;
      completionPercentage?: number;
      qualityScore?: number;
    }
  ) => {
    if (!isInitialized.value) return;
    imageToolEfficiency.trackTaskStatus(status, data);
  };

  /**
   * 追踪错误
   */
  const trackError = (error: {
    errorType: 'runtime' | 'network' | 'validation' | 'ui' | 'performance';
    message: string;
    stack?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context?: Record<string, any>;
  }) => {
    if (!isInitialized.value) return;
    imageToolEfficiency.trackError(error);
  };

  /**
   * 追踪性能指标
   */
  const trackPerformance = (
    metricName: string,
    value: number,
    unit: 'ms' | 'fps' | 'mb' | 'count',
    context?: Record<string, any>
  ) => {
    if (!isInitialized.value) return;
    imageToolEfficiency.trackPerformance(metricName, value, unit, context);
  };

  /**
   * 手动刷新数据
   */
  const flushData = async () => {
    if (!isInitialized.value) return;
    await imageToolEfficiency.flush();
  };

  /**
   * 销毁追踪器
   */
  const destroyEfficiency = async () => {
    await imageToolEfficiency.destroy();
    isInitialized.value = false;
  };

  // 自动初始化
  if (options.autoInitialize && options.userId && options.projectId && options.taskId) {
    initializeEfficiency({
      userId: options.userId,
      projectId: options.projectId,
      taskId: options.taskId,
    });
  }

  // 组件卸载时清理
  onBeforeUnmount(() => {
    // 注意：这里不自动销毁，因为可能在其他组件中还在使用
    // 如果需要销毁，请手动调用 destroyEfficiency()
  });

  return {
    // 状态
    isInitialized,
    isLoading,
    error,

    // 方法
    initializeEfficiency,
    destroyEfficiency,
    flushData,

    // 追踪方法
    trackImageLoad,
    trackAnnotation,
    trackToolSwitch,
    trackImageOperation,
    trackSaveOperation,
    trackTaskStatus,
    trackError,
    trackPerformance,

    // 追踪器实例（用于高级用法）
    trackerInstance: imageToolEfficiency.trackerInstance,
  };
}

// 辅助函数：创建标注追踪器
export function createAnnotationTracker() {
  const { trackAnnotation } = useEfficiency();
  const annotationStartTime = ref<number | null>(null);

  const startAnnotation = (type: 'rectangle' | 'polygon' | 'polyline' | 'point' | 'classification', objectId?: string) => {
    annotationStartTime.value = Date.now();
    trackAnnotation('start', {
      annotationType: type,
      objectId,
      metadata: { startTime: annotationStartTime.value },
    });
  };

  const completeAnnotation = (type: 'rectangle' | 'polygon' | 'polyline' | 'point' | 'classification', objectId?: string, metadata?: Record<string, any>) => {
    const duration = annotationStartTime.value ? Date.now() - annotationStartTime.value : undefined;
    trackAnnotation('complete', {
      annotationType: type,
      objectId,
      duration,
      metadata: { ...metadata, completedAt: Date.now() },
    });
    annotationStartTime.value = null;
  };

  const cancelAnnotation = (type: 'rectangle' | 'polygon' | 'polyline' | 'point' | 'classification', objectId?: string) => {
    trackAnnotation('delete', {
      annotationType: type,
      objectId,
      metadata: { cancelled: true, cancelledAt: Date.now() },
    });
    annotationStartTime.value = null;
  };

  return {
    startAnnotation,
    completeAnnotation,
    cancelAnnotation,
    isAnnotating: computed(() => annotationStartTime.value !== null),
  };
}

// 辅助函数：创建性能追踪器
export function createPerformanceTracker() {
  const { trackPerformance } = useEfficiency();

  const measureTime = <T>(
    operation: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    const startTime = Date.now();
    return asyncFn().then(
      (result) => {
        const duration = Date.now() - startTime;
        trackPerformance(operation, duration, 'ms', { success: true });
        return result;
      },
      (error) => {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        trackPerformance(operation, duration, 'ms', { success: false, error: errorMessage });
        throw error;
      }
    );
  };

  const measureTimeSync = <T>(
    operation: string,
    syncFn: () => T
  ): T => {
    const startTime = Date.now();
    try {
      const result = syncFn();
      const duration = Date.now() - startTime;
      trackPerformance(operation, duration, 'ms', { success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      trackPerformance(operation, duration, 'ms', { success: false, error: errorMessage });
      throw error;
    }
  };

  return {
    measureTime,
    measureTimeSync,
    trackPerformance,
  };
}

export default useEfficiency; 