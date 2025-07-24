// 数据验证工具函数

import { TrackerEvent, BaseEvent } from '../types/events';
import { EfficiencyTrackerConfig } from '../types/config';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationRule<T = any> {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean;
  message?: string;
}

export class DataValidator {
  private rules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // 基础事件验证规则
    this.addRules('BaseEvent', [
      { field: 'eventId', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'timestamp', required: true, type: 'number', min: 0 },
      { field: 'userId', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'projectId', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'taskId', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'toolType', required: true, type: 'string', validator: (value) => ['pc-tool', 'image-tool', 'text-tool'].includes(value) },
      { field: 'sessionId', required: true, type: 'string', minLength: 1, maxLength: 100 },
    ]);

    // 标注事件验证规则
    this.addRules('AnnotationEvent', [
      { field: 'type', required: true, type: 'string', validator: (value) => value === 'annotation' },
      { field: 'action', required: true, type: 'string', validator: (value) => ['start', 'complete', 'modify', 'delete', 'save'].includes(value) },
      { field: 'annotationType', required: true, type: 'string', validator: (value) => ['cuboid', 'polygon', 'polyline', 'point', 'text', 'classification'].includes(value) },
      { field: 'duration', required: false, type: 'number', min: 0 },
    ]);

    // 性能事件验证规则
    this.addRules('PerformanceEvent', [
      { field: 'type', required: true, type: 'string', validator: (value) => value === 'performance' },
      { field: 'metricName', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'value', required: true, type: 'number' },
      { field: 'unit', required: true, type: 'string', validator: (value) => ['ms', 'fps', 'mb', 'count'].includes(value) },
    ]);

    // 用户交互事件验证规则
    this.addRules('UserInteractionEvent', [
      { field: 'type', required: true, type: 'string', validator: (value) => value === 'interaction' },
      { field: 'action', required: true, type: 'string', validator: (value) => ['click', 'drag', 'scroll', 'keyboard', 'mouse_move'].includes(value) },
      { field: 'element', required: true, type: 'string', minLength: 1 },
    ]);

    // 后台计算事件验证规则
    this.addRules('BackendComputationEvent', [
      { field: 'type', required: true, type: 'string', validator: (value) => value === 'backend_computation' },
      { field: 'computationType', required: true, type: 'string', validator: (value) => ['auto_annotation', 'model_inference', 'data_processing', 'quality_check'].includes(value) },
      { field: 'status', required: true, type: 'string', validator: (value) => ['start', 'progress', 'complete', 'error'].includes(value) },
      { field: 'computationId', required: true, type: 'string', minLength: 1 },
    ]);

    // 任务状态事件验证规则
    this.addRules('TaskStatusEvent', [
      { field: 'type', required: true, type: 'string', validator: (value) => value === 'task_status' },
      { field: 'status', required: true, type: 'string', validator: (value) => ['assigned', 'started', 'paused', 'resumed', 'completed', 'submitted', 'reviewed'].includes(value) },
    ]);

    // 错误事件验证规则
    this.addRules('ErrorEvent', [
      { field: 'type', required: true, type: 'string', validator: (value) => value === 'error' },
      { field: 'errorType', required: true, type: 'string', validator: (value) => ['runtime', 'network', 'validation', 'ui', 'performance'].includes(value) },
      { field: 'message', required: true, type: 'string', minLength: 1 },
      { field: 'severity', required: true, type: 'string', validator: (value) => ['low', 'medium', 'high', 'critical'].includes(value) },
    ]);

    // 工具效率事件验证规则
    this.addRules('ToolEfficiencyEvent', [
      { field: 'type', required: true, type: 'string', validator: (value) => value === 'tool_efficiency' },
      { field: 'toolAction', required: true, type: 'string', minLength: 1 },
      { field: 'startTime', required: true, type: 'number', min: 0 },
      { field: 'endTime', required: true, type: 'number', min: 0 },
      { field: 'duration', required: true, type: 'number', min: 0 },
      { field: 'success', required: true, type: 'boolean' },
    ]);

