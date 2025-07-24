// 核心效率追踪器

import { TrackerEvent, AnnotationEvent, PerformanceEvent, UserInteractionEvent, BackendComputationEvent, TaskStatusEvent, ErrorEvent, ToolEfficiencyEvent } from '../types/events';
import { EfficiencyTrackerConfig, TrackerSessionConfig, DEFAULT_CONFIG } from '../types/config';
import { EventCollector } from './EventCollector';
import { DataBuffer } from './DataBuffer';
import { NetworkManager, NetworkStatusMonitor } from './NetworkManager';
import { PerformanceMonitor } from '../utils/performance';
import { validateConfig } from '../utils/validation';

export interface EfficiencyTrackerOptions {
  config: EfficiencyTrackerConfig;
  onError?: (error: Error) => void;
  onFlush?: (events: TrackerEvent[]) => void;
  onStatusChange?: (status: TrackerStatus) => void;
}

export interface TrackerStatus {
  isRunning: boolean;
  isOnline: boolean;
  bufferSize: number;
  sessionId: string;
  startTime: number;
  totalEvents: number;
  lastFlushTime: number;
  errors: number;
}

export class EfficiencyTracker {
  private config: EfficiencyTrackerConfig;
  private sessionConfig: TrackerSessionConfig;
  private eventCollector: EventCollector;
  private dataBuffer: DataBuffer;
  private networkManager: NetworkManager;
  private performanceMonitor: PerformanceMonitor;
  private networkStatusMonitor: NetworkStatusMonitor;
  
  private isRunning: boolean = false;
  private totalEvents: number = 0;
  private lastFlushTime: number = 0;
  private errors: number = 0;
  private startTime: number = 0;
  
  private onErrorCallback?: (error: Error) => void;
  private onFlushCallback?: (events: TrackerEvent[]) => void;
  private onStatusChangeCallback?: (status: TrackerStatus) => void;

