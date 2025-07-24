// 基础事件接口
export interface BaseEvent {
  eventId: string;
  timestamp: number;
  userId: string;
  projectId: string;
  taskId: string;
  toolType: 'pc-tool' | 'image-tool' | 'text-tool';
  sessionId: string;
}

// 标注行为事件
export interface AnnotationEvent extends BaseEvent {
  type: 'annotation';
  action: 'start' | 'complete' | 'modify' | 'delete' | 'save';
  annotationType: 'cuboid' | 'polygon' | 'polyline' | 'point' | 'text' | 'classification' | 'segmentation';
  objectId?: string;
  duration?: number; // 毫秒
  position?: {
    x: number;
    y: number;
    z?: number;
  };
  metadata?: Record<string, any>;
}

// 性能监控事件
export interface PerformanceEvent extends BaseEvent {
  type: 'performance';
  metricName: string;
  value: number;
  unit: 'ms' | 'fps' | 'mb' | 'count';
  context?: {
    renderMode?: string;
    dataSize?: number;
    complexity?: number;
  };
}

// 用户交互事件
export interface UserInteractionEvent extends BaseEvent {
  type: 'interaction';
  action: 'click' | 'drag' | 'scroll' | 'keyboard' | 'mouse_move';
  element: string;
  duration?: number;
  position?: {
    x: number;
    y: number;
  };
  keyCode?: string;
  modifiers?: string[];
}

// 后台计算事件
export interface BackendComputationEvent extends BaseEvent {
  type: 'backend_computation';
  computationType: 'auto_annotation' | 'model_inference' | 'data_processing' | 'quality_check';
  status: 'start' | 'progress' | 'complete' | 'error';
  duration?: number;
  progress?: number; // 0-100
  resultSize?: number;
  errorMessage?: string;
  computationId: string;
}

// 任务状态事件
export interface TaskStatusEvent extends BaseEvent {
  type: 'task_status';
  status: 'assigned' | 'started' | 'paused' | 'resumed' | 'completed' | 'submitted' | 'reviewed';
  previousStatus?: string;
  timeSpent?: number;
  completionPercentage?: number;
  qualityScore?: number;
}

// 错误事件
export interface ErrorEvent extends BaseEvent {
  type: 'error';
  errorType: 'runtime' | 'network' | 'validation' | 'ui' | 'performance';
  message: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

// 工具效率事件
export interface ToolEfficiencyEvent extends BaseEvent {
  type: 'tool_efficiency';
  toolAction: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  retryCount?: number;
  errorReason?: string;
  metadata?: Record<string, any>;
}

// 联合事件类型
export type TrackerEvent = 
  | AnnotationEvent 
  | PerformanceEvent 
  | UserInteractionEvent 
  | BackendComputationEvent 
  | TaskStatusEvent 
  | ErrorEvent 
  | ToolEfficiencyEvent;

// 批量上报数据结构
export interface BatchEventData {
  events: TrackerEvent[];
  metadata: {
    batchId: string;
    timestamp: number;
    userAgent: string;
    screenResolution: string;
    timeZone: string;
  };
} 