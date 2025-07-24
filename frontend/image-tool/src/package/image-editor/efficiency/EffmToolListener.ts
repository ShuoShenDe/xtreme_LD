import { imageToolEfficiency } from '@efficiency/index';
import { 
  ToolEventNames, 
  ToolEventData,
  DrawSessionEventData,
  EditSessionEventData,
  InteractionEventData,
  PerformanceEventData,
  AnnotationCompletedEventData
} from '../types/toolEvents';
import EventEmitter from 'eventemitter3';

/**
 * EFFM工具事件监听器
 * 负责监听所有工具事件并转换为EFFM API调用
 * 完全解耦工具类和效率监控逻辑
 */
export class EffmToolListener {
  private efficiencyManager = imageToolEfficiency;
  private eventBus: EventEmitter;

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.registerEventListeners();
  }

  /**
   * 注册所有事件监听器
   */
  private registerEventListeners(): void {
    this.eventBus.on(ToolEventNames.DRAW_SESSION, this.handleDrawSession.bind(this));
    this.eventBus.on(ToolEventNames.EDIT_SESSION, this.handleEditSession.bind(this));
    this.eventBus.on(ToolEventNames.INTERACTION, this.handleInteraction.bind(this));
    this.eventBus.on(ToolEventNames.PERFORMANCE, this.handlePerformance.bind(this));
    this.eventBus.on(ToolEventNames.ANNOTATION_COMPLETED, this.handleAnnotationCompleted.bind(this));
  }

  /**
   * 处理绘制会话事件
   */
  private handleDrawSession(data: DrawSessionEventData): void {
    const annotationType = this.mapToolToAnnotationType(data.toolType);
    
    switch (data.action) {
      case 'start':
        this.efficiencyManager.trackAnnotation('start', {
          annotationType,
          metadata: {
            sessionId: data.sessionId,
            toolType: data.toolType,
            timestamp: data.timestamp,
            ...data.metadata
          }
        });
        break;

      case 'complete':
        this.efficiencyManager.trackAnnotation('complete', {
          annotationType,
          duration: data.duration,
          metadata: {
            sessionId: data.sessionId,
            toolType: data.toolType,
            timestamp: data.timestamp,
            points: data.points,
            ...data.metadata
          }
        });
        
        // Track completion duration as performance metric
        if (data.duration) {
          this.efficiencyManager.trackPerformance(
            `${data.toolType}_completion_duration`, 
            data.duration, 
            'ms', 
            { sessionId: data.sessionId }
          );
        }
        break;

      case 'cancel':
        this.efficiencyManager.trackAnnotation('delete', {
          annotationType,
          duration: data.duration,
          metadata: {
            sessionId: data.sessionId,
            toolType: data.toolType,
            timestamp: data.timestamp,
            reason: 'user_cancelled',
            ...data.metadata
          }
        });
        break;
    }
  }

  /**
   * 处理编辑会话事件
   */
  private handleEditSession(data: EditSessionEventData): void {
    const annotationType = this.mapToolToAnnotationType(data.toolType);
    
    switch (data.action) {
      case 'start':
        this.efficiencyManager.trackAnnotation('modify', {
          annotationType,
          objectId: data.objectId,
          metadata: {
            sessionId: data.sessionId,
            toolType: data.toolType,
            mode: 'edit_start',
            timestamp: data.timestamp,
            ...data.metadata
          }
        });
        break;

      case 'complete':
        this.efficiencyManager.trackAnnotation('modify', {
          annotationType,
          objectId: data.objectId,
          duration: data.duration,
          metadata: {
            sessionId: data.sessionId,
            toolType: data.toolType,
            mode: 'edit_complete',
            timestamp: data.timestamp,
            ...data.metadata
          }
        });
        
        // Track edit duration
        if (data.duration) {
          this.efficiencyManager.trackPerformance(
            `${data.toolType}_edit_duration`, 
            data.duration, 
            'ms', 
            { sessionId: data.sessionId }
          );
        }
        break;

      case 'cancel':
        this.efficiencyManager.trackAnnotation('modify', {
          annotationType,
          objectId: data.objectId,
          duration: data.duration,
          metadata: {
            sessionId: data.sessionId,
            toolType: data.toolType,
            mode: 'edit_cancelled',
            timestamp: data.timestamp,
            reason: 'user_cancelled',
            ...data.metadata
          }
        });
        break;
    }
  }

  /**
   * 处理用户交互事件
   */
  private handleInteraction(data: InteractionEventData): void {
    this.efficiencyManager.trackInteraction(data.interactionType, {
      timestamp: data.timestamp,
      position: data.position,
      metadata: {
        sessionId: data.sessionId,
        toolType: data.toolType,
        ...data.metadata
      }
    });
  }

  /**
   * 规范化性能指标单位为效率监控系统支持的类型
   */
  private normalizeUnit(unit: string): 'ms' | 'fps' | 'mb' | 'count' {
    const unitMapping: Record<string, 'ms' | 'fps' | 'mb' | 'count'> = {
      'ms': 'ms',
      'fps': 'fps', 
      'mb': 'mb',
      'count': 'count',
      // 转换不支持的单位
      'points/s': 'count',
      'px²/s': 'count',
      'px²': 'count',
      'px': 'count',
      'ratio': 'count',
      's': 'ms',  // 秒转换为毫秒
      'bytes': 'mb', // 字节转换为MB
    };
    
    return unitMapping[unit] || 'count';
  }

  /**
   * 处理性能指标事件
   */
  private handlePerformance(data: PerformanceEventData): void {
    this.efficiencyManager.trackPerformance(
      data.metricName, 
      data.value, 
      this.normalizeUnit(data.unit), 
      {
        sessionId: data.sessionId,
        toolType: data.toolType,
        timestamp: data.timestamp,
        originalUnit: data.unit, // 保留原始单位信息
        ...data.metadata
      }
    );
  }

  /**
   * 处理注释完成事件（包含详细的几何和性能数据）
   */
  private handleAnnotationCompleted(data: AnnotationCompletedEventData): void {
    const { geometry, performance } = data;
    
    // ✅ 首先追踪标注完成事件
    const annotationType = this.mapToolToAnnotationType(data.toolType);
    this.efficiencyManager.trackAnnotation('complete', {
      annotationType,
      duration: performance.duration,
      metadata: {
        sessionId: data.sessionId,
        toolType: data.toolType,
        ...data.metadata
      }
    });
    
    // Track detailed performance metrics
    this.efficiencyManager.trackPerformance(
      `${data.toolType}_completion_duration`, 
      performance.duration, 
      'ms',
      { sessionId: data.sessionId }
    );

    if (performance.pointsPerSecond) {
      this.efficiencyManager.trackPerformance(
        `${data.toolType}_points_per_second`, 
        performance.pointsPerSecond, 
        this.normalizeUnit('points/s'),
        { sessionId: data.sessionId, originalUnit: 'points/s' }
      );
    }

    if (performance.areaPerSecond) {
      this.efficiencyManager.trackPerformance(
        `${data.toolType}_area_per_second`, 
        performance.areaPerSecond, 
        this.normalizeUnit('px²/s'),
        { sessionId: data.sessionId, originalUnit: 'px²/s' }
      );
    }

    if (performance.efficiency) {
      this.efficiencyManager.trackPerformance(
        `${data.toolType}_efficiency_ratio`, 
        performance.efficiency, 
        this.normalizeUnit('ratio'),
        { sessionId: data.sessionId, originalUnit: 'ratio' }
      );
    }

    // Track geometry metrics
    if (geometry.area) {
      this.efficiencyManager.trackPerformance(
        `${data.toolType}_annotation_area`, 
        geometry.area, 
        this.normalizeUnit('px²'),
        { sessionId: data.sessionId, originalUnit: 'px²' }
      );
    }

    if (geometry.perimeter) {
      this.efficiencyManager.trackPerformance(
        `${data.toolType}_annotation_perimeter`, 
        geometry.perimeter, 
        this.normalizeUnit('px'),
        { sessionId: data.sessionId, originalUnit: 'px' }
      );
    }

    if (geometry.dimensions) {
      this.efficiencyManager.trackPerformance(
        `${data.toolType}_annotation_width`, 
        geometry.dimensions.width, 
        this.normalizeUnit('px'),
        { sessionId: data.sessionId, originalUnit: 'px' }
      );
      
      this.efficiencyManager.trackPerformance(
        `${data.toolType}_annotation_height`, 
        geometry.dimensions.height, 
        this.normalizeUnit('px'),
        { sessionId: data.sessionId, originalUnit: 'px' }
      );
    }

    // Track point count
    this.efficiencyManager.trackPerformance(
      `${data.toolType}_point_count`, 
      geometry.points.length, 
      'count',
      { sessionId: data.sessionId }
    );
  }

  /**
   * 将工具类型映射到图像工具支持的注释类型
   */
  private mapToolToAnnotationType(toolType: string): 'rectangle' | 'polygon' | 'polyline' | 'point' | 'classification' {
    const typeMapping: Record<string, 'rectangle' | 'polygon' | 'polyline' | 'point' | 'classification'> = {
      'rect': 'rectangle',     // ✅ rect -> rectangle
      'polygon': 'polygon',    // ✅ polygon -> polygon
      'polyline': 'polyline',  // ✅ polyline -> polyline (修复：不再映射为polygon)
      'keypoint': 'point',     // ✅ keypoint -> point (修复：不再映射为polygon)
      'key-point': 'point',    // ✅ key-point -> point (支持两种写法)
      'comment-bubble': 'classification', // ✅ comment-bubble -> classification
      'iss': 'polygon',        // ✅ ISS工具映射为polygon
      'iss-rect': 'rectangle', // ✅ ISS矩形工具映射为rectangle
      'iss-points': 'point'    // ✅ ISS点工具映射为point
    };
    
    return typeMapping[toolType] || 'polygon';
  }

  /**
   * 销毁监听器
   */
  destroy(): void {
    this.eventBus.removeAllListeners(ToolEventNames.DRAW_SESSION);
    this.eventBus.removeAllListeners(ToolEventNames.EDIT_SESSION);
    this.eventBus.removeAllListeners(ToolEventNames.INTERACTION);
    this.eventBus.removeAllListeners(ToolEventNames.PERFORMANCE);
    this.eventBus.removeAllListeners(ToolEventNames.ANNOTATION_COMPLETED);
  }
} 