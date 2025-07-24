import type { ObjectInfoItem } from '@/stores/types/projectMeta'

// 属性编辑器组件的 props 接口
export interface PropertyEditorProps {
  modelValue: any
  propSetting: ObjectInfoItem
  selectedObject?: any
  typeSettings?: any
  highlightColor?: string // 高亮颜色，用于质检时标记错误的属性
}

// 属性变化事件的数据结构
export interface PropertyChangeEvent {
  selectedObject: any
  propSetting: ObjectInfoItem
  oldValue: any
  newValue: any
}

// 视图模式枚举
export enum ViewMode {
  COMPONENT = 'component',
  JSON = 'json'
} 