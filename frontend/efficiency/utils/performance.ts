// 性能监控工具函数

export interface PerformanceMetrics {
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  timing: {
    navigationStart: number;
    domContentLoadedEventEnd: number;
    loadEventEnd: number;
    domInteractive: number;
    domComplete: number;
  };
  fps: number;
  networkInfo?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

export class PerformanceMonitor {
  private fpsCounter: number = 0;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private isMonitoring: boolean = false;

  constructor() {
    this.bindEvents();
  }

  private bindEvents(): void {
    if (typeof window !== 'undefined') {
      // 监听页面卸载
      window.addEventListener('beforeunload', () => {
        this.stop();
      });
    }
  }

  /**
   * 开始监控性能
   */
  start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.startFPSMonitoring();
  }

  /**
   * 停止监控性能
   */
  stop(): void {
    this.isMonitoring = false;
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {
      memory: this.getMemoryInfo(),
      timing: this.getTimingInfo(),
      fps: this.fpsCounter,
      networkInfo: this.getNetworkInfo(),
    };

    return metrics;
  }

  /**
   * 获取内存信息
   */
  private getMemoryInfo(): PerformanceMetrics['memory'] {
    const memory = (performance as any).memory;
    if (memory) {
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    };
  }

  /**
   * 获取页面加载时间信息
   */
  private getTimingInfo(): PerformanceMetrics['timing'] {
    const timing = performance.timing;
    return {
      navigationStart: timing.navigationStart,
      domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
      loadEventEnd: timing.loadEventEnd,
      domInteractive: timing.domInteractive,
      domComplete: timing.domComplete,
    };
  }

  /**
   * 获取网络信息
   */
  private getNetworkInfo(): PerformanceMetrics['networkInfo'] | undefined {
    const connection = (navigator as any).connection;
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      };
    }
    return undefined;
  }

  /**
   * 开始FPS监控
   */
  private startFPSMonitoring(): void {
    const updateFPS = (timestamp: number) => {
      if (!this.isMonitoring) return;

      if (this.lastTime === 0) {
        this.lastTime = timestamp;
      }

      const delta = timestamp - this.lastTime;
      this.frameCount++;

      if (delta >= 1000) {
        this.fpsCounter = Math.round((this.frameCount * 1000) / delta);
        this.frameCount = 0;
        this.lastTime = timestamp;
      }

      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  }

  /**
   * 测量同步函数执行时间
   */
  static measureTimeSync<T>(label: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    // 性能测量结果
    return result;
  }

  /**
   * 测量异步函数执行时间
   */
  static async measureTimeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    // 性能测量结果
    return result;
  }

  /**
   * 获取页面加载性能指标
   */
  static getPageLoadMetrics(): {
    ttfb: number; // Time to First Byte
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  } {
    const timing = performance.timing;
    const paintEntries = performance.getEntriesByType('paint');
    const navigationEntries = performance.getEntriesByType('navigation');

    let fcp = 0;
    let lcp = 0;
    let fid = 0;
    let cls = 0;

    // First Contentful Paint
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      fcp = fcpEntry.startTime;
    }

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      lcp = lastEntry.startTime;
    });
    
    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP not supported
    }

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        fid = (entry as any).processingStart - entry.startTime;
      });
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // FID not supported
    }

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          cls += (entry as any).value;
        }
      });
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // CLS not supported
    }

    return {
      ttfb: timing.responseStart - timing.navigationStart,
      fcp,
      lcp,
      fid,
      cls,
    };
  }

  /**
   * 创建性能标记
   */
  static mark(name: string): void {
    if (performance.mark) {
      performance.mark(name);
    }
  }

  /**
   * 测量两个标记之间的时间
   */
  static measure(name: string, startMark: string, endMark?: string): number {
    if (performance.measure) {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      return measure ? measure.duration : 0;
    }
    return 0;
  }

  /**
   * 清理性能标记
   */
  static clearMarks(name?: string): void {
    if (performance.clearMarks) {
      performance.clearMarks(name);
    }
  }

  /**
   * 清理性能测量
   */
  static clearMeasures(name?: string): void {
    if (performance.clearMeasures) {
      performance.clearMeasures(name);
    }
  }
} 