import { v4 as uuid } from 'uuid';
import {
  AnnotateObject,
  utils as EditorUtils,
  IPolygonInnerConfig,
  IUserData,
  KeyPoint,
  Line,
  Polygon,
  Rect,
  Iss,
  SourceType,
  ToolType,
} from 'image-editor';
import Editor from '../common/Editor';
import { IContour, IObjectInfo } from '../types';
import { checkPoints } from './common';
import { UnifiedMaskData, UnifiedMaskQuery } from './unified-mask-builder';
import { IssDataUtil } from './iss-data-util';
// Import EFFM
import { imageToolEfficiency } from '@efficiency/index';

// Restore multi-channel mask from backend compressed data
async function restoreMultiChannelFromBackend(backendData: any): Promise<any> {
  try {
    const { MaskUtils } = await import('./multi-channel-mask');
    
    const restored = {
      version: backendData.version || '2.0',
      width: backendData.dimensions?.width || 0,
      height: backendData.dimensions?.height || 0,
      channels: {} as any,
      metadata: backendData.metadata || {}
    };
    
    // Restore compressed channels
    if (backendData.channels) {
      // Decompress foreground channel
      if (backendData.channels.foreground?.compressed) {
        restored.channels.foreground = {
          data: MaskUtils.decompressChannel(backendData.channels.foreground.data),
          type: backendData.channels.foreground.type
        };
      } else if (backendData.channels.foreground?.data) {
        restored.channels.foreground = backendData.channels.foreground;
      }
      
      // Decompress instance ID channel
      if (backendData.channels.instance_id?.compressed) {
        restored.channels.instance_id = {
          data: MaskUtils.decompressChannel(backendData.channels.instance_id.data),
          type: backendData.channels.instance_id.type
        };
      } else if (backendData.channels.instance_id?.data) {
        restored.channels.instance_id = backendData.channels.instance_id;
      }
      
      // Restore other channels as-is (they were sampled, not full data)
      ['visibility', 'confidence', 'semantic'].forEach(channelName => {
        if (backendData.channels[channelName]) {
          restored.channels[channelName] = backendData.channels[channelName];
        }
      });
    }
    
    // Multi-channel data restored from backend
    
    return restored;
    
  } catch (error) {
    console.warn('Failed to decompress multi-channel data:', error);
    
    // Simple fallback
    return {
      version: backendData.version || '2.0',
      width: backendData.dimensions?.width || 0,
      height: backendData.dimensions?.height || 0,
      channels: {},
      metadata: backendData.metadata || {},
      fallback: true
    };
  }
}

export async function convertObject2Annotate(editor: Editor, objects: IObjectInfo[]) {
  const annotates = [] as AnnotateObject[];
  
  // Track conversion start
  const conversionStartTime = Date.now();
  const efficiencyManager = imageToolEfficiency;
  efficiencyManager.trackPerformance('conversion_start', conversionStartTime, 'ms', {
    timestamp: conversionStartTime,
    totalObjects: objects.length,
    issObjectCount: objects.filter(obj => IssDataUtil.isIssType(obj.classAttributes?.type)).length
  });
  
  for (const e of objects) {
    const obj = e.classAttributes;
    const contour = (obj.contour || {}) as IContour;
    
    // 特殊处理ISS_UNIFIED类型（系统只有ISS_UNIFIED类型）
    if (IssDataUtil.isIssType(obj.type)) {
      const unifiedAnnotates = await convertUnifiedMaskToAnnotates(obj, e, editor);
      annotates.push(...unifiedAnnotates);
      continue;
    }
    
    const classConfig = editor.getClassType(obj.classId || '');

    const userData: IUserData = {
      ...obj?.meta,
      backId: obj.backId,
      classId: classConfig ? classConfig.id : '',
      classType: classConfig ? classConfig.name : '',
      attrs: arrayToObj(obj.classValues),
      modelClass: obj.modelClass,
      confidence: obj.modelConfidence,
      trackId: obj.trackId,
      trackName: obj.trackName,
      sourceId: obj.sourceId || String(e.sourceId) || editor.state.defaultSourceId,
      sourceType: obj.sourceType || e.sourceType || SourceType.DATA_FLOW,
      createdAt: obj.createdAt,
      createdBy: obj.createdBy,
      version: obj.version,
    };
    const points = checkPoints(contour.points || []);
    const interior = contour.interior || [];
    const pointsLen = points.length;
    const type = obj.type.toLocaleUpperCase();
    let annotate;
    
    switch (type) {
      case ToolType.RECTANGLE:
      case ToolType.BOUNDING_BOX:
        if (pointsLen >= 2) {
          const rectOption = EditorUtils.getRectFromPointsWithRotation(points);
          annotate = new Rect({ ...rectOption, points });
        }
        break;
      case ToolType.POLYGON:
        if (pointsLen >= 3) {
          const pointsOrder = EditorUtils.countPointsOrder(points);
          const innerPoints: IPolygonInnerConfig[] = [];
          interior.forEach((e: any) => {
            let filters = checkPoints(e.coordinate || e.points || []);
            if (filters.length >= 3) {
              if (EditorUtils.countPointsOrder(filters) === pointsOrder) filters.reverse();
              innerPoints.push({ points: filters });
            }
          });
          annotate = new Polygon({ points, innerPoints });
        }
        break;
      // 注意：系统只有ISS_UNIFIED类型，不应该有直接的ISS类型
      case ToolType.POLYLINE:
        if (pointsLen > 1) annotate = new Line({ points });
        break;
      case ToolType.KEY_POINT:
        if (pointsLen > 0) annotate = new KeyPoint({ ...points[0] });
        break;
    }
    if (!annotate) continue;
    annotate.uuid = obj.id || uuid();
    annotate.userData = userData;
    annotates.push(annotate);
  }
  
  // Track conversion completion
  efficiencyManager.trackPerformance('conversion_success', Date.now() - conversionStartTime, 'ms', {
    timestamp: Date.now(),
    duration: Date.now() - conversionStartTime,
    processedObjects: annotates.length,
    unifiedMaskObjects: annotates.filter(obj => obj.toolType === ToolType.ISS).length
  });
  
  return annotates;
}

