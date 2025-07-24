// 网络管理器

import { TrackerEvent, BatchEventData } from '../types/events';
import { EfficiencyTrackerConfig, NetworkConfig } from '../types/config';

export interface NetworkManagerOptions {
  config: EfficiencyTrackerConfig;
  onError?: (error: Error) => void;
}

export interface NetworkResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

// 断路器状态
enum CircuitBreakerState {
  CLOSED = 'closed',     // 正常状态，允许请求
  OPEN = 'open',         // 断开状态，拒绝请求
  HALF_OPEN = 'half_open' // 半开状态，允许少量测试请求
}

interface CircuitBreakerConfig {
  failureThreshold: number;      // 失败阈值
  recoveryTimeout: number;       // 恢复超时时间
  monitoringPeriod: number;      // 监控周期
  halfOpenMaxCalls: number;      // 半开状态下最大调用次数
}

export class NetworkManager {
  private config: EfficiencyTrackerConfig;
  private networkConfig: NetworkConfig;
  private onErrorCallback?: (error: Error) => void;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue: boolean = false;

  // 断路器相关
  private circuitBreakerState: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenCallCount: number = 0;
  private circuitBreakerConfig: CircuitBreakerConfig;

  // 服务健康状态
  private isServiceHealthy: boolean = true;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 5 * 60 * 1000; // 5分钟
  private consecutiveFailures: number = 0;

