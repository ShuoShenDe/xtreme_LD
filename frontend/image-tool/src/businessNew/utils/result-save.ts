/**
 *
 */
import Editor from '../common/Editor';
import { IClassificationAttr, IContour, IObject, IObjectBasicInfo, ISaveFormat } from '../types';
import {
  AnnotateObject,
  IFrame,
  utils as EditorUtils,
  IAttrOption,
  ToolType,
  Rect,
  Vector2,
  IPolygonInnerConfig,
  Polygon,
  SourceType,
} from 'image-editor';
import { checkPoints, empty, fixed, validNumber } from './common';
import { classificationToSave } from './class';
import { UnifiedMaskData } from './unified-mask-builder';
import { IssDataUtil } from './iss-data-util';
import { ObjectType } from '../types/export';
// Import EFFM
import { imageToolEfficiency } from '@efficiency/index';

// Get singleton instance
const efficiencyManager = imageToolEfficiency;

// Handle ISS object with unified mask storage
async function handleISSObject(object: AnnotateObject, returnContour: IContour, editor: Editor, allIssObjects: AnnotateObject[]) {
  // Track ISS save operation start
  const saveStartTime = Date.now();
  efficiencyManager.trackPerformance('iss_save_start', Date.now(), 'ms', {
    timestamp: saveStartTime,
    objectId: object.uuid,
    objectType: 'ISS',
    unifiedMaskEnabled: true
  });
  
  try {
    // 检查是否是第一个ISS对象处理
    const isFirstIssObject = allIssObjects.indexOf(object) === 0;
    
    if (!isFirstIssObject) {
      // Track skip for non-first ISS objects
      efficiencyManager.trackPerformance('iss_save_skip', 1, 'count', {
        timestamp: Date.now(),
        objectId: object.uuid,
        reason: 'unified_mask_already_processed'
      });
      return null; // 跳过后续的ISS对象，因为已经在统一掩码中处理
    }
    
    // 尝试从ISS工具获取统一掩码数据
    const issToolData = await getUnifiedMaskFromISSObjects(allIssObjects, editor);
    
    if (issToolData) {
      // 创建ISS_UNIFIED格式的contour
      returnContour.unifiedMaskData = issToolData;
      returnContour.points = issToolData.combinedBoundingBox || [];
      returnContour.area = issToolData.totalArea || 0;
      
      // 添加ISS元数据
      (returnContour as any).issMetadata = {
        storageType: 'unified_mask',
        instanceCount: issToolData.metadata.totalInstances,
        imageSize: {
          width: issToolData.imageDimensions.width,
          height: issToolData.imageDimensions.height
        },
        createdAt: issToolData.metadata.createdAt,
        updatedAt: issToolData.metadata.updatedAt
      };
      
      // Track successful unified mask save
      efficiencyManager.trackPerformance('iss_unified_save_success', Date.now() - saveStartTime, 'ms', {
        timestamp: Date.now(),
        duration: Date.now() - saveStartTime,
        instanceCount: issToolData.metadata.totalInstances,
        totalArea: issToolData.totalArea,
        dataSize: JSON.stringify(issToolData).length
      });
      
      return 'ISS_UNIFIED'; // 返回特殊标记表示这是统一掩码对象
    } else {
      // 回退到基本ISS处理
      await handleBasicISSObject(object, returnContour, editor);
      
      // Track basic ISS save
      efficiencyManager.trackPerformance('iss_basic_save_success', Date.now() - saveStartTime, 'ms', {
        timestamp: Date.now(),
        duration: Date.now() - saveStartTime,
        objectId: object.uuid,
        fallbackReason: 'unified_mask_not_available'
      });
      
      return 'ISS';
    }
  } catch (error) {
    // Track ISS save error
    efficiencyManager.trackError({
      errorType: 'runtime',
      message: error.message,
      severity: 'medium',
      context: {
        timestamp: Date.now(),
        error: error.message,
        objectId: object.uuid,
        duration: Date.now() - saveStartTime
      }
    });
    throw error;
  }
}

