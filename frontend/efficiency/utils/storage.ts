// 存储工具函数

import { TrackerEvent } from '../types/events';

export interface StorageInterface {
  set(key: string, value: any): Promise<void>;
  get(key: string): Promise<any>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

export class LocalStorageAdapter implements StorageInterface {
  private prefix: string;

  constructor(prefix: string = 'efficiency_tracker_') {
    this.prefix = prefix;
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(this.prefix + key, serialized);
    } catch (error) {
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async size(): Promise<number> {
    try {
      const keys = Object.keys(localStorage);
      return keys.filter(key => key.startsWith(this.prefix)).length;
    } catch (error) {
      return 0;
    }
  }
}

export class IndexedDBAdapter implements StorageInterface {
  private dbName: string;
  private storeName: string;
  private version: number;
  private db: IDBDatabase | null = null;

  constructor(dbName: string = 'EfficiencyTracker', storeName: string = 'events', version: number = 1) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async set(key: string, value: any): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put({ id: key, data: value, timestamp: Date.now() });
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async get(key: string): Promise<any> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
    });
  }

  async remove(key: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async clear(): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async size(): Promise<number> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.count();
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  async getAllKeys(): Promise<string[]> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
    });
  }
}

export class StorageManager {
  private adapter: StorageInterface;
  private maxSize: number;

  constructor(adapter: StorageInterface, maxSize: number = 10 * 1024 * 1024) {
    this.adapter = adapter;
    this.maxSize = maxSize;
  }

  /**
   * 存储事件数据
   */
  async storeEvents(events: TrackerEvent[]): Promise<void> {
    try {
      const timestamp = Date.now();
      const key = `events_${timestamp}`;
      await this.adapter.set(key, events);
      
      // 检查存储大小，如果超过限制则清理旧数据
      await this.checkAndCleanup();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取所有事件数据
   */
  async getAllEvents(): Promise<TrackerEvent[]> {
    try {
      const keys = await this.adapter.keys();
      const eventKeys = keys.filter(key => key.startsWith('events_'));
      
      const events: TrackerEvent[] = [];
      for (const key of eventKeys) {
        const eventData = await this.adapter.get(key);
        if (eventData && Array.isArray(eventData)) {
          events.push(...eventData);
        }
      }
      
      return events;
    } catch (error) {
      return [];
    }
  }

  /**
   * 清除已发送的事件
   */
  async clearSentEvents(): Promise<void> {
    try {
      const keys = await this.adapter.keys();
      const eventKeys = keys.filter(key => key.startsWith('events_'));
      
      for (const key of eventKeys) {
        await this.adapter.remove(key);
      }
    } catch (error) {
      // 清理错误处理
    }
  }

  /**
   * 检查并清理过期数据
   */
  private async checkAndCleanup(): Promise<void> {
    try {
      const currentSize = await this.estimateStorageSize();
      
      if (currentSize > this.maxSize) {
        await this.cleanup();
      }
    } catch (error) {
      // 清理检查错误处理
    }
  }

  /**
   * 估算存储大小
   */
  private async estimateStorageSize(): Promise<number> {
    try {
      const events = await this.getAllEvents();
      const serialized = JSON.stringify(events);
      return new Blob([serialized]).size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      const events = await this.getAllEvents();
      const size = await this.estimateStorageSize();
      
      return {
        eventCount: events.length,
        totalSize: size,
        maxSize: this.maxSize,
        usagePercentage: (size / this.maxSize) * 100,
      };
    } catch (error) {
      return {
        eventCount: 0,
        totalSize: 0,
        maxSize: this.maxSize,
        usagePercentage: 0,
      };
    }
  }
}

/**
 * 检查浏览器存储支持
 */
export function checkStorageSupport(): {
  localStorage: boolean;
  indexedDB: boolean;
  sessionStorage: boolean;
} {
  const support = {
    localStorage: false,
    indexedDB: false,
    sessionStorage: false,
  };

  // 检查localStorage
  try {
    const test = 'test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    support.localStorage = true;
  } catch (e) {
    support.localStorage = false;
  }

  // 检查IndexedDB
  try {
    support.indexedDB = 'indexedDB' in window && indexedDB !== null;
  } catch (e) {
    support.indexedDB = false;
  }

  // 检查sessionStorage
  try {
    const test = 'test';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    support.sessionStorage = true;
  } catch (e) {
    support.sessionStorage = false;
  }

  return support;
}

/**
 * 创建最佳存储适配器
 */
export function createStorageAdapter(preferIndexedDB: boolean = true): StorageInterface {
  const support = checkStorageSupport();
  
  if (preferIndexedDB && support.indexedDB) {
    return new IndexedDBAdapter();
  } else if (support.localStorage) {
    return new LocalStorageAdapter();
  } else {
    throw new Error('No storage support available');
  }
} 