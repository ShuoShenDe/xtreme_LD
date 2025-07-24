// 评论参数相关的类型定义
export interface AnnotationProps {
    id?: number
    annotation_type?: string
    __sensorTopicId__?: string
    __topicId__?: string
    x1?: number
    y1?: number
    [key: string]: any
}

export interface SensorProps {
    topicId?: string
    topicName?: string
    type?: string
    [key: string]: any
}

export interface CommentProps {
    sensorTopicId: string
    type: string
    timestamp: number
    position: {
        x: number
        y: number
        z: number
    }
    [key: string]: any
}

export interface ObjectPropChecks {
    [key: string]: boolean
}

export interface StatusItem {
    operator: string
    created: string
    status: string
}

export interface FrameRange {
    type: 'custom' | 'current' | 'last'
    start: number
    end: number
}

export interface BubbleConfig {
    x: number
    y: number
    width?: number
    height?: number
    tailWidth?: number
    tailHeight?: number
}

export interface CommentParams {
    annotationProps?: AnnotationProps
    sensorProps?: SensorProps
    commentProps?: CommentProps
    objectPropChecks?: ObjectPropChecks
    rejectReasons?: string[]
    frameRange?: FrameRange
    status?: StatusItem[]
    bubbleConfig?: BubbleConfig
    [key: string]: any
}

export interface CommentAttributes {
    category: string
    belong: string
    parent: string | null
    content: string
    params?: CommentParams
    type?: 'object' | 'area' | 'frame' | 'sensor' | 'task'
    target?: string
    frames?: (string | number)[]
    version?: string | number
    creator: string
    created: string
    updated: string
}

export interface CommentData {
    type: 'comments'
    id: string
    attributes: CommentAttributes
    links?: {
        self: string
    }
}

// 基础响应类型
export interface BaseCommentResponse {
    jsonapi?: {
        version: string
    }
    links?: {
        self: string
    }
    included?: CommentData[]
}

// 单一评论响应类型
export interface SingleCommentResponse extends BaseCommentResponse {
    data: CommentData
}

// 多个评论响应类型
export interface MultipleCommentsResponse extends BaseCommentResponse {
    data: CommentData[]
}

// 兼容性类型，保持向后兼容
export interface CommentResponse extends BaseCommentResponse {
    data: CommentData | CommentData[]
}

export interface CommentFilter {
    category?: string
    belong?: string | undefined
    parent?: string | null
    creator?: string
    [key: string]: string | null | undefined
}

export interface CreateCommentData {
    category: string
    belong: string
    parent?: string
    content: string
    type?: string
    target?: string
    frames?: (string | number)[]
    version?: string | number
    params?: CommentParams
    [key: string]: any
}

export interface UpdateCommentData {
    status?: string
    category?: string
    belong?: string
    parent?: string
    content?: string
    type?: string
    target?: string
    frames?: (string | number)[]
    version?: string | number
    params?: CommentParams
    [key: string]: any
}