    // 配置验证规则
    this.addRules('EfficiencyTrackerConfig', [
      { field: 'apiEndpoint', required: true, type: 'string', minLength: 1 },
      { field: 'userId', required: true, type: 'string', minLength: 1 },
      { field: 'projectId', required: true, type: 'string', minLength: 1 },
      { field: 'taskId', required: true, type: 'string', minLength: 1 },
      { field: 'toolType', required: true, type: 'string', validator: (value) => ['pc-tool', 'image-tool', 'text-tool'].includes(value) },
      { field: 'batchSize', required: true, type: 'number', min: 1, max: 1000 },
      { field: 'flushInterval', required: true, type: 'number', min: 1000, max: 300000 },
      { field: 'maxRetries', required: true, type: 'number', min: 0, max: 10 },
      { field: 'retryDelay', required: true, type: 'number', min: 100, max: 30000 },
    ]);
  }

  /**
   * 添加验证规则
   */
  addRules(eventType: string, rules: ValidationRule[]): void {
    this.rules.set(eventType, rules);
  }

  /**
   * 验证单个事件
   */
  validateEvent(event: TrackerEvent): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // 首先验证基础事件字段
      const baseValidation = this.validateObject(event, 'BaseEvent');
      result.errors.push(...baseValidation.errors);
      result.warnings.push(...baseValidation.warnings);

      // 然后验证具体事件类型
      const eventTypeValidation = this.validateObject(event, this.getEventTypeName(event));
      result.errors.push(...eventTypeValidation.errors);
      result.warnings.push(...eventTypeValidation.warnings);

      // 验证时间戳的合理性
      if (event.timestamp > Date.now() + 60000) {
        result.warnings.push('Event timestamp is in the future');
      }

      // 验证事件ID的唯一性格式
      if (event.eventId && !this.isValidEventId(event.eventId)) {
        result.errors.push('Invalid event ID format');
      }

      result.isValid = result.errors.length === 0;
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error.message}`);
    }

    return result;
  }

  /**
   * 验证事件批次
   */
  validateEventBatch(events: TrackerEvent[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!Array.isArray(events)) {
      result.isValid = false;
      result.errors.push('Events must be an array');
      return result;
    }

    if (events.length === 0) {
      result.warnings.push('Empty event batch');
      return result;
    }

    if (events.length > 1000) {
      result.warnings.push('Large event batch (>1000 events)');
    }

    // 验证每个事件
    events.forEach((event, index) => {
      const eventValidation = this.validateEvent(event);
      if (!eventValidation.isValid) {
        result.isValid = false;
        result.errors.push(`Event ${index}: ${eventValidation.errors.join(', ')}`);
      }
      result.warnings.push(...eventValidation.warnings.map(w => `Event ${index}: ${w}`));
    });

    // 检查事件ID重复
    const eventIds = events.map(e => e.eventId);
    const duplicateIds = eventIds.filter((id, index) => eventIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      result.errors.push(`Duplicate event IDs: ${duplicateIds.join(', ')}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * 验证配置对象
   */
  validateConfig(config: EfficiencyTrackerConfig): ValidationResult {
    return this.validateObject(config, 'EfficiencyTrackerConfig');
  }

  /**
   * 验证对象
   */
  private validateObject(obj: any, ruleName: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const rules = this.rules.get(ruleName);
    if (!rules) {
      result.warnings.push(`No validation rules found for ${ruleName}`);
      return result;
    }

    for (const rule of rules) {
      const fieldValue = obj[rule.field];

      // 检查必填字段
      if (rule.required && (fieldValue === undefined || fieldValue === null)) {
        result.errors.push(`Field '${rule.field}' is required`);
        result.isValid = false;
        continue;
      }

      // 如果字段不存在且不是必填，跳过其他验证
      if (fieldValue === undefined || fieldValue === null) {
        continue;
      }

      // 类型验证
      if (rule.type && !this.validateType(fieldValue, rule.type)) {
        result.errors.push(`Field '${rule.field}' must be of type ${rule.type}`);
        result.isValid = false;
        continue;
      }

      // 字符串长度验证
      if (rule.type === 'string') {
        if (rule.minLength !== undefined && fieldValue.length < rule.minLength) {
          result.errors.push(`Field '${rule.field}' must be at least ${rule.minLength} characters long`);
          result.isValid = false;
        }
        if (rule.maxLength !== undefined && fieldValue.length > rule.maxLength) {
          result.errors.push(`Field '${rule.field}' must be no more than ${rule.maxLength} characters long`);
          result.isValid = false;
        }
      }

      // 数值范围验证
      if (rule.type === 'number') {
        if (rule.min !== undefined && fieldValue < rule.min) {
          result.errors.push(`Field '${rule.field}' must be at least ${rule.min}`);
          result.isValid = false;
        }
        if (rule.max !== undefined && fieldValue > rule.max) {
          result.errors.push(`Field '${rule.field}' must be no more than ${rule.max}`);
          result.isValid = false;
        }
      }

      // 正则表达式验证
      if (rule.pattern && !rule.pattern.test(String(fieldValue))) {
        result.errors.push(`Field '${rule.field}' does not match required pattern`);
        result.isValid = false;
      }

      // 自定义验证函数
      if (rule.validator && !rule.validator(fieldValue)) {
        result.errors.push(rule.message || `Field '${rule.field}' failed custom validation`);
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * 验证数据类型
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * 获取事件类型名称
   */
  private getEventTypeName(event: TrackerEvent): string {
    const typeMap: Record<string, string> = {
      'annotation': 'AnnotationEvent',
      'performance': 'PerformanceEvent',
      'interaction': 'UserInteractionEvent',
      'backend_computation': 'BackendComputationEvent',
      'task_status': 'TaskStatusEvent',
      'error': 'ErrorEvent',
      'tool_efficiency': 'ToolEfficiencyEvent',
    };

    return typeMap[event.type] || 'BaseEvent';
  }

  /**
   * 验证事件ID格式
   */
  private isValidEventId(eventId: string): boolean {
    // 事件ID应该是字母数字字符和下划线的组合
    const pattern = /^[a-zA-Z0-9_-]+$/;
    return pattern.test(eventId) && eventId.length > 0 && eventId.length <= 100;
  }
}

/**
 * 快速验证函数
 */
export function validateEvent(event: TrackerEvent): ValidationResult {
  const validator = new DataValidator();
  return validator.validateEvent(event);
}

export function validateEventBatch(events: TrackerEvent[]): ValidationResult {
  const validator = new DataValidator();
  return validator.validateEventBatch(events);
}

export function validateConfig(config: EfficiencyTrackerConfig): ValidationResult {
  const validator = new DataValidator();
  return validator.validateConfig(config);
}

/**
 * 数据清理函数
 */
export function sanitizeEvent(event: TrackerEvent): TrackerEvent {
  const sanitized = { ...event };

  // 清理字符串字段
  if (sanitized.eventId) {
    sanitized.eventId = String(sanitized.eventId).trim();
  }

  if (sanitized.userId) {
    sanitized.userId = String(sanitized.userId).trim();
  }

  if (sanitized.projectId) {
    sanitized.projectId = String(sanitized.projectId).trim();
  }

  if (sanitized.taskId) {
    sanitized.taskId = String(sanitized.taskId).trim();
  }

  if (sanitized.sessionId) {
    sanitized.sessionId = String(sanitized.sessionId).trim();
  }

  // 确保时间戳是数字
  if (sanitized.timestamp) {
    sanitized.timestamp = Number(sanitized.timestamp);
    if (isNaN(sanitized.timestamp)) {
      sanitized.timestamp = Date.now();
    }
  }

  return sanitized;
}

/**
 * 数据脱敏函数
 */
export function anonymizeEvent(event: TrackerEvent): TrackerEvent {
  const anonymized = { ...event };

  // 脱敏用户ID（保留前3位和后3位）
  if (anonymized.userId && anonymized.userId.length > 6) {
    const start = anonymized.userId.substring(0, 3);
    const end = anonymized.userId.substring(anonymized.userId.length - 3);
    anonymized.userId = `${start}***${end}`;
  }

  // 移除可能包含敏感信息的元数据
  if (anonymized.metadata) {
    const cleanMetadata = { ...anonymized.metadata };
    delete cleanMetadata.userName;
    delete cleanMetadata.email;
    delete cleanMetadata.phoneNumber;
    delete cleanMetadata.ipAddress;
    anonymized.metadata = cleanMetadata;
  }

  return anonymized;
} 