/**
 * Image Tool ISS Annotation EFFM Integration Example
 * 
 * This file demonstrates how to integrate EFFM tracking into ISS annotation workflows
 * in the image-tool application. It shows real-world usage patterns for tracking
 * efficiency metrics during 2D ISS (Instance Semantic Segmentation) operations.
 */

import { ref, onMounted, computed } from 'vue';
import { useEfficiency } from './useEfficiency';
import { ImageToolEfficiencyManager } from './index';

// ========================================
// 1. Editor Component Integration Example
// ========================================

/**
 * Example: Main Editor Component with EFFM Integration
 * This shows how to integrate EFFM into the main editor component
 */
export function useEditorWithEfficiency() {
  const { initializeEfficiency, trackEvent } = useEfficiency();
  const isInitialized = ref(false);
  
  // Initialize EFFM when editor component mounts
  onMounted(async () => {
    try {
      await initializeEfficiency();
      isInitialized.value = true;
      
      // Track editor initialization
      trackEvent('editor_initialized', {
        timestamp: Date.now(),
        toolType: 'image-tool',
        mode: 'iss_annotation',
        features: ['unified_mask', 'ai_assistance', 'multi_instance']
      });
    } catch (error) {
      // 初始化失败处理
    }
  });
  
  return {
    isInitialized: computed(() => isInitialized.value),
    trackEvent
  };
}

// ========================================
// 2. ISS Tool Integration Example
// ========================================

/**
 * Example: ISS Tool with Comprehensive Efficiency Tracking
 * This shows how to integrate EFFM into the ISS annotation tool
 */
export class IssToolEfficiencyIntegration {
  private efficiencyManager: ImageToolEfficiencyManager;
  private annotationStartTime: number = 0;
  private pointAdditionTimes: number[] = [];
  
  constructor() {
    this.efficiencyManager = ImageToolEfficiencyManager.getInstance();
  }
  
  /**
   * Track ISS annotation start
   */
  startAnnotation(toolType: 'iss' | 'iss-rect' = 'iss') {
    this.annotationStartTime = Date.now();
    this.pointAdditionTimes = [];
    
    this.efficiencyManager.trackAnnotationStart('ISS', {
      timestamp: this.annotationStartTime,
      toolType,
      mode: 'draw',
      sessionId: this.generateSessionId()
    });
  }
  
  /**
   * Track point addition during annotation
   */
  addPoint(point: { x: number; y: number }, pointIndex: number) {
    const pointTime = Date.now();
    this.pointAdditionTimes.push(pointTime);
    
    this.efficiencyManager.trackInteraction('point_added', {
      timestamp: pointTime,
      toolType: 'iss',
      pointIndex,
      coordinates: point,
      timeSinceLastPoint: pointIndex > 0 ? pointTime - this.pointAdditionTimes[pointIndex - 1] : 0
    });
  }
  
  /**
   * Track successful annotation completion
   */
  completeAnnotation(annotationData: {
    pointCount: number;
    area: number;
    instanceId: number;
    classId: string;
  }) {
    const duration = Date.now() - this.annotationStartTime;
    
    this.efficiencyManager.trackAnnotationComplete('ISS', {
      timestamp: Date.now(),
      duration,
      pointCount: annotationData.pointCount,
      area: annotationData.area,
      instanceId: annotationData.instanceId,
      classId: annotationData.classId,
      averagePointTime: duration / annotationData.pointCount,
      efficiency: this.calculateAnnotationEfficiency(duration, annotationData.pointCount)
    });
  }
  
  /**
   * Track annotation cancellation
   */
  cancelAnnotation(reason: string) {
    const duration = Date.now() - this.annotationStartTime;
    
    this.efficiencyManager.trackAnnotationEnd('ISS', {
      timestamp: Date.now(),
      duration,
      pointCount: this.pointAdditionTimes.length,
      completed: false,
      reason,
      wastageTime: duration
    });
  }
  
  /**
   * Calculate annotation efficiency score
   */
  private calculateAnnotationEfficiency(duration: number, pointCount: number): number {
    // Efficiency score based on points per second
    const pointsPerSecond = pointCount / (duration / 1000);
    // Normalize to 0-1 scale (assuming 3 points/second is excellent)
    return Math.min(pointsPerSecond / 3, 1);
  }
  
