import type { TaskResponse } from '@/ltmApi/types/task'
import type { ProjectResponse } from '@/ltmApi/types/project'


export type LabelTypeEnum = 'rect' | 'polygon' | 'polyline';
// QC 设置相关的类型定义
export type QcCommentTypeEnum = 'area' | 'rect' | 'polygon' | 'polyline';
export type QcObjectComponentTypeEnum = 'rejectReason' | 'frameRange' | 'comment'


export interface ObjectInfoItem {
    label: string;
    propName: string;
    propType: string;
    propTypeSettings: Record<string, any>;
    canCheck?: boolean;
    valueName?: string;
}

export interface QcComponentItem {
    type: QcObjectComponentTypeEnum;
    valueName: string;
    options?: {
        label: string;
        value: string;
        forObject?: boolean;
        forNonObject?: boolean;
        description?: string;
    }[];
    params?: any;
}

export type LabelSettings = {
    [key in LabelTypeEnum]: {
        commonProps: ObjectInfoItem[];
        objectProps: ObjectInfoItem[];
    }
}

export interface QcSettings {
    frameInfo: Record<string, any>;
    annotationComponents: {
        [key in QcCommentTypeEnum]: {
            objectInfo: ObjectInfoItem[];
            objectComponents: QcComponentItem[];
        };
    };
    sensorComponents: QcComponentItem[];
    frameComponents: QcComponentItem[];
    taskComponents: QcComponentItem[];
}

export interface ProjectSettings {
    current?: boolean
    labelSettings: LabelSettings
    qcSettings: QcSettings
    toolSettings: any
}

export interface ProjectMeta {
    taskId: string
    ltmUrl: string
    phase: string
    task: TaskResponse
    project: ProjectResponse
}
