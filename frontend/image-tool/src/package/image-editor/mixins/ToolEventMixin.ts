import { Vector2, ToolName } from '../types';
import { 
  ToolEventNames,
  IToolEventEmitter,
  DrawSessionEventData,
  EditSessionEventData,
  InteractionEventData,
  PerformanceEventData,
  AnnotationCompletedEventData
} from '../types/toolEvents';
import EventEmitter from 'eventemitter3';

/**
 * 工具事件混入类
 * 为所有工具类提供统一的事件发射功能和会话管理
 */
export class ToolEventMixin implements IToolEventEmitter {
  protected eventBus: EventEmitter;
  protected toolType: ToolName;
  
  // 会话管理
  protected currentDrawSessionId: string = '';
  protected drawStartTime: number = 0;
  protected currentEditSessionId: string = '';
  protected editStartTime: number = 0;
  
  constructor(eventBus: EventEmitter, toolType: ToolName) {
    this.eventBus = eventBus;
    this.toolType = toolType;
  }

  /**
   * 生成唯一会话ID
   */
  protected generateSessionId(): string {
    return `${this.toolType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 发射绘制会话事件
   */
  emitDrawSession(data: Omit<DrawSessionEventData, 'timestamp'>): void {
    const eventData: DrawSessionEventData = {
      ...data,
      timestamp: Date.now()
    };
    this.eventBus.emit(ToolEventNames.DRAW_SESSION, eventData);
  }

  /**
   * 发射编辑会话事件
   */
  emitEditSession(data: Omit<EditSessionEventData, 'timestamp'>): void {
    const eventData: EditSessionEventData = {
      ...data,
      timestamp: Date.now()
    };
    this.eventBus.emit(ToolEventNames.EDIT_SESSION, eventData);
  }

  /**
   * 发射交互事件
   */
  emitInteraction(data: Omit<InteractionEventData, 'timestamp'>): void {
    const eventData: InteractionEventData = {
      ...data,
      timestamp: Date.now()
    };
    this.eventBus.emit(ToolEventNames.INTERACTION, eventData);
  }

  /**
   * 发射性能指标事件
   */
  emitPerformance(data: Omit<PerformanceEventData, 'timestamp'>): void {
    const eventData: PerformanceEventData = {
      ...data,
      timestamp: Date.now()
    };
    this.eventBus.emit(ToolEventNames.PERFORMANCE, eventData);
  }

  /**
   * 发射注释完成事件
   */
  emitAnnotationCompleted(data: Omit<AnnotationCompletedEventData, 'timestamp'>): void {
    const eventData: AnnotationCompletedEventData = {
      ...data,
      timestamp: Date.now()
    };
    this.eventBus.emit(ToolEventNames.ANNOTATION_COMPLETED, eventData);
  }

  // === 便捷方法：绘制会话管理 ===

  /**
   * 开始绘制会话
   */
  protected startDrawSession(metadata?: Record<string, any>): void {
    this.currentDrawSessionId = this.generateSessionId();
    this.drawStartTime = Date.now();
    
    this.emitDrawSession({
      toolType: this.toolType,
      sessionId: this.currentDrawSessionId,
      action: 'start',
      metadata
    });
  }

  /**
   * 完成绘制会话
   */
  protected completeDrawSession(points: Vector2[], metadata?: Record<string, any>): void {
    const duration = Date.now() - this.drawStartTime;
    
    this.emitDrawSession({
      toolType: this.toolType,
      sessionId: this.currentDrawSessionId,
      action: 'complete',
      duration,
      points,
      metadata
    });
  }

  /**
   * 取消绘制会话
   */
  protected cancelDrawSession(metadata?: Record<string, any>): void {
    const duration = Date.now() - this.drawStartTime;
    
    this.emitDrawSession({
      toolType: this.toolType,
      sessionId: this.currentDrawSessionId,
      action: 'cancel',
      duration,
      metadata
    });
  }

  // === 便捷方法：编辑会话管理 ===

  /**
   * 开始编辑会话
   */
  protected startEditSession(objectId: string, metadata?: Record<string, any>): void {
    this.currentEditSessionId = this.generateSessionId();
    this.editStartTime = Date.now();
    
    this.emitEditSession({
      toolType: this.toolType,
      sessionId: this.currentEditSessionId,
      action: 'start',
      objectId,
      metadata
    });
  }

  /**
   * 完成编辑会话
   */
  protected completeEditSession(objectId: string, metadata?: Record<string, any>): void {
    const duration = Date.now() - this.editStartTime;
    
    this.emitEditSession({
      toolType: this.toolType,
      sessionId: this.currentEditSessionId,
      action: 'complete',
      objectId,
      duration,
      metadata
    });
  }

  /**
   * 取消编辑会话
   */
  protected cancelEditSession(objectId: string, metadata?: Record<string, any>): void {
    const duration = Date.now() - this.editStartTime;
    
    this.emitEditSession({
      toolType: this.toolType,
      sessionId: this.currentEditSessionId,
      action: 'cancel',
      objectId,
      duration,
      metadata
    });
  }

  // === 便捷方法：常用交互事件 ===

  /**
   * 记录鼠标点击
   */
  protected trackMouseDown(position: Vector2, metadata?: Record<string, any>): void {
    this.emitInteraction({
      toolType: this.toolType,
      sessionId: this.currentDrawSessionId || this.currentEditSessionId,
      interactionType: 'mouse_down',
      position,
      metadata
    });
  }

  /**
   * 记录点添加
   */
  protected trackPointAdded(position: Vector2, metadata?: Record<string, any>): void {
    this.emitInteraction({
      toolType: this.toolType,
      sessionId: this.currentDrawSessionId || this.currentEditSessionId,
      interactionType: 'point_added',
      position,
      metadata
    });
  }

  /**
   * 记录工具切换
   */
  protected trackToolSwitch(metadata?: Record<string, any>): void {
    this.emitInteraction({
      toolType: this.toolType,
      sessionId: '',
      interactionType: 'tool_switch',
      metadata
    });
  }

  // === 便捷方法：几何计算 ===

  /**
   * 计算多边形面积（鞋带公式）
   */
  protected calculatePolygonArea(points: Vector2[]): number {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }

  /**
   * 计算多边形周长
   */
  protected calculatePolygonPerimeter(points: Vector2[]): number {
    if (points.length < 2) return 0;
    
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }

  /**
   * 计算矩形尺寸
   */
  protected calculateRectDimensions(points: Vector2[]): { width: number; height: number } {
    if (points.length < 2) return { width: 0, height: 0 };
    
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    
    return {
      width: maxX - minX,
      height: maxY - minY
    };
  }
} 