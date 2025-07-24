import { Vector2, ToolName } from './index';

/**
 * 工具事件类型定义 - 用于工具类和EFFM系统的解耦通信
 */

// 基础事件数据接口
export interface BaseToolEventData {
  toolType: ToolName;
  timestamp: number;
  sessionId: string;
}

// 绘制会话事件
export interface DrawSessionEventData extends BaseToolEventData {
  action: 'start' | 'complete' | 'cancel';
  duration?: number;
  points?: Vector2[];
  metadata?: Record<string, any>;
}

// 编辑会话事件
export interface EditSessionEventData extends BaseToolEventData {
  action: 'start' | 'complete' | 'cancel';
  objectId: string;
  duration?: number;
  metadata?: Record<string, any>;
}

// 用户交互事件
export interface InteractionEventData extends BaseToolEventData {
  interactionType: 'mouse_down' | 'mouse_move' | 'point_added' | 'key_press' | 'tool_switch';
  position?: Vector2;
  metadata?: Record<string, any>;
}

// 性能指标事件
export interface PerformanceEventData extends BaseToolEventData {
  metricName: string;
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

// 注释完成事件（包含特定工具的详细信息）
export interface AnnotationCompletedEventData extends BaseToolEventData {
  annotationType: 'rect' | 'polygon' | 'polyline' | 'keypoint' | 'comment-bubble';
  geometry: {
    points: Vector2[];
    area?: number;
    perimeter?: number;
    dimensions?: { width: number; height: number };
  };
  performance: {
    duration: number;
    pointsPerSecond?: number;
    areaPerSecond?: number;
    efficiency?: number;
  };
  metadata?: Record<string, any>;
}

// 工具事件联合类型
export type ToolEventData = 
  | DrawSessionEventData 
  | EditSessionEventData 
  | InteractionEventData 
  | PerformanceEventData 
  | AnnotationCompletedEventData;

// 事件名称枚举
export enum ToolEventNames {
  DRAW_SESSION = 'tool:draw-session',
  EDIT_SESSION = 'tool:edit-session',
  INTERACTION = 'tool:interaction',
  PERFORMANCE = 'tool:performance',
  ANNOTATION_COMPLETED = 'tool:annotation-completed'
}

// 工具事件发射器接口
export interface IToolEventEmitter {
  emitDrawSession(data: Omit<DrawSessionEventData, 'timestamp'>): void;
  emitEditSession(data: Omit<EditSessionEventData, 'timestamp'>): void;
  emitInteraction(data: Omit<InteractionEventData, 'timestamp'>): void;
  emitPerformance(data: Omit<PerformanceEventData, 'timestamp'>): void;
  emitAnnotationCompleted(data: Omit<AnnotationCompletedEventData, 'timestamp'>): void;
} 