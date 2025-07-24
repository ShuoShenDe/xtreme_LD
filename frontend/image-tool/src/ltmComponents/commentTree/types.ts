// CommentTree 组件相关的类型定义

export interface Label {
  id: string;
  content: string;
  textColor: string;
  backgroundColor: string;
}

export interface CommentData {
  id: string;
  commentVersion: string;
  creator: string;
  created: string;
  parrentId: string;
  parrentCreator: string;
  content: string;
  labels: Label[];
  replyLevel?: number;  // 添加回复层级字段
}

// 标签颜色常量
export const LABEL_COLORS = {
  SENSOR_TEXT: {
    text: '#409eff',
    background: '#ecf5ff'
  },
  OBJECT_TEXT: {
    text: '#409eff',
    background: '#ecf5ff'
  },
  PROP_ERROR_TEXT: {
    text: '#e6a23c',
    background: '#fdf6ec'
  },
  REJECT_TEXT: {
    text: '#f56c6c',
    background: '#fef0f0'
  },
  STATUS_TEXT: {
    text: '#67c23a',
    background: '#f0f9eb'
  }
} as const;