  constructor(options: EfficiencyTrackerOptions) {
    // 合并配置
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    
    // 验证配置
    const validationResult = validateConfig(this.config);
    if (!validationResult.isValid) {
      throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
    }

    // 设置回调函数
    this.onErrorCallback = options.onError;
    this.onFlushCallback = options.onFlush;
    this.onStatusChangeCallback = options.onStatusChange;

    // 初始化会话配置
    this.sessionConfig = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        screenResolution: this.getScreenResolution(),
        timeZone: this.getTimeZone(),
      },
    };

    // 初始化组件
    this.initializeComponents();
    
    this.log('EfficiencyTracker initialized');
  }

  /**
   * 开始追踪
   */
  start(): void {
    if (this.isRunning) {
      this.log('Tracker is already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.totalEvents = 0;
    this.errors = 0;
    this.lastFlushTime = Date.now();

    // 启动各个组件
    this.eventCollector.start();
    this.performanceMonitor.start();

    // 收集启动事件
    this.collectTaskStatusEvent({
      status: 'started',
      timeSpent: 0,
    });

    // 尝试重新发送存储的事件
    this.dataBuffer.retryStoredEvents();

    this.log('Tracker started');
    this.notifyStatusChange();
  }

  /**
   * 停止追踪
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.log('Tracker is not running');
      return;
    }

    this.isRunning = false;

    // 收集停止事件
    this.collectTaskStatusEvent({
      status: 'paused',
      timeSpent: Date.now() - this.startTime,
    });

    // 停止各个组件
    this.eventCollector.stop();
    this.performanceMonitor.stop();

    // 刷新缓冲区
    await this.dataBuffer.forceFlush();

    this.log('Tracker stopped');
    this.notifyStatusChange();
  }

  /**
   * 暂停追踪
   */
  pause(): void {
    if (!this.isRunning) {
      return;
    }

    this.eventCollector.stop();
    this.performanceMonitor.stop();

    this.collectTaskStatusEvent({
      status: 'paused',
      timeSpent: Date.now() - this.startTime,
    });

    this.log('Tracker paused');
  }

  /**
   * 恢复追踪
   */
  resume(): void {
    if (!this.isRunning) {
      return;
    }

    this.eventCollector.start();
    this.performanceMonitor.start();

    this.collectTaskStatusEvent({
      status: 'resumed',
    });

    this.log('Tracker resumed');
  }

  /**
   * 收集标注事件
   */
  trackAnnotation(data: Partial<AnnotationEvent>): void {
    this.eventCollector.collectAnnotationEvent(data);
  }

  /**
   * 收集性能事件
   */
  trackPerformance(data: Partial<PerformanceEvent>): void {
    this.eventCollector.collectPerformanceEvent(data);
  }

  /**
   * 收集用户交互事件
   */
  trackUserInteraction(data: Partial<UserInteractionEvent>): void {
    this.eventCollector.collectUserInteractionEvent(data);
  }

  /**
   * 收集后台计算事件
   */
  trackBackendComputation(data: Partial<BackendComputationEvent>): void {
    this.eventCollector.collectBackendComputationEvent(data);
  }

  /**
   * 收集任务状态事件
   */
  trackTaskStatus(data: Partial<TaskStatusEvent>): void {
    this.eventCollector.collectTaskStatusEvent(data);
  }

  /**
   * 收集错误事件
   */
  trackError(data: Partial<ErrorEvent>): void {
    this.eventCollector.collectErrorEvent(data);
    this.errors++;
  }

  /**
   * 收集工具效率事件
   */
  trackToolEfficiency(data: Partial<ToolEfficiencyEvent>): void {
    this.eventCollector.collectToolEfficiencyEvent(data);
  }

  /**
   * 手动刷新缓冲区
   */
  async flush(): Promise<void> {
    await this.dataBuffer.flush();
    this.lastFlushTime = Date.now();
    this.notifyStatusChange();
  }

  /**
   * 强制刷新所有数据
   */
  async forceFlush(): Promise<void> {
    await this.dataBuffer.forceFlush();
    this.lastFlushTime = Date.now();
    this.notifyStatusChange();
  }

  /**
   * 获取追踪器状态
   */
  getStatus(): TrackerStatus {
    return {
      isRunning: this.isRunning,
      isOnline: this.networkStatusMonitor.getStatus(),
      bufferSize: this.dataBuffer.getBufferStatus().bufferSize,
      sessionId: this.sessionConfig.sessionId,
      startTime: this.startTime,
      totalEvents: this.totalEvents,
      lastFlushTime: this.lastFlushTime,
      errors: this.errors,
    };
  }

  /**
   * 获取会话信息
   */
  getSessionInfo(): TrackerSessionConfig {
    return { ...this.sessionConfig };
  }

  /**
   * 获取配置
   */
  getConfig(): EfficiencyTrackerConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<EfficiencyTrackerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 验证新配置
    const validationResult = validateConfig(this.config);
    if (!validationResult.isValid) {
      throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
    }

    this.log('Configuration updated');
  }

  /**
   * 添加事件监听器
   */
  addEventListener(eventType: string, listener: (event: TrackerEvent) => void): void {
    this.eventCollector.addEventListener(eventType, listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(eventType: string, listener: (event: TrackerEvent) => void): void {
    this.eventCollector.removeEventListener(eventType, listener);
  }

  /**
   * 获取缓冲区统计信息
   */
  getBufferStats(): any {
    return this.dataBuffer.getBufferStatus();
  }

  /**
   * 获取网络状态
   */
  getNetworkStatus(): any {
    return this.networkManager.getNetworkStatus();
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): any {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * 清空缓冲区
   */
  clearBuffer(): void {
    this.dataBuffer.clearBuffer();
  }

  /**
   * 清空存储
   */
  async clearStorage(): Promise<void> {
    await this.dataBuffer.clearStorage();
  }

  /**
   * 检查连接
   */
  async checkConnection(): Promise<boolean> {
    return this.networkManager.checkConnection();
  }

  /**
   * 获取服务器时间
   */
  async getServerTime(): Promise<number> {
    return this.networkManager.getServerTime();
  }

  /**
   * 销毁追踪器
   */
  async destroy(): Promise<void> {
    await this.stop();
    
    this.dataBuffer.destroy();
    this.networkStatusMonitor.destroy();
    
    this.log('Tracker destroyed');
  }

  /**
   * 初始化组件
   */
  private initializeComponents(): void {
    // 性能监控器
    this.performanceMonitor = new PerformanceMonitor();

    // 网络管理器
    this.networkManager = new NetworkManager({
      config: this.config,
      onError: this.handleError.bind(this),
    });

    // 数据缓冲器
    this.dataBuffer = new DataBuffer({
      config: this.config,
      onFlush: this.handleFlush.bind(this),
      onError: this.handleError.bind(this),
    });

    // 事件收集器
    this.eventCollector = new EventCollector({
      config: this.config,
      sessionId: this.sessionConfig.sessionId,
      performanceMonitor: this.performanceMonitor,
    });

    // 网络状态监控器
    this.networkStatusMonitor = new NetworkStatusMonitor();
    this.networkStatusMonitor.addListener(this.handleNetworkStatusChange.bind(this));

    // 设置事件监听器
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听事件收集器的事件
    this.eventCollector.addEventListener('*', this.handleEvent.bind(this));

    // 监听性能指标更新
    if (this.config.performanceMonitoring.enabled) {
      setInterval(() => {
        if (this.isRunning) {
          const metrics = this.performanceMonitor.getMetrics();
          
          // 收集FPS性能事件
          this.trackPerformance({
            metricName: 'fps',
            value: metrics.fps,
            unit: 'fps',
          });

          // 收集内存使用事件
          this.trackPerformance({
            metricName: 'memory_usage',
            value: metrics.memory.usedJSHeapSize,
            unit: 'mb',
          });
        }
      }, this.config.performanceMonitoring.metricsInterval);
    }
  }

  /**
   * 处理事件
   */
  private handleEvent(event: TrackerEvent): void {
    this.totalEvents++;
    this.dataBuffer.addEvent(event);
    
    if (this.onFlushCallback) {
      this.onFlushCallback([event]);
    }
  }

  /**
   * 处理刷新
   */
  private async handleFlush(events: TrackerEvent[]): Promise<void> {
    try {
      const response = await this.networkManager.sendBatch(events);
      
      if (response.success) {
        this.lastFlushTime = Date.now();
        this.log(`Successfully sent ${events.length} events`);
      } else {
        throw new Error(response.error || 'Failed to send events');
      }
    } catch (error) {
      this.handleError(error);
      throw error; // 重新抛出错误，让DataBuffer处理
    }
  }

  /**
   * 处理网络状态变化
   */
  private handleNetworkStatusChange(isOnline: boolean): void {
    this.log(`Network status changed: ${isOnline ? 'online' : 'offline'}`);
    
    if (isOnline) {
      // 网络恢复，尝试重新发送存储的事件
      this.dataBuffer.retryStoredEvents();
    }
    
    this.notifyStatusChange();
  }

  /**
   * 处理错误
   */
  private handleError(error: any): void {
    this.errors++;
    
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
    
    this.log('Error occurred:', error);
  }

  /**
   * 通知状态变化
   */
  private notifyStatusChange(): void {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(this.getStatus());
    }
  }

  /**
   * 收集任务状态事件的便捷方法
   */
  private collectTaskStatusEvent(data: Partial<TaskStatusEvent>): void {
    this.eventCollector.collectTaskStatusEvent(data);
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取屏幕分辨率
   */
  private getScreenResolution(): string {
    if (typeof window !== 'undefined' && window.screen) {
      return `${window.screen.width}x${window.screen.height}`;
    }
    return 'unknown';
  }

  /**
   * 获取时区
   */
  private getTimeZone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * 日志记录
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug.enabled && this.config.debug.logToConsole) {
      // 调试日志输出
    }
  }
}

// 单例模式的全局追踪器实例
let globalTracker: EfficiencyTracker | null = null;

/**
 * 获取全局追踪器实例
 */
export function getGlobalTracker(): EfficiencyTracker | null {
  return globalTracker;
}

/**
 * 设置全局追踪器实例
 */
export function setGlobalTracker(tracker: EfficiencyTracker): void {
  globalTracker = tracker;
}

/**
 * 创建追踪器实例
 */
export function createTracker(options: EfficiencyTrackerOptions): EfficiencyTracker {
  const tracker = new EfficiencyTracker(options);
  
  // 如果没有全局实例，设置为全局实例
  if (!globalTracker) {
    setGlobalTracker(tracker);
  }
  
  return tracker;
}

/**
 * 销毁全局追踪器
 */
export async function destroyGlobalTracker(): Promise<void> {
  if (globalTracker) {
    await globalTracker.destroy();
    globalTracker = null;
  }
} 