/**
 * 将ISS_UNIFIED对象转换为多个ISS标注对象
 */
async function convertUnifiedMaskToAnnotates(obj: any, objectInfo: IObjectInfo, editor: Editor): Promise<AnnotateObject[]> {
  const annotates = [] as AnnotateObject[];
  const contour = obj.contour || {};
  const unifiedMaskData = (contour as any).unifiedMaskData as UnifiedMaskData;
  
  if (!unifiedMaskData) {
    console.error('No unified mask data found in ISS_UNIFIED object:', obj.id);
    return annotates;
  }
  
  // Track unified mask conversion start
  const conversionStartTime = Date.now();
  const efficiencyManager = imageToolEfficiency;
  efficiencyManager.trackPerformance('unified_mask_conversion_start', Date.now(), 'ms', {
    timestamp: conversionStartTime,
    objectId: obj.id,
    instanceCount: Object.keys(unifiedMaskData.instances).length
  });
  
  try {
    // 为每个实例创建ISS对象
    const instances = Object.values(unifiedMaskData.instances);
    
    for (const instance of instances) {
      const classConfig = editor.getClassType(String(instance.classId));
      
      // 转换多边形点为ISS格式
      const issPoints: number[] = [];
      instance.polygonPoints.forEach(p => {
        issPoints.push(p.x, p.y);
      });
      
      // 🔧 关键修复：从保存的tracking信息中恢复原始的trackId和trackName
      let originalTrackId = obj.trackId;
      let originalTrackName = obj.trackName;
      
      // 如果有保存的tracking信息，则优先使用原始的trackId/trackName
      const trackingKey = String(instance.id);
      if (unifiedMaskData.trackingInfo && unifiedMaskData.trackingInfo[trackingKey]) {
        const savedTrackingInfo = unifiedMaskData.trackingInfo[trackingKey];
        originalTrackId = savedTrackingInfo.trackId;
        originalTrackName = savedTrackingInfo.trackName;
      } else {
        // 如果没有保存的tracking信息，则使用fallback逻辑
        originalTrackId = obj.trackId ? `${obj.trackId}_inst_${instance.id}` : `iss_${instance.id}_${Date.now()}`;
        originalTrackName = undefined; // 让initIDInfo生成新的trackName
      }
      
      // 创建ISS对象
      const issObject = new Iss({ points: issPoints as any });
      // 🔧 修复：确保每个ISS实例都有唯一的UUID，避免ID重复
      issObject.uuid = `iss_${obj.id || 'unknown'}_inst_${instance.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 设置用户数据
      const userData: IUserData = {
        ...obj?.meta,
        backId: obj.backId,
        classId: classConfig ? classConfig.id : String(instance.classId),
        classType: classConfig ? classConfig.name : instance.className,
        attrs: arrayToObj(obj.classValues),
        modelClass: obj.modelClass,
        confidence: instance.confidence,
        // 🔧 关键修复：使用恢复的原始trackId和trackName
        trackId: originalTrackId, 
        trackName: originalTrackName, // 如果有原始trackName则使用，否则让initIDInfo生成
        sourceId: obj.sourceId || String(objectInfo.sourceId) || editor.state.defaultSourceId,
        sourceType: obj.sourceType || objectInfo.sourceType || SourceType.DATA_FLOW,
        createdAt: instance.createdAt || obj.createdAt,
        createdBy: obj.createdBy,
        version: obj.version,
        
        // ISS特定数据
        instanceId: instance.id,
        regionId: `restored_region_${instance.id}`,
        semanticLabel: instance.classId,
        hasUnifiedMask: true,
        unifiedMaskData: unifiedMaskData,
        
        // ISS元数据
        issMetadata: {
          instanceId: instance.id,
          confidence: instance.confidence,
          isVisible: instance.isVisible,
          semanticLabel: instance.classId,
          createdAt: instance.createdAt
        },
        hasIssMetadata: true
      };
      
      issObject.userData = userData;
      
      annotates.push(issObject);
    }
        
    // Track unified mask conversion success
    efficiencyManager.trackPerformance('unified_mask_conversion_success', Date.now() - conversionStartTime, 'ms', {
      timestamp: Date.now(),
      duration: Date.now() - conversionStartTime,
      createdObjects: annotates.length,
      originalInstanceCount: Object.keys(unifiedMaskData.instances).length
    });
    
    return annotates;
    
  } catch (error) {
    console.error('❌ Failed to convert ISS_UNIFIED to annotates:', error);
    
    // Track unified mask conversion error
    efficiencyManager.trackError({
      errorType: 'runtime',
      message: error.message,
      severity: 'medium',
      context: {
        timestamp: Date.now(),
        error: error.message,
        duration: Date.now() - conversionStartTime,
        objectId: obj.id
      }
    });
    
    return annotates;
  }
}

function arrayToObj(data: any[] = []) {
  const values = {} as Record<string, any>;
  if (!Array.isArray(data)) return values;

  data.forEach((e) => {
    if (Array.isArray(e)) return;
    values[e.id] = e;
  });
  return values;
}
