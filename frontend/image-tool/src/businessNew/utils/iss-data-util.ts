/**
 * ISS数据处理工具类 - 前端版本
 * 对应后端的IssDataExportUtil，提供ISS类型检查和验证功能
 */

import { ObjectType, EnhancedContour, MultiChannelMaskData } from '../types/export';
import { UnifiedMaskData } from './unified-mask-builder';

/**
 * ISS数据处理工具类
 */
export class IssDataUtil {
  
  /**
   * 检查对象是否为ISS类型
   * 
   * @param objectType 对象类型
   * @returns 是否为ISS类型
   */
  static isIssType(objectType: string): boolean {
    return objectType === ObjectType.ISS_UNIFIED;
  }

  /**
   * 检查对象是否为3D类型
   * 
   * @param objectType 对象类型
   * @returns 是否为3D类型
   */
  static is3DType(objectType: string): boolean {
    return objectType === ObjectType.THREE_D_BOX ||
           objectType === ObjectType.THREE_D_POLYGON ||
           objectType === ObjectType.THREE_D_POLYLINE ||
           objectType === ObjectType.THREE_D_SEGMENTATION ||
           objectType === 'POLYGON_3D' ||
           objectType === 'POLYLINE_3D' ||
           objectType === 'SEGMENTATION_3D';
  }

  /**
   * 验证ISS数据的完整性
   * 
   * @param contour 轮廓数据
   * @returns 验证结果
   */
  static validateIssData(contour: EnhancedContour | any): boolean {
    if (!contour) {
      return false;
    }

    // 检查是否包含必要的ISS字段
    return !!(contour.multiChannelMask ||
              contour.issMetadata ||
              contour.area ||
              contour.unifiedMaskData); // 支持ISS_UNIFIED格式
  }

  /**
   * 验证3D数据的完整性
   * 
   * @param contour 轮廓数据
   * @returns 验证结果
   */
  static validate3DData(contour: EnhancedContour | any): boolean {
    if (!contour) {
      return false;
    }

    // 检查是否包含3D坐标点
    const points = contour.points3D || contour.points;
    if (!points || !Array.isArray(points) || points.length === 0) {
      return false;
    }

    // 验证第一个点是否包含Z坐标
    try {
      const firstPoint = points[0];
      if (typeof firstPoint === 'object' && firstPoint !== null) {
        return 'z' in firstPoint;
      }
    } catch (error) {
      console.warn('Failed to validate 3D data:', error);
    }

    return false;
  }

  /**
   * 验证ISS_UNIFIED数据的完整性
   * 
   * @param contour 轮廓数据
   * @returns 验证结果
   */
  static validateIssUnifiedData(contour: EnhancedContour | any): boolean {
    if (!contour) {
      return false;
    }

    // 检查是否包含ISS_UNIFIED必要字段
    const unifiedMaskData = contour.unifiedMaskData as UnifiedMaskData;
    if (!unifiedMaskData) {
      return false;
    }

    // 验证instances数据
    const instances = unifiedMaskData.instances;
    return !!(instances && Object.keys(instances).length > 0);
  }

  /**
   * 处理ISS数据
   * 
   * @param contour 轮廓数据
   * @param objectData 对象数据
   */
  static processIssData(contour: EnhancedContour | any, objectData: any): void {
    if (!contour) {
      return;
    }

    try {
      // 提取multiChannelMask数据
      if (contour.multiChannelMask) {
        objectData.multiChannelMask = contour.multiChannelMask;
      }

      // 提取ISS元数据
      if (contour.issMetadata) {
        objectData.issMetadata = contour.issMetadata;
      }

      // 处理面积计算（针对ISS区域）
      if (contour.area !== undefined) {
        objectData.area = contour.area;
      }

    } catch (error) {
      console.error('Error processing ISS data for object:', objectData.id, error);
    }
  }

