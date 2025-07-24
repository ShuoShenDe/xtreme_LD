// 效率监控集成示例
// 这个文件展示了如何在 Image Tool 的各个组件中集成 EFFM

import { useEfficiency, createAnnotationTracker, createPerformanceTracker } from './useEfficiency';
import { autoInitializeEfficiency } from './init';

/* ========================================
 * 示例 1: 在主编辑器 (Editor.vue) 中使用
 * ======================================== */

export function useEditorEfficiency() {
  const efficiency = useEfficiency();
  const performanceTracker = createPerformanceTracker();

  // 在 onMounted 中初始化
  const initializeEditor = async () => {
    // 自动初始化 EFFM
    const initialized = await autoInitializeEfficiency();
    
    if (initialized) {
      // 记录编辑器初始化完成
      efficiency.trackTaskStatus('started', {
        timeSpent: 0,
        completionPercentage: 0,
      });
    }
  };

  // 追踪图像加载
  const trackImageLoadExample = async (imageFile: File) => {
    const startTime = Date.now();
    
    try {
      // 假设的图像加载逻辑
      const image = await loadImage(imageFile);
      const loadTime = Date.now() - startTime;
      
      efficiency.trackImageLoad({
        fileName: imageFile.name,
        fileSize: imageFile.size,
        imageWidth: image.width,
        imageHeight: image.height,
        loadTime,
        success: true,
      });
      
      return image;
    } catch (error) {
      const loadTime = Date.now() - startTime;
      
      efficiency.trackImageLoad({
        fileName: imageFile.name,
        fileSize: imageFile.size,
        imageWidth: 0,
        imageHeight: 0,
        loadTime,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  };

  return {
    initializeEditor,
    trackImageLoadExample,
    efficiency,
    performanceTracker,
  };
}

/* ========================================
 * 示例 2: 在标注工具中使用
 * ======================================== */

export function useAnnotationToolEfficiency() {
  const efficiency = useEfficiency();
  const annotationTracker = createAnnotationTracker();

  // 开始创建矩形标注
  const startRectangleAnnotation = () => {
    annotationTracker.startAnnotation('rectangle');
    
    // 或者使用 efficiency 直接追踪
    efficiency.trackAnnotation('start', {
      annotationType: 'rectangle',
      metadata: {
        toolType: 'rectangle',
        startTime: Date.now(),
      },
    });
  };

  // 完成矩形标注
  const completeRectangleAnnotation = (objectId: string, bounds: { x: number; y: number; width: number; height: number }) => {
    annotationTracker.completeAnnotation('rectangle', objectId, {
      bounds,
      area: bounds.width * bounds.height,
    });
  };

  // 工具切换
  const switchTool = (fromTool: string, toTool: string) => {
    efficiency.trackToolSwitch(fromTool, toTool);
  };

  return {
    startRectangleAnnotation,
    completeRectangleAnnotation,
    switchTool,
    isAnnotating: annotationTracker.isAnnotating,
  };
}

/* ========================================
 * 示例 3: 在图像视图中使用
 * ======================================== */

export function useImageViewEfficiency() {
  const efficiency = useEfficiency();

  // 追踪图像缩放
  const trackZoom = (fromScale: number, toScale: number, duration?: number) => {
    efficiency.trackImageOperation('zoom', {
      fromScale,
      toScale,
      duration,
    });
  };

  // 追踪图像平移
  const trackPan = (startPos: { x: number; y: number }, endPos: { x: number; y: number }, duration?: number) => {
    efficiency.trackImageOperation('pan', {
      startPosition: startPos,
      endPosition: endPos,
      duration,
    });
  };

  // 追踪性能指标
  const trackRenderPerformance = (renderTime: number, objectCount: number) => {
    efficiency.trackPerformance('render_time', renderTime, 'ms', {
      objectCount,
      timestamp: Date.now(),
    });
  };

  return {
    trackZoom,
    trackPan,
    trackRenderPerformance,
  };
}

/* ========================================
 * 示例 4: 在保存/提交操作中使用
 * ======================================== */

export function useSaveEfficiency() {
  const efficiency = useEfficiency();
  const performanceTracker = createPerformanceTracker();

  // 追踪保存操作
  const trackSave = async (annotations: any[]) => {
    const result = await performanceTracker.measureTime(
      'annotation_save',
      async () => {
        // 假设的保存逻辑
        return await saveAnnotations(annotations);
      }
    );

    efficiency.trackSaveOperation({
      annotationCount: annotations.length,
      saveTime: 0, // measureTime 已经处理了时间追踪
      success: true,
    });

    return result;
  };

  // 追踪任务提交
  const trackSubmit = async (taskData: any) => {
    try {
      const result = await performanceTracker.measureTime(
        'task_submit',
        async () => {
          return await submitTask(taskData);
        }
      );

      efficiency.trackTaskStatus('submitted', {
        timeSpent: taskData.timeSpent,
        completionPercentage: 100,
        qualityScore: taskData.qualityScore,
      });

      return result;
    } catch (error) {
      efficiency.trackError({
        errorType: 'network',
        message: error instanceof Error ? error.message : String(error),
        severity: 'high',
        context: { operation: 'task_submit' },
      });
      throw error;
    }
  };

  return {
    trackSave,
    trackSubmit,
  };
}

/* ========================================
 * 示例 5: 错误处理和性能监控
 * ======================================== */

export function useErrorTrackingEfficiency() {
  const efficiency = useEfficiency();

  // 全局错误处理
  const trackGlobalError = (error: Error, context?: Record<string, any>) => {
    efficiency.trackError({
      errorType: 'runtime',
      message: error.message,
      stack: error.stack,
      severity: 'medium',
      context: {
        ...context,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      },
    });
  };

  // 网络错误追踪
  const trackNetworkError = (url: string, status: number, error: string) => {
    efficiency.trackError({
      errorType: 'network',
      message: `Network error: ${status} - ${error}`,
      severity: 'high',
      context: {
        url,
        status,
        timestamp: Date.now(),
      },
    });
  };

  // 性能警告追踪
  const trackPerformanceWarning = (operation: string, duration: number, threshold: number) => {
    if (duration > threshold) {
      efficiency.trackError({
        errorType: 'performance',
        message: `${operation} took ${duration}ms (threshold: ${threshold}ms)`,
        severity: 'medium',
        context: {
          operation,
          duration,
          threshold,
          timestamp: Date.now(),
        },
      });
    }
  };

  return {
    trackGlobalError,
    trackNetworkError,
    trackPerformanceWarning,
  };
}

// 辅助函数 (这些需要根据实际的 image-tool 代码实现)
async function loadImage(file: File): Promise<{ width: number; height: number }> {
  // 这里是假设的实现
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = URL.createObjectURL(file);
  });
}

async function saveAnnotations(annotations: any[]): Promise<any> {
  // 这里是假设的实现
  return fetch('/api/annotations', {
    method: 'POST',
    body: JSON.stringify(annotations),
  });
}

async function submitTask(taskData: any): Promise<any> {
  // 这里是假设的实现
  return fetch('/api/tasks/submit', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
} 