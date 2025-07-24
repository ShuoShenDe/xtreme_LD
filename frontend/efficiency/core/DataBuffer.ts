// 数据缓冲器

import { TrackerEvent, BatchEventData } from '../types/events';
import { EfficiencyTrackerConfig, DataBufferConfig } from '../types/config';
import { StorageManager, createStorageAdapter } from '../utils/storage';

export interface DataBufferOptions {
  config: EfficiencyTrackerConfig;
  onFlush?: (events: TrackerEvent[]) => Promise<void>;
  onError?: (error: Error) => void;
}

export class DataBuffer {
  private config: EfficiencyTrackerConfig;
  private buffer: TrackerEvent[] = [];
  private storageManager: StorageManager;
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushingBuffer: boolean = false;
  private onFlushCallback?: (events: TrackerEvent[]) => Promise<void>;
  private onErrorCallback?: (error: Error) => void;

  constructor(options: DataBufferOptions) {
    this.config = options.config;
    this.onFlushCallback = options.onFlush;
    this.onErrorCallback = options.onError;
    
    // 初始化存储管理器
    if (this.config.storage.enabled) {
      try {
        const storageAdapter = createStorageAdapter(true);
        this.storageManager = new StorageManager(storageAdapter, this.config.storage.maxSize);
      } catch (error) {
        this.handleError(new Error('Failed to initialize storage adapter'));
      }
    }

    // 启动定时刷新
    this.startFlushTimer();
  }