  constructor(options: NetworkManagerOptions) {
    this.config = options.config;
    this.onErrorCallback = options.onError;
    
    // 初始化断路器配置
    this.circuitBreakerConfig = {
      failureThreshold: 5,        // 连续失败5次后断开
      recoveryTimeout: 60000,     // 1分钟后尝试恢复
      monitoringPeriod: 300000,   // 5分钟监控周期
      halfOpenMaxCalls: 3         // 半开状态最多3次测试调用
    };
    
    // 初始化网络配置
    this.networkConfig = {
      endpoint: this.config.apiEndpoint,
      timeout: 30000, // 30秒超时
      retries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      compression: true,
      headers: {
        'Content-Type': 'application/json',
        'X-Tool-Type': this.config.toolType,
        'X-User-Id': this.config.userId,
        'X-Project-Id': this.config.projectId,
        'X-Task-Id': this.config.taskId,
      },
    };

    // 添加API密钥
    if (this.config.apiKey) {
      this.networkConfig.headers!['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // 初始化时检查服务健康状态
    this.performInitialHealthCheck();
  }

  /**
   * 发送批量事件
   */
  async sendBatch(events: TrackerEvent[]): Promise<NetworkResponse> {
    if (events.length === 0) {
      return { success: true, data: { processed: 0, failed: 0 } };
    }

    // 检查断路器状态
    if (!this.canMakeRequest()) {
      this.log('Circuit breaker is OPEN, skipping batch request');
      return { 
        success: false, 
        error: 'Service temporarily unavailable (Circuit breaker OPEN)',
        status: 503 
      };
    }

    const batchData: BatchEventData = {
      batch_id: this.generateBatchId(),
      events: events.map((event) => {
        // 修正事件类型
        let correctedEventType = event.type;
        if (event.type === 'interaction') {
          correctedEventType = 'user_interaction';
        }

        return {
          event_type: correctedEventType,
          timestamp: new Date(event.timestamp).toISOString(),
          user_id: event.userId,
          project_id: event.projectId,
          task_id: event.taskId || null,
          session_id: event.sessionId || null,
          tool: event.toolType,
          data: this.extractEventData(event),
          metadata: event.metadata || {},
        };
      }),
      metadata: {
        tool: this.config.toolType,
        version: this.config.version,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        screenResolution: this.getScreenResolution(),
        timeZone: this.getTimeZone(),
      },
    };

    return this.sendRequest('/events/batch', 'POST', batchData);
  }

  /**
   * 发送单个事件
   */
  async sendEvent(event: TrackerEvent): Promise<NetworkResponse> {
    return this.sendRequest('/events/single', 'POST', event);
  }

  /**
   * 检查网络连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.sendRequest('/health/', 'GET');
      return response.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取服务器时间
   */
  async getServerTime(): Promise<number> {
    try {
      const response = await this.sendRequest('/health/', 'GET');
      return response.data?.timestamp || Date.now();
    } catch (error) {
      return Date.now();
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(file: File, uploadType: string): Promise<NetworkResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', uploadType);
    formData.append('userId', this.config.userId);
    formData.append('projectId', this.config.projectId);
    formData.append('taskId', this.config.taskId);

    return this.sendRequest('/upload', 'POST', formData, {
      'Content-Type': 'multipart/form-data',
    });
  }

  /**
   * 获取配置
   */
  async getConfig(): Promise<NetworkResponse> {
    return this.sendRequest('/config/monitoring', 'GET');
  }

  /**
   * 添加请求到队列
   */
  addToQueue(requestFn: () => Promise<void>): void {
    this.requestQueue.push(requestFn);
    this.processQueue();
  }

  /**
   * 获取网络状态
   */
  getNetworkStatus(): {
    isOnline: boolean;
    connectionType: string;
    queueSize: number;
    isProcessingQueue: boolean;
  } {
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      connectionType: this.getConnectionType(),
      queueSize: this.requestQueue.length,
      isProcessingQueue: this.isProcessingQueue,
    };
  }

  /**
   * 清空请求队列
   */
  clearQueue(): void {
    this.requestQueue = [];
    this.log('Request queue cleared');
  }

  /**
   * 发送HTTP请求（带断路器保护）
   */
  private async sendRequest(
    endpoint: string,
    method: string,
    data?: any,
    additionalHeaders?: Record<string, string>
  ): Promise<NetworkResponse> {
    // 断路器检查（针对非健康检查的请求）
    if (endpoint !== '/health/' && !this.canMakeRequest()) {
      this.log(`Circuit breaker is ${this.circuitBreakerState}, skipping request to ${endpoint}`);
      return {
        success: false,
        error: `Service temporarily unavailable (Circuit breaker ${this.circuitBreakerState})`,
        status: 503,
      };
    }

    // 半开状态下增加调用计数
    if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenCallCount++;
    }

    const url = this.buildUrl(endpoint);
    const headers = { ...this.networkConfig.headers, ...additionalHeaders };

    // 移除FormData的Content-Type头，让浏览器自动设置
    if (data instanceof FormData) {
      delete headers['Content-Type'];
    }

    let lastError: Error | null = null;
    
    // 重试机制
    for (let attempt = 0; attempt <= this.networkConfig.retries; attempt++) {
      try {
        this.log(`Sending ${method} request to ${endpoint} (attempt ${attempt + 1})`);
        
        const requestOptions: RequestInit = {
          method,
          headers,
          signal: this.createTimeoutSignal(this.networkConfig.timeout),
        };

        if (data && method !== 'GET') {
          if (data instanceof FormData) {
            requestOptions.body = data;
          } else {
            requestOptions.body = JSON.stringify(data);
          }
        }
        
        const response = await fetch(url, requestOptions);
        const responseText = await response.text();
        
        let responseData: any;
        try {
          responseData = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          responseData = { raw: responseText };
        }

        if (response.ok) {
          this.log(`Request successful: ${method} ${endpoint}`);
          
          // 记录成功（排除健康检查）
          if (endpoint !== '/health/') {
            this.recordSuccess();
          }
          
          return {
            success: true,
            data: responseData,
            status: response.status,
          };
        } else {
          const error = new Error(`HTTP ${response.status}: ${responseData.message || response.statusText}`);
          lastError = error;
          
          // 对于4xx错误，不进行重试
          if (response.status >= 400 && response.status < 500) {
            break;
          }
        }
      } catch (error) {
        lastError = error as Error;
        this.log(`Request failed: ${method} ${endpoint}`, error);
        
        // 如果是AbortError，说明是超时，继续重试
        if (error instanceof Error && error.name === 'AbortError') {
          this.log(`Request timed out, will retry if attempts remaining`);
        }
      }

      // 如果还有重试机会，等待一段时间后重试
      if (attempt < this.networkConfig.retries) {
        await this.sleep(this.networkConfig.retryDelay * (attempt + 1));
      }
    }

    // 所有重试都失败了，记录失败（排除健康检查）
    if (endpoint !== '/health/') {
      this.recordFailure();
    }
    
    this.handleError(lastError || new Error('Request failed'));
    return {
      success: false,
      error: lastError?.message || 'Request failed',
      status: 0,
    };
  }

  /**
   * 处理请求队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.requestQueue.length > 0) {
        const requestFn = this.requestQueue.shift();
        if (requestFn) {
          try {
            await requestFn();
          } catch (error) {
            this.handleError(error);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 构建完整URL
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.networkConfig.endpoint;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBaseUrl}/${cleanEndpoint}`;
  }

  /**
   * 创建超时信号
   */
  private createTimeoutSignal(timeout: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  /**
   * 获取连接类型
   */
  private getConnectionType(): string {
    if (typeof navigator !== 'undefined' && (navigator as any).connection) {
      return (navigator as any).connection.effectiveType || 'unknown';
    }
    return 'unknown';
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
   * 生成批次ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 错误处理
   */
  private handleError(error: any): void {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  /**
   * 初始健康检查
   */
  private async performInitialHealthCheck(): Promise<void> {
    try {
      const isHealthy = await this.checkConnection();
      this.isServiceHealthy = isHealthy;
      this.lastHealthCheck = Date.now();
      
      if (!isHealthy) {
        this.log('EFFM service not available during initial check, enabling circuit breaker');
        this.openCircuit();
      } else {
        this.log('EFFM service is healthy');
      }
    } catch (error) {
      this.log('Initial health check failed', error);
      this.isServiceHealthy = false;
      this.openCircuit();
    }
  }

  /**
   * 检查是否可以发起请求
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    
    switch (this.circuitBreakerState) {
      case CircuitBreakerState.CLOSED:
        return true;
        
      case CircuitBreakerState.OPEN:
        // 检查是否到了尝试恢复的时间
        if (now - this.lastFailureTime >= this.circuitBreakerConfig.recoveryTimeout) {
          this.circuitBreakerState = CircuitBreakerState.HALF_OPEN;
          this.halfOpenCallCount = 0;
          this.log('Circuit breaker entering HALF_OPEN state');
          return true;
        }
        return false;
        
      case CircuitBreakerState.HALF_OPEN:
        // 半开状态下允许有限的请求
        return this.halfOpenCallCount < this.circuitBreakerConfig.halfOpenMaxCalls;
        
      default:
        return false;
    }
  }

  /**
   * 记录请求成功
   */
  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.failureCount = 0;
    this.isServiceHealthy = true;
    
    if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
      // 在半开状态下成功，关闭断路器
      this.circuitBreakerState = CircuitBreakerState.CLOSED;
      this.log('Circuit breaker closed after successful request');
    }
  }

  /**
   * 记录请求失败
   */
  private recordFailure(): void {
    this.consecutiveFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
      // 半开状态下失败，重新打开断路器
      this.openCircuit();
    } else if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      // 达到失败阈值，打开断路器
      this.openCircuit();
    }
  }