  /**
   * Generate unique session ID for tracking
   */
  private generateSessionId(): string {
    return `iss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ========================================
// 3. AI-Assisted ISS Tool Integration
// ========================================

/**
 * Example: AI-Assisted ISS Tool with Performance Tracking
 * This shows how to track AI operations and their efficiency
 */
export class IssRectAIEfficiencyIntegration {
  private efficiencyManager: ImageToolEfficiencyManager;
  private aiOperationStartTime: number = 0;
  
  constructor() {
    this.efficiencyManager = ImageToolEfficiencyManager.getInstance();
  }
  
  /**
   * Track AI operation start
   */
  startAIOperation(rectBounds: { x: number; y: number; width: number; height: number }) {
    this.aiOperationStartTime = Date.now();
    
    this.efficiencyManager.trackAIOperation('segmentation_start', {
      timestamp: this.aiOperationStartTime,
      toolType: 'iss-rect',
      inputType: 'rectangle',
      rectBounds,
      expectedProcessingTime: this.estimateProcessingTime(rectBounds)
    });
  }
  
  /**
   * Track AI operation success
   */
  aiOperationSuccess(results: { objectCount: number; averageConfidence: number }) {
    const duration = Date.now() - this.aiOperationStartTime;
    
    this.efficiencyManager.trackAIOperation('segmentation_success', {
      timestamp: Date.now(),
      duration,
      toolType: 'iss-rect',
      objectCount: results.objectCount,
      averageConfidence: results.averageConfidence,
      efficiency: this.calculateAIEfficiency(duration, results.objectCount),
      timePerObject: duration / results.objectCount
    });
  }
  
  /**
   * Track AI operation error
   */
  aiOperationError(error: string, stage: 'model_call' | 'result_processing' | 'conversion') {
    const duration = Date.now() - this.aiOperationStartTime;
    
    this.efficiencyManager.trackAIOperation('segmentation_error', {
      timestamp: Date.now(),
      duration,
      toolType: 'iss-rect',
      error,
      stage,
      wastageTime: duration
    });
  }
  
  /**
   * Estimate processing time based on rectangle size
   */
  private estimateProcessingTime(rectBounds: { width: number; height: number }): number {
    const area = rectBounds.width * rectBounds.height;
    // Rough estimation: 1ms per 1000 pixels
    return Math.max(area / 1000, 500); // Minimum 500ms
  }
  
  /**
   * Calculate AI efficiency score
   */
  private calculateAIEfficiency(duration: number, objectCount: number): number {
    // Efficiency based on objects per second
    const objectsPerSecond = objectCount / (duration / 1000);
    // Normalize to 0-1 scale (assuming 2 objects/second is excellent)
    return Math.min(objectsPerSecond / 2, 1);
  }
}

// ========================================
// 4. Save/Load Operations Integration
// ========================================

/**
 * Example: Save/Load Operations with Performance Tracking
 * This shows how to track data persistence operations
 */
export class SaveLoadEfficiencyIntegration {
  private efficiencyManager: ImageToolEfficiencyManager;
  
  constructor() {
    this.efficiencyManager = ImageToolEfficiencyManager.getInstance();
  }
  
  /**
   * Track save operation
   */
  async trackSaveOperation<T>(operation: () => Promise<T>, metadata: {
    objectCount: number;
    issObjectCount: number;
    hasUnifiedMask: boolean;
  }): Promise<T> {
    const startTime = Date.now();
    
    this.efficiencyManager.trackSaveOperation('save_start', {
      timestamp: startTime,
      ...metadata
    });
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.efficiencyManager.trackSaveOperation('save_success', {
        timestamp: Date.now(),
        duration,
        ...metadata,
        efficiency: this.calculateSaveEfficiency(duration, metadata.objectCount)
      });
      
      return result;
    } catch (error) {
      this.efficiencyManager.trackError('save_failed', {
        timestamp: Date.now(),
        error: error.message,
        duration: Date.now() - startTime,
        ...metadata
      });
      throw error;
    }
  }
  
  /**
   * Track load operation
   */
  async trackLoadOperation<T>(operation: () => Promise<T>, metadata: {
    objectCount: number;
    issObjectCount: number;
  }): Promise<T> {
    const startTime = Date.now();
    
    this.efficiencyManager.trackLoadOperation('load_start', {
      timestamp: startTime,
      ...metadata
    });
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.efficiencyManager.trackLoadOperation('load_success', {
        timestamp: Date.now(),
        duration,
        ...metadata,
        efficiency: this.calculateLoadEfficiency(duration, metadata.objectCount)
      });
      
      return result;
    } catch (error) {
      this.efficiencyManager.trackError('load_failed', {
        timestamp: Date.now(),
        error: error.message,
        duration: Date.now() - startTime,
        ...metadata
      });
      throw error;
    }
  }
  
  /**
   * Calculate save efficiency
   */
  private calculateSaveEfficiency(duration: number, objectCount: number): number {
    // Efficiency based on objects per second
    const objectsPerSecond = objectCount / (duration / 1000);
    // Normalize to 0-1 scale (assuming 10 objects/second is excellent)
    return Math.min(objectsPerSecond / 10, 1);
  }
  
  /**
   * Calculate load efficiency
   */
  private calculateLoadEfficiency(duration: number, objectCount: number): number {
    // Efficiency based on objects per second
    const objectsPerSecond = objectCount / (duration / 1000);
    // Normalize to 0-1 scale (assuming 20 objects/second is excellent for loading)
    return Math.min(objectsPerSecond / 20, 1);
  }
}

// ========================================
// 5. Vue Component Integration Example
// ========================================

/**
 * Example: Vue Component with EFFM Integration
 * This shows how to use EFFM in a Vue component
 */
export function useIssAnnotationComponent() {
  const { trackEvent } = useEfficiency();
  const issToolIntegration = new IssToolEfficiencyIntegration();
  const aiIntegration = new IssRectAIEfficiencyIntegration();
  
  // Component state
  const isAnnotating = ref(false);
  const currentTool = ref<'iss' | 'iss-rect'>('iss');
  
  // Methods
  const startAnnotation = () => {
    isAnnotating.value = true;
    issToolIntegration.startAnnotation(currentTool.value);
    
    // Track UI interaction
    trackEvent('annotation_started', {
      timestamp: Date.now(),
      toolType: currentTool.value,
      userAction: 'button_click'
    });
  };
  
  const addPoint = (point: { x: number; y: number }, index: number) => {
    issToolIntegration.addPoint(point, index);
  };
  
  const completeAnnotation = (data: any) => {
    isAnnotating.value = false;
    issToolIntegration.completeAnnotation(data);
    
    // Track completion
    trackEvent('annotation_completed', {
      timestamp: Date.now(),
      toolType: currentTool.value,
      success: true
    });
  };
  
  const cancelAnnotation = (reason: string) => {
    isAnnotating.value = false;
    issToolIntegration.cancelAnnotation(reason);
    
    // Track cancellation
    trackEvent('annotation_cancelled', {
      timestamp: Date.now(),
      toolType: currentTool.value,
      reason
    });
  };
  
  const switchTool = (newTool: 'iss' | 'iss-rect') => {
    const oldTool = currentTool.value;
    currentTool.value = newTool;
    
    // Track tool switch
    trackEvent('tool_switched', {
      timestamp: Date.now(),
      fromTool: oldTool,
      toTool: newTool,
      userAction: 'toolbar_click'
    });
  };
  
  return {
    isAnnotating,
    currentTool,
    startAnnotation,
    addPoint,
    completeAnnotation,
    cancelAnnotation,
    switchTool,
    // Integration instances for advanced usage
    issToolIntegration,
    aiIntegration
  };
}

// ========================================
// 6. Performance Monitoring Utilities
// ========================================

/**
 * Utility functions for performance monitoring
 */
export class PerformanceMonitoringUtils {
  private static efficiencyManager = ImageToolEfficiencyManager.getInstance();
  
  /**
   * Monitor function execution time
   */
  static async monitorFunction<T>(
    functionName: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.efficiencyManager.trackPerformance('function_execution', {
        timestamp: Date.now(),
        functionName,
        duration,
        success: true,
        ...metadata
      });
      
      return result;
    } catch (error) {
      this.efficiencyManager.trackError('function_execution_failed', {
        timestamp: Date.now(),
        functionName,
        error: error.message,
        duration: Date.now() - startTime,
        ...metadata
      });
      throw error;
    }
  }
  
  /**
   * Monitor memory usage
   */
  static trackMemoryUsage(context: string) {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (window.performance as any).memory;
      
      this.efficiencyManager.trackPerformance('memory_usage', {
        timestamp: Date.now(),
        context,
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryUsagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      });
    }
  }
  
  /**
   * Monitor frame rate
   */
  static trackFrameRate(context: string, fps: number) {
    this.efficiencyManager.trackPerformance('frame_rate', {
      timestamp: Date.now(),
      context,
      fps,
      quality: fps >= 30 ? 'excellent' : fps >= 20 ? 'good' : 'poor'
    });
  }
}

// ========================================
// 7. Error Handling Integration
// ========================================

/**
 * Error handling with EFFM integration
 */
export class ErrorHandlingIntegration {
  private static efficiencyManager = ImageToolEfficiencyManager.getInstance();
  
  /**
   * Track and handle errors with context
   */
  static handleError(error: Error, context: {
    operation: string;
    toolType?: string;
    objectId?: string;
    additionalData?: Record<string, any>;
  }) {
    this.efficiencyManager.trackError('application_error', {
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack,
      operation: context.operation,
      toolType: context.toolType,
      objectId: context.objectId,
      ...context.additionalData
    });
  }
  
  /**
   * Track user-reported issues
   */
  static trackUserIssue(issue: {
    type: 'bug' | 'performance' | 'usability';
    description: string;
    severity: 'low' | 'medium' | 'high';
    context?: Record<string, any>;
  }) {
    this.efficiencyManager.trackError('user_reported_issue', {
      timestamp: Date.now(),
      issueType: issue.type,
      description: issue.description,
      severity: issue.severity,
      ...issue.context
    });
  }
}

// ========================================
// 8. Comprehensive Usage Example
// ========================================

/**
 * Complete example showing integrated usage
 */
export function useCompleteIssWorkflow() {
  const { initializeEfficiency, trackEvent } = useEfficiency();
  const issIntegration = new IssToolEfficiencyIntegration();
  const aiIntegration = new IssRectAIEfficiencyIntegration();
  const saveLoadIntegration = new SaveLoadEfficiencyIntegration();
  
  // Initialize EFFM
  onMounted(async () => {
    await initializeEfficiency();
    trackEvent('workflow_started', {
      timestamp: Date.now(),
      workflow: 'iss_annotation'
    });
  });
  
  // Complete annotation workflow
  const runCompleteWorkflow = async () => {
    try {
      // 1. Start annotation
      issIntegration.startAnnotation('iss');
      
      // 2. Add points (simulated)
      for (let i = 0; i < 5; i++) {
        issIntegration.addPoint({ x: i * 10, y: i * 10 }, i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 3. Complete annotation
      issIntegration.completeAnnotation({
        pointCount: 5,
        area: 1000,
        instanceId: 12345,
        classId: 'vehicle'
      });
      
      // 4. Save results
      await saveLoadIntegration.trackSaveOperation(
        async () => {
          // Simulate save operation
          await new Promise(resolve => setTimeout(resolve, 200));
          return { success: true };
        },
        {
          objectCount: 1,
          issObjectCount: 1,
          hasUnifiedMask: true
        }
      );
      
      // 5. Track workflow completion
      trackEvent('workflow_completed', {
        timestamp: Date.now(),
        workflow: 'iss_annotation',
        success: true
      });
      
    } catch (error) {
      ErrorHandlingIntegration.handleError(error, {
        operation: 'complete_iss_workflow',
        toolType: 'iss'
      });
    }
  };
  
  return {
    runCompleteWorkflow,
    issIntegration,
    aiIntegration,
    saveLoadIntegration
  };
}

// Export all integration utilities
export {
  IssToolEfficiencyIntegration,
  IssRectAIEfficiencyIntegration,
  SaveLoadEfficiencyIntegration,
  PerformanceMonitoringUtils,
  ErrorHandlingIntegration
}; 