  /**
   * 添加事件到缓冲区
   */
  async addEvent(event: TrackerEvent): Promise<void> {
    try {
      this.buffer.push(event);

      // 检查是否需要立即刷新
      if (this.buffer.length >= this.config.batchSize) {
        await this.flush();
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 批量添加事件
   */
  async addEvents(events: TrackerEvent[]): Promise<void> {
    try {
      this.buffer.push(...events);

      // 检查是否需要立即刷新
      if (this.buffer.length >= this.config.batchSize) {
        await this.flush();
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 刷新缓冲区
   */
  async flush(): Promise<void> {
    if (this.isFlushingBuffer || this.buffer.length === 0) {
      return;
    }

    this.isFlushingBuffer = true;

    try {
      // 获取要刷新的事件
      const eventsToFlush = this.buffer.splice(0, this.config.batchSize);

      // 如果有回调函数，先尝试发送
      if (this.onFlushCallback) {
        try {
          await this.onFlushCallback(eventsToFlush);
          this.log(`Flushed ${eventsToFlush.length} events successfully`);
        } catch (error) {
          // 发送失败，存储到本地
          if (this.config.storage.enabled && this.storageManager) {
            await this.storageManager.storeEvents(eventsToFlush);
            this.log(`Stored ${eventsToFlush.length} events locally due to network error`);
          }
          throw error;
        }
      } else {
        // 没有回调函数，直接存储到本地
        if (this.config.storage.enabled && this.storageManager) {
          await this.storageManager.storeEvents(eventsToFlush);
          this.log(`Stored ${eventsToFlush.length} events locally`);
        }
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      this.isFlushingBuffer = false;
    }
  }

  /**
   * 强制刷新所有缓冲区数据
   */
  async forceFlush(): Promise<void> {
    while (this.buffer.length > 0) {
      await this.flush();
    }
  }

  /**
   * 获取存储的事件并尝试重新发送
   */
  async retryStoredEvents(): Promise<void> {
    if (!this.config.storage.enabled || !this.storageManager) {
      return;
    }

    try {
      const storedEvents = await this.storageManager.getAllEvents();
      
      if (storedEvents.length === 0) {
        return;
      }

      this.log(`Found ${storedEvents.length} stored events, attempting to resend`);

      // 分批重新发送
      const batchSize = this.config.batchSize;
      for (let i = 0; i < storedEvents.length; i += batchSize) {
        const batch = storedEvents.slice(i, i + batchSize);
        
        if (this.onFlushCallback) {
          try {
            await this.onFlushCallback(batch);
            // 发送成功，清理这部分数据
            await this.storageManager.clearSentEvents(batch.map(e => e.eventId));
            this.log(`Resent ${batch.length} stored events successfully`);
          } catch (error) {
            this.log(`Failed to resend batch of ${batch.length} events:`, error);
            break; // 停止重试
          }
        }
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 获取缓冲区状态
   */
  getBufferStatus(): {
    bufferSize: number;
    isFlushingBuffer: boolean;
    storageStats?: {
      eventCount: number;
      estimatedSize: number;
      usagePercentage: number;
    };
  } {
    const status = {
      bufferSize: this.buffer.length,
      isFlushingBuffer: this.isFlushingBuffer,
      storageStats: undefined as any,
    };

    if (this.config.storage.enabled && this.storageManager) {
      // 异步获取存储统计信息
      this.storageManager.getStorageStats().then(stats => {
        status.storageStats = stats;
      }).catch(error => {
        this.handleError(error);
      });
    }

    return status;
  }

  /**
   * 清空缓冲区
   */
  clearBuffer(): void {
    this.buffer = [];
    this.log('Buffer cleared');
  }

  /**
   * 清空存储
   */
  async clearStorage(): Promise<void> {
    if (this.config.storage.enabled && this.storageManager) {
      await this.storageManager.clearSentEvents([]);
      this.log('Storage cleared');
    }
  }

  /**
   * 创建批量事件数据
   */
  createBatchEventData(events: TrackerEvent[]): BatchEventData {
    return {
      events,
      metadata: {
        batchId: this.generateBatchId(),
        timestamp: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        screenResolution: this.getScreenResolution(),
        timeZone: this.getTimeZone(),
      },
    };
  }

  /**
   * 压缩事件数据
   */
  compressEventData(events: TrackerEvent[]): string {
    try {
      // 简单的数据压缩：移除不必要的字段
      const compressedEvents = events.map(event => {
        const compressed = { ...event };
        
        // 移除空字段
        Object.keys(compressed).forEach(key => {
          if (compressed[key] === undefined || compressed[key] === null) {
            delete compressed[key];
          }
        });
        
        return compressed;
      });

      return JSON.stringify(compressedEvents);
    } catch (error) {
      this.handleError(error);
      return JSON.stringify(events);
    }
  }

  /**
   * 解压缩事件数据
   */
  decompressEventData(compressedData: string): TrackerEvent[] {
    try {
      return JSON.parse(compressedData);
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  /**
   * 估算事件数据大小
   */
  estimateEventSize(events: TrackerEvent[]): number {
    try {
      const serialized = JSON.stringify(events);
      return new Blob([serialized]).size;
    } catch (error) {
      this.handleError(error);
      return 0;
    }
  }

  /**
   * 优化事件数据
   */
  optimizeEvents(events: TrackerEvent[]): TrackerEvent[] {
    const optimized = events.map(event => {
      const optimizedEvent = { ...event };

      // 移除重复的基础字段（如果它们在批次中相同）
      if (events.length > 1) {
        const firstEvent = events[0];
        if (optimizedEvent.userId === firstEvent.userId) {
          delete optimizedEvent.userId;
        }
        if (optimizedEvent.projectId === firstEvent.projectId) {
          delete optimizedEvent.projectId;
        }
        if (optimizedEvent.taskId === firstEvent.taskId) {
          delete optimizedEvent.taskId;
        }
        if (optimizedEvent.toolType === firstEvent.toolType) {
          delete optimizedEvent.toolType;
        }
        if (optimizedEvent.sessionId === firstEvent.sessionId) {
          delete optimizedEvent.sessionId;
        }
      }

      // 截断过长的字符串
      if (optimizedEvent.metadata) {
        const metadata = optimizedEvent.metadata;
        Object.keys(metadata).forEach(key => {
          if (typeof metadata[key] === 'string' && metadata[key].length > 1000) {
            metadata[key] = metadata[key].substring(0, 1000) + '...';
          }
        });
      }

      return optimizedEvent;
    });

    return optimized;
  }

  /**
   * 销毁缓冲区
   */
  destroy(): void {
    this.stopFlushTimer();
    this.clearBuffer();
    this.log('DataBuffer destroyed');
  }

  /**
   * 启动定时刷新
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(async () => {
      await this.flush();
    }, this.config.flushInterval);
  }

  /**
   * 停止定时刷新
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * 生成批次ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
   * 错误处理
   */
  private handleError(error: any): void {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
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