  /**
   * 处理ISS_UNIFIED数据
   * 
   * @param contour 轮廓数据
   * @param objectData 对象数据
   */
  static processIssUnifiedData(contour: EnhancedContour | any, objectData: any): void {
    if (!contour) {
      return;
    }

    try {
      // 保留原始的unifiedMaskData
      if (contour.unifiedMaskData) {
        objectData.unifiedMaskData = contour.unifiedMaskData;
      }

      // 保留压缩掩码数据
      if (contour.compressedMask) {
        if (!objectData.multiChannelMask) {
          objectData.multiChannelMask = {};
        }
        objectData.multiChannelMask.compressedMask = contour.compressedMask;
      }

      // 处理ISS元数据
      if (contour.issMetadata) {
        objectData.issMetadata = contour.issMetadata;
      }

    } catch (error) {
      console.error('Error processing ISS_UNIFIED data for object:', objectData.id, error);
    }
  }

  /**
   * 处理3D数据
   * 
   * @param contour 轮廓数据
   * @param objectData 对象数据
   * @param objectType 对象类型
   */
  static process3DData(contour: EnhancedContour | any, objectData: any, objectType: string): void {
    if (!contour) {
      return;
    }

    try {
      // 处理3D点数据
      if (contour.points3D && Array.isArray(contour.points3D)) {
        objectData.points3D = contour.points3D;

      }

      // 处理高度信息
      if (contour.height !== undefined) {
        objectData.height = contour.height;

      }

      // 处理Z坐标
      if (contour.zCoordinate !== undefined || contour.z !== undefined) {
        objectData.zCoordinate = contour.zCoordinate ?? contour.z;

      }

      // 处理3D旋转信息
      if (contour.rotation3D) {
        objectData.rotation3D = contour.rotation3D;

      }

    } catch (error) {
      console.error(`Error processing 3D data for object: ${objectData.id} of type: ${objectType}`, error);
    }
  }

  /**
   * 获取对象类型的友好名称
   * 
   * @param objectType 对象类型
   * @returns 友好名称
   */
  static getObjectTypeName(objectType: string): string {
    switch (objectType) {
      case ObjectType.ISS_UNIFIED:
        return 'Instance Semantic Segmentation (Unified)';
      case ObjectType.THREE_D_BOX:
        return '3D Bounding Box';
      case ObjectType.THREE_D_POLYGON:
        return '3D Polygon';
      case ObjectType.THREE_D_POLYLINE:
        return '3D Polyline';
      case ObjectType.THREE_D_SEGMENTATION:
        return '3D Segmentation';
      case ObjectType.BOUNDING_BOX:
        return 'Bounding Box';
      case ObjectType.POLYGON:
        return 'Polygon';
      case ObjectType.POLYLINE:
        return 'Polyline';
      default:
        return objectType;
    }
  }

  /**
   * 检查对象是否支持指定的功能
   * 
   * @param objectType 对象类型
   * @param feature 功能名称
   * @returns 是否支持
   */
  static supportsFeature(objectType: string, feature: 'multiChannelMask' | 'issMetadata' | '3DCoordinates' | 'rotation3D'): boolean {
    switch (feature) {
      case 'multiChannelMask':
      case 'issMetadata':
        return this.isIssType(objectType);
      case '3DCoordinates':
      case 'rotation3D':
        return this.is3DType(objectType);
      default:
        return false;
    }
  }
}

// 导出便捷函数
export const isIssType = IssDataUtil.isIssType;
export const is3DType = IssDataUtil.is3DType;
export const validateIssData = IssDataUtil.validateIssData;
export const validate3DData = IssDataUtil.validate3DData;
export const validateIssUnifiedData = IssDataUtil.validateIssUnifiedData;
export const processIssData = IssDataUtil.processIssData;
export const processIssUnifiedData = IssDataUtil.processIssUnifiedData;
export const process3DData = IssDataUtil.process3DData;

export default IssDataUtil; 