  /**
   * 打开断路器
   */
  private openCircuit(): void {
    this.circuitBreakerState = CircuitBreakerState.OPEN;
    this.isServiceHealthy = false;
    this.log(`Circuit breaker OPENED after ${this.failureCount} failures`);
  }

  /**
   * 检查并更新健康状态
   */
  private async checkAndUpdateHealth(): Promise<void> {
    const now = Date.now();
    
    // 如果距离上次健康检查超过间隔时间，进行检查
    if (now - this.lastHealthCheck >= this.healthCheckInterval) {
      try {
        const isHealthy = await this.checkConnection();
        this.lastHealthCheck = now;
        
        if (isHealthy && !this.isServiceHealthy) {
          this.log('EFFM service recovered, resetting circuit breaker');
          this.resetCircuitBreaker();
        }
      } catch (error) {
        this.log('Health check failed', error);
      }
    }
  }

  /**
   * 重置断路器
   */
  private resetCircuitBreaker(): void {
    this.circuitBreakerState = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.consecutiveFailures = 0;
    this.halfOpenCallCount = 0;
    this.isServiceHealthy = true;
  }

  /**
   * 获取断路器状态信息
   */
  getCircuitBreakerStatus(): {
    state: CircuitBreakerState;
    failureCount: number;
    isServiceHealthy: boolean;
    lastFailureTime: number;
    nextRetryTime?: number;
  } {
    const status = {
      state: this.circuitBreakerState,
      failureCount: this.failureCount,
      isServiceHealthy: this.isServiceHealthy,
      lastFailureTime: this.lastFailureTime,
    };

    if (this.circuitBreakerState === CircuitBreakerState.OPEN) {
      return {
        ...status,
        nextRetryTime: this.lastFailureTime + this.circuitBreakerConfig.recoveryTimeout,
      };
    }

    return status;
  }

