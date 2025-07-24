import { Vector2 } from 'image-editor';

/**
 * 导出数据格式枚举
 */
export enum ExportFormat {
  XTREME1 = 'XTREME1',
  COCO = 'COCO',
  ISS_ENHANCED = 'ISS_ENHANCED', // 支持ISS数据的增强格式
  THREE_D_ENHANCED = '3D_ENHANCED' // 支持3D数据的增强格式
}

/**
 * 对象类型枚举（扩展版）
 */
export enum ObjectType {
  // 2D 类型
  BOUNDING_BOX = 'BOUNDING_BOX',
  POLYGON = 'POLYGON',
  POLYLINE = 'POLYLINE',
  
  // 3D 类型
  THREE_D_BOX = '3D_BOX',
  THREE_D_POLYGON = '3D_POLYGON',
  THREE_D_POLYLINE = '3D_POLYLINE',
  THREE_D_SEGMENTATION = '3D_SEGMENTATION',
  
  // ISS 类型 - 只支持 UNIFIED 格式
  ISS_UNIFIED = 'ISS_UNIFIED'
}

/**
 * 3D点坐标
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 3D旋转信息
 */
export interface Rotation3D {
  pitch: number;  // X轴旋转
  yaw: number;    // Y轴旋转  
  roll: number;   // Z轴旋转
}

/**
 * ISS多通道掩码数据
 */
export interface MultiChannelMaskData {
  width: number;
  height: number;
  channels: {
    [channelName: string]: {
      data: number[];
      dataType: 'uint8' | 'uint16' | 'float32';
      description?: string;
    };
  };
  pixelAttributes?: PixelAttribute[];
  metadata: MaskMetadata;
}

/**
 * 像素级属性
 */
export interface PixelAttribute {
  id?: number;
  visible?: boolean;
  confidence?: number;
  category?: number;
  [key: string]: any;
}

/**
 * 掩码元数据
 */
export interface MaskMetadata {
  version: string;
  created: string;
  compressed: boolean;
  totalChannels: number;
  totalInstances: number;
  totalPixels: number;
  annotatedPixels: number;
}

/**
 * 增强的轮廓数据接口
 */
export interface EnhancedContour {
  // 基础字段
  points?: Vector2[];
  interior?: { points: Vector2[] }[];
  rotation?: number;
  area?: number;
  
  // ISS相关字段
  multiChannelMask?: MultiChannelMaskData;
  issMetadata?: {
    instanceId: number;
    classId: number;
    confidence: number;
    [key: string]: any;
  };
  
  // 3D相关字段
  points3D?: Point3D[];
  zCoordinate?: number;
  height?: number;
  rotation3D?: Rotation3D;
  
  // 导出标记
  exportType?: '2D' | '3D' | 'ISS';
  coordinateSystem?: '2D_IMAGE' | '3D_WORLD' | 'ISS_PIXEL';
}

/**
 * 增强的对象数据接口
 */
export interface EnhancedObjectData {
  id: string;
  type: ObjectType;
  classId: number;
  className: string;
  trackId?: string;
  trackName?: string;
  contour: EnhancedContour;
  classValues?: any;
  modelConfidence?: number;
  modelClass?: string;
  
  // ISS特有字段
  multiChannelMask?: MultiChannelMaskData;
  issMetadata?: any;
  
  // 3D特有字段
  points3D?: Point3D[];
  zCoordinate?: number;
  height?: number;
  rotation3D?: Rotation3D;
}

/**
 * 导出配置接口
 */
export interface ExportConfig {
  format: ExportFormat;
  includeISSMasks: boolean;
  include3DCoordinates: boolean;
  compressMasks: boolean;
  includeMetadata: boolean;
  coordinateSystem: '2D_IMAGE' | '3D_WORLD' | 'ISS_PIXEL';
}

/**
 * 导出结果接口
 */
export interface ExportResult {
  dataId: string | number;
  dataName: string;
  format: ExportFormat;
  objects: EnhancedObjectData[];
  metadata: {
    exportTime: string;
    version: string;
    totalObjects: number;
    issObjectCount: number;
    threeDObjectCount: number;
    coordinateSystem: string;
  };
}

/**
 * 导入配置接口
 */
export interface ImportConfig {
  format: ExportFormat;
  validateISSData: boolean;
  validate3DData: boolean;
  autoFixCoordinates: boolean;
  preserveMetadata: boolean;
}

/**
 * 导入结果接口
 */
export interface ImportResult {
  success: boolean;
  importedObjects: number;
  skippedObjects: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

/**
 * 导入错误接口
 */
export interface ImportError {
  objectId: string;
  type: 'INVALID_ISS_DATA' | 'INVALID_3D_DATA' | 'MISSING_COORDINATES' | 'UNSUPPORTED_FORMAT';
  message: string;
  details?: any;
}

/**
 * 导入警告接口
 */
export interface ImportWarning {
  objectId: string;
  type: 'DOWNGRADED_3D_TO_2D' | 'MISSING_ISS_METADATA' | 'COORDINATE_ADJUSTMENT';
  message: string;
  details?: any;
}

/**
 * 数据验证接口
 */
export interface DataValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  issDataValid?: boolean;
  threeDDataValid?: boolean;
  coordinatesValid?: boolean;
} 