// 从所有ISS对象获取统一掩码数据
async function getUnifiedMaskFromISSObjects(issObjects: AnnotateObject[], editor: Editor): Promise<UnifiedMaskData | null> {
  try {
    // 方法1：收集所有ISS对象的实例数据并重新构建全局构建器
    const allInstances = new Map<number, any>();
    const allRegions = new Map<string, any>();
    const allClasses = new Map<number, any>();
    let imageId = '';
    let imageWidth = 0;
    let imageHeight = 0;
    
    // 🔧 新增：收集原始tracking信息
    const originalTrackingInfo = new Map<string, any>();
    
    // 收集所有实例数据
    for (let i = 0; i < issObjects.length; i++) {
      const issObject = issObjects[i];
      const userData = editor.getUserData(issObject);
      
              // 🔧 保存原始tracking信息（为每个ISS对象保存）
        if (userData) {
          // 🔧 关键修复：统一使用UUID转换的数字作为instanceId和trackingKey
          // 这样保存和加载时的key就一致了
          const uniqueInstanceId = uuidToNumber(issObject.uuid);
          const trackingKey = String(uniqueInstanceId);
          
          originalTrackingInfo.set(trackingKey, {
            trackId: userData.trackId,
            trackName: userData.trackName,
            originalUuid: issObject.uuid
          });
        }
      
      // 🔧 关键修复：处理所有ISS对象，无论它们是否有hasUnifiedMask或unifiedMaskBuilder
      if (userData) {
        
        // 从构建器获取数据（如果存在）
        if (userData.hasUnifiedMask && userData.unifiedMaskBuilder) {
          const builderDebugInfo = userData.unifiedMaskBuilder.getDebugInfo();
          
          // 收集图像信息
          if (!imageId) {
            imageId = builderDebugInfo.imageId;
            imageWidth = userData.unifiedMaskBuilder.imageWidth || editor.mainView?.backgroundWidth || 1920;
            imageHeight = userData.unifiedMaskBuilder.imageHeight || editor.mainView?.backgroundHeight || 1080;
          }
          
          // 收集所有实例（避免重复）
          // builderDebugInfo.instances.forEach(([id, instance]: [any, any]) => {
          //   if (!allInstances.has(id)) {
          //     allInstances.set(id, instance);
          //   }
          // });
           
          // 收集所有区域
          builderDebugInfo.regions.forEach(([regionId, region]: [any, any]) => {
            allRegions.set(regionId, region);
          });
           
          // 收集所有类别
          builderDebugInfo.classes.forEach(([classId, classData]: [any, any]) => {
            allClasses.set(classId, classData);
          });
        }
        
        // 🔧 关键修复：为所有ISS对象创建实例数据，无论它们是否有unifiedMaskBuilder
        // 这确保了所有ISS对象的tracking信息都能被保存
        const classConfig = editor.getClassType(userData.classId || '');
        
        // 从对象点创建实例数据
        let points: Vector2[] = [];
        if (Array.isArray(issObject.attrs.points)) {
          const numberPoints = issObject.attrs.points as unknown as number[];
          for (let j = 0; j < numberPoints.length; j += 2) {
            points.push({ x: numberPoints[j], y: numberPoints[j + 1] });
          }
        }
        
        if (points.length > 0) {
          // 🔧 关键修复：确保使用相同的UUID转换逻辑
          const uniqueInstanceId = uuidToNumber(issObject.uuid);
          
          // 检查是否已经存在（避免重复添加）
          if (!allInstances.has(uniqueInstanceId)) {
            const instanceData = {
              id: uniqueInstanceId,
              classId: userData.classId || classConfig?.id || 0,
              className: userData.classType || classConfig?.name || 'Unknown',
        
              confidence: userData.confidence || 1.0,
              area: (issObject as any).getArea() || 0,
              boundingBox: calculateBoundingBoxFromPoints(points),
              polygonPoints: points,
              isVisible: true,
              createdAt: new Date().toISOString()
            };
            
            allInstances.set(uniqueInstanceId, instanceData);
          }
        }
      }
    }
    
    // 如果收集到了实例数据，重新构建全局构建器
    if (allInstances.size > 0) {
      
      const { UnifiedMaskBuilder } = await import('./unified-mask-builder');
      const globalBuilder = new UnifiedMaskBuilder(
        imageId || `image_${Date.now()}`,
        imageWidth,
        imageHeight
      );
      
      // 添加所有收集到的实例
      Array.from(allInstances.values()).forEach((instance, index) => {
        const region = {
          id: `global_region_${instance.id}`,
          instanceId: instance.id,
          classId: instance.classId,
          className: instance.className,
          confidence: instance.confidence,
          polygonPoints: instance.polygonPoints,
          isVisible: instance.isVisible,
          createdAt: instance.createdAt
        };
        
        globalBuilder.addSegmentationRegion(region);
      });
      
      // 导出全局统一掩码数据
      const unifiedMaskData = globalBuilder.build();
      
      // 🔧 添加原始tracking信息到统一掩码数据中
      const trackingInfoRecord: Record<string, any> = {};
      originalTrackingInfo.forEach((trackInfo, instanceId) => {
        trackingInfoRecord[instanceId] = trackInfo;
      });
      
      // 计算组合边界框（用于主要轮廓点）
      const combinedBoundingBox = calculateCombinedBoundingBox(Object.values(unifiedMaskData.instances));
      
      // 计算总面积
      const totalArea = Object.values(unifiedMaskData.instances).reduce((sum, instance) => sum + instance.area, 0);
      
      return {
        ...unifiedMaskData,
        trackingInfo: trackingInfoRecord, // 🔧 保存原始tracking信息
        combinedBoundingBox,
        totalArea
      } as UnifiedMaskData & { combinedBoundingBox: Vector2[]; totalArea: number };
    }
    
    try {
      const imageView = editor?.mainView?.currentView;
      if (imageView && imageView.toolManager) {
        const issTool = imageView.toolManager.tools.find((tool: any) => tool.name === 'iss');
        if (issTool && issTool.unifiedMaskBuilder) {
          const unifiedMaskData = issTool.unifiedMaskBuilder.build();
          
          // 计算组合边界框和总面积
          const combinedBoundingBox = calculateCombinedBoundingBox(Object.values(unifiedMaskData.instances));
          const totalArea = Object.values(unifiedMaskData.instances).reduce((sum, instance) => sum + instance.area, 0);
          
          return {
            ...unifiedMaskData,
            combinedBoundingBox,
            totalArea
          } as UnifiedMaskData & { combinedBoundingBox: Vector2[]; totalArea: number };
        }
      }
    } catch (toolError) {
      console.warn('Failed to get builder from ISS tool:', toolError);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get unified mask from ISS objects:', error);
    return null;
  }
}

// 计算组合边界框
function calculateCombinedBoundingBox(instances: any[]): Vector2[] {
  if (instances.length === 0) return [];
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  instances.forEach(instance => {
    const bbox = instance.boundingBox;
    minX = Math.min(minX, bbox.x);
    maxX = Math.max(maxX, bbox.x + bbox.width);
    minY = Math.min(minY, bbox.y);
    maxY = Math.max(maxY, bbox.y + bbox.height);
  });
  
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY }
  ];
}