  /**
   * 日志记录
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug?.enabled && this.config.debug?.logToConsole) {
      console.log(`[NetworkManager] ${message}`, ...args);
    }
  }

  /**
   * Extracts and transforms the event-specific data based on the event type.
   */
  private extractEventData(event: TrackerEvent): Record<string, any> {
    // Temporary fix for incorrect event type
    if ((event.type as any) === 'interaction') {
      event.type = 'user_interaction';
    }

    switch (event.type) {
      case 'annotation':
        return {
          type: (event as any).action || 'unknown',
          annotationType: (event as any).annotationType || 'unknown',
          duration: (event as any).duration || 0,
          success: true,
          objectId: (event as any).objectId,
          error: null,
          metadata: (event as any).metadata || {},
        };
      case 'performance':
        return {
          fps: (event as any).metricName === 'fps' ? (event as any).value : null,
          memory_usage: (event as any).metricName === 'memory_usage' ? (event as any).value : null,
          cpu_usage: (event as any).metricName === 'cpu_usage' ? (event as any).value : null,
          render_time: (event as any).metricName === 'render_time' ? (event as any).value : null,
          network_latency: (event as any).metricName === 'network_latency' ? (event as any).value : null,
          metadata: (event as any).context || {},
        };
      case 'user_interaction':
        return {
          action: (event as any).action || 'unknown',
          element: (event as any).element || 'unknown',
          duration: (event as any).duration,
          coordinates: (event as any).position,
          metadata: {},
        };
      case 'task_status':
        return {
          type: (event as any).status || 'unknown',
          taskId: (event as any).taskId || this.config.taskId,
          duration: (event as any).timeSpent,
          success: (event as any).status === 'completed',
          annotationCount: null,
          error: null,
          metadata: {},
        };
      case 'error':
        return {
          type: (event as any).errorType || 'unknown',
          message: (event as any).message || 'Unknown error',
          stack: (event as any).stack,
          severity: (event as any).severity || 'error',
          context: (event as any).context || {},
        };
      case 'tool_efficiency':
        return {
          tool: (event as any).toolType || this.config.toolType,
          action: (event as any).toolAction || 'unknown',
          duration: (event as any).duration || 0,
          success: (event as any).success ?? true,
          efficiency_score: null,
          metadata: {},
        };
      default:
        return {};
    }
  }
}

/**
 * 网络状态监控器
 */
export class NetworkStatusMonitor {
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private isOnline: boolean = true;

  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.setupEventListeners();
  }

  /**
   * 添加状态变化监听器
   */
  addListener(listener: (isOnline: boolean) => void): void {
    this.listeners.add(listener);
  }

  /**
   * 移除状态变化监听器
   */
  removeListener(listener: (isOnline: boolean) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * 获取当前网络状态
   */
  getStatus(): boolean {
    return this.isOnline;
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  /**
   * 处理上线事件
   */
  private handleOnline = (): void => {
    this.isOnline = true;
    this.notifyListeners(true);
  };

  /**
   * 处理离线事件
   */
  private handleOffline = (): void => {
    this.isOnline = false;
    this.notifyListeners(false);
  };

  /**
   * 通知监听器
   */
  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (error) {
        // 网络状态监听器错误处理
      }
    });
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
  }
} 