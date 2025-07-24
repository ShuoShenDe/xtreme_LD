export interface EfficiencyTrackerConfig {
  // 基础配置
  apiEndpoint: string;
  apiKey?: string;
  userId: string;
  projectId: string;
  taskId: string;
  toolType: 'pc-tool' | 'image-tool' | 'text-tool';
  
  // 数据上报配置
  batchSize: number;
  flushInterval: number; // 毫秒
  maxRetries: number;
  retryDelay: number; // 毫秒
  
  // 性能监控配置
  performanceMonitoring: {
    enabled: boolean;
    samplingRate: number; // 0-1
    metricsInterval: number; // 毫秒
    captureUserInteractions: boolean;
    captureErrors: boolean;
    capturePerformance: boolean;
  };
  
  // 缓存配置
  storage: {
    enabled: boolean;
    maxSize: number; // bytes
    storageKey: string;
    clearOnStart: boolean;
  };
  
  // 调试配置
  debug: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logToConsole: boolean;
    logToServer: boolean;
  };
  
  // 自定义配置
  customConfig?: Record<string, any>;
}

export interface TrackerSessionConfig {
  sessionId: string;
  startTime: number;
  endTime?: number;
  metadata?: Record<string, any>;
}

export interface DataBufferConfig {
  maxSize: number;
  flushThreshold: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface NetworkConfig {
  endpoint: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers?: Record<string, string>;
  compression: boolean;
}

export interface PluginConfig {
  name: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface IntegrationConfig {
  toolType: 'pc-tool' | 'image-tool' | 'text-tool';
  enabledEvents: string[];
  customEvents?: Record<string, any>;
  eventFilters?: Array<(event: any) => boolean>;
}

// 默认配置
export const DEFAULT_CONFIG: EfficiencyTrackerConfig = {
  apiEndpoint: '/api/v1/events',
  userId: '',
  projectId: '',
  taskId: '',
  toolType: 'pc-tool',
  batchSize: 100,
  flushInterval: 10000, // 10秒
  maxRetries: 3,
  retryDelay: 1000, // 1秒
  performanceMonitoring: {
    enabled: true,
    samplingRate: 1.0,
    metricsInterval: 5000, // 5秒
    captureUserInteractions: true,
    captureErrors: true,
    capturePerformance: true,
  },
  storage: {
    enabled: true,
    maxSize: 10 * 1024 * 1024, // 10MB
    storageKey: 'efficiency_tracker_data',
    clearOnStart: false,
  },
  debug: {
    enabled: false,
    logLevel: 'info',
    logToConsole: true,
    logToServer: false,
  },
}; 