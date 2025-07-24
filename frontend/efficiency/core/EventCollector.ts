// 事件收集器

import { TrackerEvent, BaseEvent, AnnotationEvent, PerformanceEvent, UserInteractionEvent, BackendComputationEvent, TaskStatusEvent, ErrorEvent, ToolEfficiencyEvent } from '../types/events';
import { EfficiencyTrackerConfig } from '../types/config';
import { validateEvent, sanitizeEvent } from '../utils/validation';
import { PerformanceMonitor } from '../utils/performance';

export interface EventCollectorOptions {
  config: EfficiencyTrackerConfig;
  sessionId: string;
  performanceMonitor?: PerformanceMonitor;
}

export class EventCollector {
  private config: EfficiencyTrackerConfig;
  private sessionId: string;
  private performanceMonitor?: PerformanceMonitor;
  private eventQueue: TrackerEvent[] = [];
  private eventListeners: Map<string, Set<(event: TrackerEvent) => void>> = new Map();
  private isCollecting: boolean = false;

  constructor(options: EventCollectorOptions) {
    this.config = options.config;
    this.sessionId = options.sessionId;
    this.performanceMonitor = options.performanceMonitor;
  }

  /**
   * 开始收集事件
   */
  start(): void {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    this.setupGlobalEventListeners();
    this.log('EventCollector started');
  }

  /**
   * 停止收集事件
   */
  stop(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;
    this.removeGlobalEventListeners();
    this.log('EventCollector stopped');
  }

  /**
   * 手动收集标注事件
   */
  collectAnnotationEvent(data: Partial<AnnotationEvent>): void {
    const event: AnnotationEvent = {
      ...this.createBaseEvent(),
      type: 'annotation',
      action: data.action!,
      annotationType: data.annotationType!,
      objectId: data.objectId,
      duration: data.duration,
      position: data.position,
      metadata: data.metadata,
    };

    this.processEvent(event);
  }

  /**
   * 手动收集性能事件
   */
  collectPerformanceEvent(data: Partial<PerformanceEvent>): void {
    const event: PerformanceEvent = {
      ...this.createBaseEvent(),
      type: 'performance',
      metricName: data.metricName!,
      value: data.value!,
      unit: data.unit!,
      context: data.context,
    };

    this.processEvent(event);
  }

  /**
   * 手动收集用户交互事件
   */
  collectUserInteractionEvent(data: Partial<UserInteractionEvent>): void {
    const event: UserInteractionEvent = {
      ...this.createBaseEvent(),
      type: 'interaction',
      action: data.action!,
      element: data.element!,
      duration: data.duration,
      position: data.position,
      keyCode: data.keyCode,
      modifiers: data.modifiers,
    };

    this.processEvent(event);
  }

  /**
   * 手动收集后台计算事件
   */
  collectBackendComputationEvent(data: Partial<BackendComputationEvent>): void {
    const event: BackendComputationEvent = {
      ...this.createBaseEvent(),
      type: 'backend_computation',
      computationType: data.computationType!,
      status: data.status!,
      duration: data.duration,
      progress: data.progress,
      resultSize: data.resultSize,
      errorMessage: data.errorMessage,
      computationId: data.computationId!,
    };

    this.processEvent(event);
  }

  /**
   * 手动收集任务状态事件
   */
  collectTaskStatusEvent(data: Partial<TaskStatusEvent>): void {
    const event: TaskStatusEvent = {
      ...this.createBaseEvent(),
      type: 'task_status',
      status: data.status!,
      previousStatus: data.previousStatus,
      timeSpent: data.timeSpent,
      completionPercentage: data.completionPercentage,
      qualityScore: data.qualityScore,
    };

    this.processEvent(event);
  }

  /**
   * 手动收集错误事件
   */
  collectErrorEvent(data: Partial<ErrorEvent>): void {
    const event: ErrorEvent = {
      ...this.createBaseEvent(),
      type: 'error',
      errorType: data.errorType!,
      message: data.message!,
      stack: data.stack,
      severity: data.severity!,
      context: data.context,
    };

    this.processEvent(event);
  }

  /**
   * 手动收集工具效率事件
   */
  collectToolEfficiencyEvent(data: Partial<ToolEfficiencyEvent>): void {
    const event: ToolEfficiencyEvent = {
      ...this.createBaseEvent(),
      type: 'tool_efficiency',
      toolAction: data.toolAction!,
      startTime: data.startTime!,
      endTime: data.endTime!,
      duration: data.duration!,
      success: data.success!,
      retryCount: data.retryCount,
      errorReason: data.errorReason,
    };

    this.processEvent(event);
  }