// 从点集合计算边界框
function calculateBoundingBoxFromPoints(points: Vector2[]): { x: number; y: number; width: number; height: number } {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// 将 UUID 字符串转换为唯一的数字 ID
function uuidToNumber(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 65536;
}

// 基本ISS对象处理（回退方案）
async function handleBasicISSObject(object: AnnotateObject, returnContour: IContour, editor: Editor) {
  // 转换点格式
  let issPointsToProcess: Vector2[] = [];
  if (Array.isArray(object.attrs.points)) {
    const numberPoints = object.attrs.points as unknown as number[];
    for (let i = 0; i < numberPoints.length; i += 2) {
      issPointsToProcess.push({ x: numberPoints[i], y: numberPoints[i + 1] });
    }
  }
  
  const checkedIssPoints = checkPoints(issPointsToProcess);
  const realIssPoints = EditorUtils.getShapeRealPoint(object, checkedIssPoints);
  
  // 保存基本多边形数据
  returnContour.points = realIssPoints;
  returnContour.area = fixed((object as any).getArea(), 0) || 0;
  
  // 获取用户数据和类别配置
  const userData = editor.getUserData(object);
  const classConfig = editor.getClassType(userData.classId || '');
  
  // 保存基本ISS元数据
  const basicIssData = {
    instanceId: userData.instanceId || Date.now() % 65535,
    confidence: userData.confidence || 1.0,
    isVisible: true,
    semanticLabel: classConfig?.id ? parseInt(classConfig.id) : 0,
    imageSize: {
      width: editor.mainView?.backgroundWidth || 1920,
      height: editor.mainView?.backgroundHeight || 1080
    },
    createdAt: new Date().toISOString()
  };
  (returnContour as any).issMetadata = basicIssData;
  
  // Saving basic ISS object with metadata
}

// Optimize multi-channel mask data for backend transmission
async function optimizeMultiChannelForBackend(mask: any): Promise<any> {
  try {
    const { MaskUtils } = await import('./multi-channel-mask');
    
    // Use compression to reduce data size
    const optimized = {
      version: mask.version || '2.0',
      instanceId: mask.metadata?.instanceId || Date.now() % 65535,
      dimensions: { 
        width: mask.width, 
        height: mask.height 
      },
      channels: {
        // Compress foreground channel
        foreground: mask.channels.foreground ? {
          data: MaskUtils.compressChannel(mask.channels.foreground.data),
          type: mask.channels.foreground.type,
          compressed: true
        } : null,
        
        // Compress instance ID channel
        instance_id: mask.channels.instance_id ? {
          data: MaskUtils.compressChannel(mask.channels.instance_id.data),
          type: mask.channels.instance_id.type,
          compressed: true
        } : null,
        
        // Store metadata channels without compression (small data)
        visibility: mask.channels.visibility ? {
          data: mask.channels.visibility.data.slice(0, 100), // Sample data
          type: mask.channels.visibility.type,
          compressed: false
        } : null,
        
        confidence: mask.channels.confidence ? {
          data: mask.channels.confidence.data.slice(0, 100), // Sample data
          type: mask.channels.confidence.type,
          compressed: false
        } : null,
        
        semantic: mask.channels.semantic ? {
          data: mask.channels.semantic.data.slice(0, 100), // Sample data
          type: mask.channels.semantic.type,
          compressed: false
        } : null
      },
      metadata: {
        ...mask.metadata,
        optimizedAt: new Date().toISOString(),
        originalSize: mask.channels.foreground?.data?.length || 0
      }
    };
    
    // Multi-channel data optimized for backend
    
    return optimized;
    
  } catch (error) {
    console.warn('Failed to optimize multi-channel data:', error);
    
    // Simple fallback optimization
    return {
      version: mask.version || '2.0',
      instanceId: mask.metadata?.instanceId || Date.now() % 65535,
      dimensions: { width: mask.width, height: mask.height },
      metadata: mask.metadata,
      fallback: true
    };
  }
}

function objToArray(obj: Record<string, any> = {}, attrMap: Map<string, any>) {
  const data = [] as any[];
  Object.keys(obj).forEach((key) => {
    const objAttr = obj[key];
    const attr = attrMap.get(key);
    if (empty(objAttr.value) || !attr) return;
    const option = attr?.options?.find((e: IAttrOption) => e.name == objAttr.value) as IAttrOption;
    const hasChild = option?.attributes && option.attributes.length > 0;
    data.push({
      id: key,
      pid: attr.parent,
      name: attr.name || '',
      value: objAttr.value,
      alias: attr.alias || '',
      isLeaf: !hasChild,
      type: attr?.type,
    });
  });
  return data;
}
function updateObjectVersion(obj: AnnotateObject) {
  if (!obj.updateTime || !obj.lastTime) return;
  let version = (validNumber(obj.version) ? obj.version : 0) as number;
  if (obj.updateTime > obj.lastTime) {
    version++;
  }
  obj.lastTime = obj.updateTime;
  obj.version = version;
}
async function getContourData(object: AnnotateObject, editor: Editor, allObjects?: AnnotateObject[]) {
  const returnContour: IContour = {};
  const pos = object.position();
  switch (object.toolType) {
    case ToolType.BOUNDING_BOX:
      const rect = object as Rect;
      returnContour.points = checkPoints(EditorUtils.getRotatedRectPoints(rect));
      returnContour.area = fixed(rect.getArea(), 0) || 0;
      let r = object.rotation() || 0;
      r = r < 0 ? 360 + r : r;
      returnContour.rotation = fixed(r, 1);
      break;
    case ToolType.KEY_POINT:
      returnContour.points = [{ ...pos }];
      break;
    case ToolType.POLYGON:
    case ToolType.POLYLINE:
      const objectPoints = checkPoints(object.attrs.points);
      returnContour.points = EditorUtils.getShapeRealPoint(object, objectPoints);
      
      const objectInnerPoints = object.attrs.innerPoints as IPolygonInnerConfig[];
      if (objectInnerPoints) {
        const innerPoints = [] as { points: Vector2[] }[];
        objectInnerPoints.forEach((inner) => {
          let _points = checkPoints(inner.points);
          _points = EditorUtils.getShapeRealPoint(object, _points);
          innerPoints.push({ points: _points });
        });
        returnContour.interior = innerPoints;
      }
      if (object instanceof Polygon) {
        returnContour.area = fixed((object as any).getArea(), 0) || 0;
      }
      break;
      
    case ToolType.ISS:
      // 特殊处理ISS对象 - 支持统一掩码存储
      const issObjects = allObjects?.filter(obj => obj.toolType === ToolType.ISS) || [object];
      const issProcessResult = await handleISSObject(object, returnContour, editor, issObjects);
      
      if (issProcessResult === null) {
        return null; // 跳过此对象（已在统一掩码中处理）
      }
      break;
  }
  return returnContour;
}

export async function convertAnnotate2Object(editor: Editor, annotates: AnnotateObject[]) {
  const objects = [] as IObject[];
  const processedIssObjects = new Set<string>(); // 跟踪已处理的ISS对象
  
  // Track conversion start
  const conversionStartTime = Date.now();
  efficiencyManager.trackPerformance('conversion_start', Date.now(), 'ms', {
    timestamp: conversionStartTime,
    totalObjects: annotates.length,
    issObjectCount: annotates.filter(obj => obj.toolType === ToolType.ISS).length
  });

  for (const obj of annotates) {
    // 跳过已处理的ISS对象
    if (obj.toolType === ToolType.ISS && processedIssObjects.has(obj.uuid)) {
      continue;
    }
    
    const userData = editor.getUserData(obj);
    const classConfig = editor.getClassType(userData.classId || '');

    // updateVersion
    updateObjectVersion(obj);

    const contour = await getContourData(obj, editor, annotates);
    
    // 如果返回null，跳过此对象
    if (contour === null) {
      continue;
    }

    const newInfo: IObject = {
      backId: userData.backId,
      classId: classConfig?.id || '',
      classValues: objToArray(editor.getValidAttrs(userData) || {}, editor.attrMap),
      contour: contour,
      id: obj.uuid,
      meta: {
        classType: userData.classType || '',
        color: classConfig?.color || '',
      },
      sourceId: userData.sourceId || editor.state.defaultSourceId,
      sourceType: userData.sourceType || SourceType.DATA_FLOW,
      trackId: userData.trackId,
      trackName: userData.trackName,
      type: (contour as any).unifiedMaskData ? 'ISS_UNIFIED' as any : obj.toolType, // 设置正确的类型
    };
    
    // 如果是ISS_UNIFIED，标记所有相关的ISS对象为已处理
    if ((contour as any).unifiedMaskData) {
      annotates.filter(o => o.toolType === ToolType.ISS).forEach(issObj => {
        processedIssObjects.add(issObj.uuid);
      });
    }
    
    objects.push(newInfo);
  }
  
  // Track conversion completion
  efficiencyManager.trackPerformance('conversion_success', Date.now() - conversionStartTime, 'ms', {
    timestamp: Date.now(),
    duration: Date.now() - conversionStartTime,
    processedObjects: objects.length,
    unifiedMaskObjects: objects.filter(obj => obj.type === 'ISS_UNIFIED').length
  });
  
  return objects;
}
export async function getDataFlowSaveData(editor: Editor, frames?: IFrame[]) {
  if (!frames) frames = editor.state.frames;
  const dataMap: Record<string, ISaveFormat> = {};
  
  for (const frame of frames) {
    const id = String(frame.id);
    const objectInfos: IObjectBasicInfo[] = [];

    // result object
    const arr = editor.state.annotateModeList;
    for (const type of arr) {
      const annitates = editor.dataManager.getFrameObject(frame.id, type) || [];
      const objects = await convertAnnotate2Object(editor, annitates);
      objects.forEach((e) => {
        objectInfos.push({
          classAttributes: e,
          classId: +e.classId,
          frontId: e.id,
          id: e.backId,
          sourceId: +e.sourceId,
          sourceType: e.sourceType,
        });
      });
    }
    
    const dataAnnotations: any[] = [];
    frame.classifications.forEach((classification) => {
      let values = classificationToSave(classification);
      dataAnnotations.push({
        classificationId: classification.id,
        classificationAttributes: {
          id: classification.id,
          values: values,
        },
      });
    });
    dataMap[id] = {
      dataAnnotations: dataAnnotations,
      dataId: id,
      objects: objectInfos,
    };
  }
  
  const saveDatas = Object.values(dataMap);
  return { saveDatas };
}