  /**
   * 添加事件监听器
   */
  addEventListener(eventType: string, listener: (event: TrackerEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(eventType: string, listener: (event: TrackerEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }

  /**
   * 获取事件队列
   */
  getEventQueue(): TrackerEvent[] {
    return [...this.eventQueue];
  }

  /**
   * 清空事件队列
   */
  clearEventQueue(): void {
    this.eventQueue = [];
  }

  /**
   * 获取队列统计信息
   */
  getQueueStats(): {
    size: number;
    eventTypes: Record<string, number>;
    oldestEventTime: number;
    newestEventTime: number;
  } {
    const stats = {
      size: this.eventQueue.length,
      eventTypes: {} as Record<string, number>,
      oldestEventTime: 0,
      newestEventTime: 0,
    };

    if (this.eventQueue.length > 0) {
      stats.oldestEventTime = this.eventQueue[0].timestamp;
      stats.newestEventTime = this.eventQueue[this.eventQueue.length - 1].timestamp;

      this.eventQueue.forEach(event => {
        stats.eventTypes[event.type] = (stats.eventTypes[event.type] || 0) + 1;
      });
    }

    return stats;
  }

  /**
   * 创建基础事件对象
   */
  private createBaseEvent(): BaseEvent {
    return {
      eventId: this.generateEventId(),
      timestamp: Date.now(),
      userId: this.config.userId,
      projectId: this.config.projectId,
      taskId: this.config.taskId,
      toolType: this.config.toolType,
      sessionId: this.sessionId,
    };
  }

  /**
   * 处理事件
   */
  private processEvent(event: TrackerEvent): void {
    if (!this.isCollecting) {
      return;
    }

    try {
      // 数据清理
      const sanitizedEvent = sanitizeEvent(event);

      // 数据验证
      const validationResult = validateEvent(sanitizedEvent);
      if (!validationResult.isValid) {
        this.log('Event validation failed:', validationResult.errors);
        return;
      }

      // 添加到队列
      this.eventQueue.push(sanitizedEvent);

      // 触发事件监听器
      this.triggerEventListeners(sanitizedEvent);

      // 调试日志
      if (this.config.debug.enabled && this.config.debug.logLevel === 'debug') {
        this.log('Event collected:', sanitizedEvent);
      }
    } catch (error) {
      this.log('Error processing event:', error);
    }
  }

  /**
   * 触发事件监听器
   */
  private triggerEventListeners(event: TrackerEvent): void {
    // 触发特定类型的监听器
    const typeListeners = this.eventListeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          this.log('Error in event listener:', error);
        }
      });
    }

    // 触发通用监听器
    const allListeners = this.eventListeners.get('*');
    if (allListeners) {
      allListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          this.log('Error in universal event listener:', error);
        }
      });
    }
  }

  /**
   * 设置全局事件监听器
   */
  private setupGlobalEventListeners(): void {
    if (typeof window === 'undefined') return;

    // 监听错误事件
    if (this.config.performanceMonitoring.captureErrors) {
      window.addEventListener('error', this.handleGlobalError);
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    }

    // 监听用户交互事件
    if (this.config.performanceMonitoring.captureUserInteractions) {
      document.addEventListener('click', this.handleClick);
      document.addEventListener('keydown', this.handleKeydown);
      document.addEventListener('scroll', this.handleScroll);
    }

    // 监听页面生命周期事件
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * 移除全局事件监听器
   */
  private removeGlobalEventListeners(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * 处理全局错误
   */
  private handleGlobalError = (event: ErrorEvent): void => {
    this.collectErrorEvent({
      errorType: 'runtime',
      message: event.message,
      stack: event.error?.stack,
      severity: 'high',
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  };

  /**
   * 处理未处理的Promise拒绝
   */
  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    this.collectErrorEvent({
      errorType: 'runtime',
      message: event.reason?.message || 'Unhandled promise rejection',
      stack: event.reason?.stack,
      severity: 'high',
      context: {
        type: 'unhandled_rejection',
        reason: event.reason,
      },
    });
  };

  /**
   * 处理点击事件
   */
  private handleClick = (event: MouseEvent): void => {
    // 限制采样率
    if (Math.random() > this.config.performanceMonitoring.samplingRate) {
      return;
    }

    const element = event.target as HTMLElement;
    this.collectUserInteractionEvent({
      action: 'click',
      element: this.getElementSelector(element),
      position: {
        x: event.clientX,
        y: event.clientY,
      },
    });
  };

  /**
   * 处理键盘事件
   */
  private handleKeydown = (event: KeyboardEvent): void => {
    // 限制采样率
    if (Math.random() > this.config.performanceMonitoring.samplingRate) {
      return;
    }

    this.collectUserInteractionEvent({
      action: 'keyboard',
      element: this.getElementSelector(event.target as HTMLElement),
      keyCode: event.code,
      modifiers: this.getModifiers(event),
    });
  };

  /**
   * 处理滚动事件
   */
  private handleScroll = (event: Event): void => {
    // 限制采样率和频率
    if (Math.random() > this.config.performanceMonitoring.samplingRate) {
      return;
    }

    this.collectUserInteractionEvent({
      action: 'scroll',
      element: this.getElementSelector(event.target as HTMLElement),
      position: {
        x: window.scrollX,
        y: window.scrollY,
      },
    });
  };

  /**
   * 处理页面卸载事件
   */
  private handleBeforeUnload = (): void => {
    this.collectTaskStatusEvent({
      status: 'paused',
      timeSpent: Date.now() - this.sessionStartTime,
    });
  };

  /**
   * 处理页面可见性变化
   */
  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.collectTaskStatusEvent({
        status: 'paused',
        timeSpent: Date.now() - this.sessionStartTime,
      });
    } else {
      this.collectTaskStatusEvent({
        status: 'resumed',
      });
    }
  };

  /**
   * 获取元素选择器
   */
  private getElementSelector(element: HTMLElement): string {
    if (!element) return 'unknown';

    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      // 确保className是字符串类型，兼容DOMTokenList
      const classNameStr = typeof element.className === 'string' 
        ? element.className 
        : element.className.toString();
      
      if (classNameStr.trim()) {
        return `.${classNameStr.split(' ').filter(cls => cls.trim()).join('.')}`;
      }
    }

    return element.tagName.toLowerCase();
  }

  /**
   * 获取修饰键
   */
  private getModifiers(event: KeyboardEvent): string[] {
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) modifiers.push('meta');
    return modifiers;
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `${this.config.toolType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 会话开始时间
   */
  private sessionStartTime: number = Date.now();

  /**
   * 日志记录
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug.enabled && this.config.debug.logToConsole) {
      // 调试日志输出
    }
  }
} 