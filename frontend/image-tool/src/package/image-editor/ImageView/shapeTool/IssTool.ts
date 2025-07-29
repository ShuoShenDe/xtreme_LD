import Konva from 'konva';
import { AnnotateModeEnum, ToolAction, ToolName, Vector2 } from '../../types';
import { Cursor, Event, defaultCircleConfig } from '../../configs';
import ShapeTool from './ShapeTool';
import ImageView from '../index';
import { Anchor, Line, Iss, Shape } from '../shape';
import * as utils from '../../utils';
import { UnifiedMaskBuilder, SegmentationRegion, UnifiedMaskData } from '../../../../businessNew/utils/unified-mask-builder';
import UpdateTransform from '../../common/CmdManager/cmd/UpdateTransform';
// Import EFFM
import { imageToolEfficiency } from '@efficiency/index';

/**
 * ISS (Instance Semantic Segmentation) Tool
 * 物体语义分割工具 - 用于标注单个物体的语义分割区域
 */
export default class IssTool extends ShapeTool {
  name = ToolName.iss;
  toolMode = AnnotateModeEnum.SEGMENTATION; // ISS工具属于SEGMENTATION模式
  points: Vector2[] = [];
  // draw
  declare holder: Iss;
  declare currentAnchor: Anchor;
  declare anchors: Konva.Group;
  declare lines: Konva.Group;
  // edit
  declare object?: Iss;
  declare editAnchors: Konva.Group;
  transform: Konva.Transformer = new Konva.Transformer({
    rotateEnabled: false,
    centeredScaling: true,
    borderDash: [5, 5],
    borderStroke: '#fff',
    anchorStroke: '#fff',
    anchorSize: 8,
    anchorCornerRadius: 4,
  });
  // drag
  dragging = false;
  dragObject!: any;
  dragLastPos: Vector2 | undefined;

  // 统一掩码管理
  private unifiedMaskBuilder?: UnifiedMaskBuilder;
  private imageId: string;
  private nextRegionId = 1;
  
  // EFFM 详细时间追踪
  private efficiencyManager = imageToolEfficiency;
  
  // 多边形级别的时间追踪
  private polygonStartTime: number = 0;
  private polygonSessionId: string = '';
  private pointAdditionTimes: number[] = [];
  
  // 帧级别的时间追踪
  private frameAnnotationStartTime: number = 0;
  private frameSessionId: string = '';
  private framePolygonCount: number = 0;
  private frameCompletedPolygons: Array<{
    id: string;
    duration: number;
    pointCount: number;
    area: number;
  }> = [];
  
  // 用户空闲时间追踪
  private lastActivityTime: number = 0;
  private idleThreshold: number = 3000; // 3秒无操作视为空闲
  private idleStartTime: number = 0;
  private totalIdleTime: number = 0;
  private isIdle: boolean = false;
  
  // 编辑模式时间追踪
  private editStartTime: number = 0;
  private editSessionId: string = '';

  constructor(view: ImageView) {
    super(view);
    this.imageId = `frame_${Date.now()}`;
    this.initializeComponents();
    this.initializeUnifiedMaskBuilder();
    this.changeEvent = 'absoluteTransformChange pointsChange transform';
    
    this.initEditEvent();
    this.initializeTimeTracking();
    throw new Error('Intentional test error for CI pipeline verification'); // when ci find, just delete this line
  }

  private initializeComponents() {
    this.holder = new Iss();
    this.currentAnchor = new Anchor({ visible: false });
    this.anchors = new Konva.Group();
    this.lines = new Konva.Group();
    this.editAnchors = new Konva.Group();
    
    this.drawGroup.add(this.holder, this.anchors, this.lines, this.currentAnchor);
    this.editGroup.add(this.editAnchors, this.transform);
  }
  
  private initializeUnifiedMaskBuilder() {
    const editor = this.view.editor;
    const imageWidth = editor.mainView?.backgroundWidth || 1920;
    const imageHeight = editor.mainView?.backgroundHeight || 1080;
    
    this.unifiedMaskBuilder = new UnifiedMaskBuilder(this.imageId, imageWidth, imageHeight);
    
    // UnifiedMaskBuilder initialized
  }

  /**
   * 初始化时间追踪系统
   */
  private initializeTimeTracking(): void {
    this.lastActivityTime = Date.now();
    this.frameAnnotationStartTime = Date.now();
    this.frameSessionId = this.generateSessionId();
    
    // 启动空闲时间监控
    this.startIdleTimeMonitoring();
    
    // 追踪帧标注开始
    this.trackFrameAnnotationStart();
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `iss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 启动空闲时间监控
   */
  private startIdleTimeMonitoring(): void {
    setInterval(() => {
      this.checkIdleStatus();
    }, 1000); // 每秒检查一次
  }

  /**
   * 检查用户空闲状态
   */
  private checkIdleStatus(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    
    if (timeSinceLastActivity >= this.idleThreshold && !this.isIdle) {
      // 开始空闲
      this.isIdle = true;
      this.idleStartTime = this.lastActivityTime + this.idleThreshold;
      
      this.efficiencyManager.trackInteraction('idle_start', {
        timestamp: this.idleStartTime,
        metadata: {
          lastActivityTime: this.lastActivityTime,
          frameSessionId: this.frameSessionId
        }
      });
    } else if (timeSinceLastActivity < this.idleThreshold && this.isIdle) {
      // 结束空闲
      this.isIdle = false;
      const idleDuration = now - this.idleStartTime;
      this.totalIdleTime += idleDuration;
      
      this.efficiencyManager.trackInteraction('idle_end', {
        timestamp: now,
        metadata: {
          idleDuration,
          totalIdleTime: this.totalIdleTime,
          frameSessionId: this.frameSessionId,
          duration: idleDuration
        }
      });
      
      this.efficiencyManager.trackPerformance('idle_time', idleDuration, 'ms', {
        type: 'single_idle_period',
        frameSessionId: this.frameSessionId
      });
    }
  }

  /**
   * 记录用户活动
   */
  private recordActivity(activityType: string, metadata?: Record<string, any>): void {
    const now = Date.now();
    this.lastActivityTime = now;
    
    this.efficiencyManager.trackInteraction(activityType, {
      timestamp: now,
      metadata: {
        ...metadata,
        frameSessionId: this.frameSessionId,
        polygonSessionId: this.polygonSessionId
      }
    });
  }

  /**
   * 追踪帧标注开始
   */
  private trackFrameAnnotationStart(): void {
    this.efficiencyManager.trackAnnotation('start', {
      annotationType: 'polygon',
      metadata: {
        frameSessionId: this.frameSessionId,
        toolType: 'iss',
        level: 'frame',
        timestamp: this.frameAnnotationStartTime
      }
    });
  }

  /**
   * 追踪帧标注完成
   */
  private trackFrameAnnotationComplete(): void {
    const now = Date.now();
    const frameDuration = now - this.frameAnnotationStartTime;
    
    // 计算帧统计信息
    const totalPolygonDuration = this.frameCompletedPolygons.reduce((sum, p) => sum + p.duration, 0);
    const averagePolygonDuration = this.frameCompletedPolygons.length > 0 
      ? totalPolygonDuration / this.frameCompletedPolygons.length 
      : 0;
    const totalPolygonPoints = this.frameCompletedPolygons.reduce((sum, p) => sum + p.pointCount, 0);
    const totalPolygonArea = this.frameCompletedPolygons.reduce((sum, p) => sum + p.area, 0);
    
    this.efficiencyManager.trackAnnotation('complete', {
      annotationType: 'polygon',
      duration: frameDuration,
      metadata: {
        frameSessionId: this.frameSessionId,
        toolType: 'iss',
        level: 'frame',
        polygonCount: this.framePolygonCount,
        totalPolygonDuration,
        averagePolygonDuration,
        totalPolygonPoints,
        totalPolygonArea,
        totalIdleTime: this.totalIdleTime,
        activeTime: frameDuration - this.totalIdleTime,
        efficiencyRatio: (frameDuration - this.totalIdleTime) / frameDuration,
        timestamp: now
      }
    });
    
    // 记录性能指标
    this.efficiencyManager.trackPerformance('frame_annotation_duration', frameDuration, 'ms', {
      frameSessionId: this.frameSessionId,
      polygonCount: this.framePolygonCount
    });
    
    this.efficiencyManager.trackPerformance('frame_total_idle_time', this.totalIdleTime, 'ms', {
      frameSessionId: this.frameSessionId,
      idleRatio: this.totalIdleTime / frameDuration
    });
    
    this.efficiencyManager.trackPerformance('frame_efficiency_ratio', (frameDuration - this.totalIdleTime) / frameDuration, 'count', {
      frameSessionId: this.frameSessionId,
      activeTime: frameDuration - this.totalIdleTime
    });
  }

  doing(): boolean {
    return this.points.length > 0;
  }

  validPoint(p: Vector2, referPoint?: Vector2) {
    return this.points.length < 5000;
  }

  // draw0
  draw() {
    this.clearDraw();
    this.clearEvent();
    this.initEvent();
    this.drawGroup.show();
    
    this.initializeOrRestoreMaskBuilder();
    this.onDrawStart();
    
    // 开始多边形标注追踪
    this.startPolygonAnnotation();
  }

  /**
   * 开始多边形标注
   */
  private startPolygonAnnotation(): void {
    this.polygonStartTime = Date.now();
    this.polygonSessionId = this.generateSessionId();
    this.pointAdditionTimes = [];
    
    this.efficiencyManager.trackAnnotation('start', {
      annotationType: 'polygon',
      metadata: {
        polygonSessionId: this.polygonSessionId,
        frameSessionId: this.frameSessionId,
        toolType: 'iss',
        level: 'polygon',
        timestamp: this.polygonStartTime
      }
    });
    
    this.recordActivity('polygon_start', {
      polygonSessionId: this.polygonSessionId
    });
  }

  /**
   * 初始化或恢复掩码构建器
   */
  private initializeOrRestoreMaskBuilder(): void {
    try {
      const dataRestored = this.loadExistingUnifiedMaskData();
      if (!dataRestored && !this.unifiedMaskBuilder) {
        this.initializeUnifiedMaskBuilder();
      }
    } catch (error) {
      console.error('Failed to initialize or restore mask builder:', error);
    }
  }

  stopDraw() {
    this.clearDraw();
    this.clearEvent();
    this.drawGroup.hide();
    this.onDrawEnd();
    
    // 如果有未完成的多边形，记录为取消
    if (this.polygonStartTime > 0) {
      this.trackPolygonCancellation();
    }
  }

  /**
   * 追踪多边形取消
   */
  private trackPolygonCancellation(): void {
    const now = Date.now();
    const duration = now - this.polygonStartTime;
    
    this.efficiencyManager.trackAnnotation('delete', {
      annotationType: 'polygon',
      duration,
      metadata: {
        polygonSessionId: this.polygonSessionId,
        frameSessionId: this.frameSessionId,
        toolType: 'iss',
        level: 'polygon',
        reason: 'cancelled',
        pointCount: this.points.length,
        pointAdditionTimes: this.pointAdditionTimes,
        timestamp: now
      }
    });
    
    this.recordActivity('polygon_cancelled', {
      duration,
      pointCount: this.points.length
    });
    
    this.polygonStartTime = 0;
    this.polygonSessionId = '';
  }

  clearDraw() {
    this.points = [];
    this.anchors.removeChildren();
    this.lines.removeChildren();
    this.holder.hide();
    this.currentAnchor.hide();
  }

  stopCurrentDraw() {
    if (this.points.length < 3) {
      this.clearDraw();
      // 追踪不完整的多边形
      this.trackIncompletePolygon();
      return;
    }

    try {
      const iss = this.createIssFromPoints();
      this.processNewIssSegment(iss);
      this.onDraw(iss);
      
      // 追踪成功的多边形完成
      this.trackPolygonCompletion(iss);
    } catch (error) {
      console.error('Failed to create ISS segment:', error);
      this.trackPolygonError(error);
    } finally {
      this.clearDraw();
    }
  }

  /**
   * 追踪不完整的多边形
   */
  private trackIncompletePolygon(): void {
    const now = Date.now();
    const duration = now - this.polygonStartTime;
    
    this.efficiencyManager.trackAnnotation('delete', {
      annotationType: 'polygon',
      duration,
      metadata: {
        polygonSessionId: this.polygonSessionId,
        frameSessionId: this.frameSessionId,
        toolType: 'iss',
        level: 'polygon',
        reason: 'insufficient_points',
        pointCount: this.points.length,
        pointAdditionTimes: this.pointAdditionTimes,
        timestamp: now
      }
    });
    
    this.recordActivity('polygon_incomplete', {
      duration,
      pointCount: this.points.length,
      reason: 'insufficient_points'
    });
    
    this.polygonStartTime = 0;
  }

  /**
   * 追踪多边形完成
   */
  private trackPolygonCompletion(iss: Iss): void {
    const now = Date.now();
    const duration = now - this.polygonStartTime;
    const area = (iss as any).getArea?.() || 0;
    
    // 计算点添加的时间间隔
    const pointIntervals = this.pointAdditionTimes.length > 1 
      ? this.pointAdditionTimes.slice(1).map((time, index) => time - this.pointAdditionTimes[index])
      : [];
    const averagePointInterval = pointIntervals.length > 0 
      ? pointIntervals.reduce((sum, interval) => sum + interval, 0) / pointIntervals.length 
      : 0;
    
    // 记录到帧完成的多边形列表
    this.frameCompletedPolygons.push({
      id: iss.uuid,
      duration,
      pointCount: this.points.length,
      area
    });
    this.framePolygonCount++;
    
    this.efficiencyManager.trackAnnotation('complete', {
      annotationType: 'polygon',
      objectId: iss.uuid,
      duration,
      metadata: {
        polygonSessionId: this.polygonSessionId,
        frameSessionId: this.frameSessionId,
        toolType: 'iss',
        level: 'polygon',
        pointCount: this.points.length,
        area,
        instanceId: this.uuidToNumber(iss.uuid),
        pointAdditionTimes: this.pointAdditionTimes,
        pointIntervals,
        averagePointInterval,
        pointsPerSecond: this.points.length / (duration / 1000),
        areaPerSecond: area / (duration / 1000),
        timestamp: now
      }
    });
    
    // 记录性能指标
    this.efficiencyManager.trackPerformance('polygon_annotation_duration', duration, 'ms', {
      polygonSessionId: this.polygonSessionId,
      pointCount: this.points.length,
      area
    });
    
    this.efficiencyManager.trackPerformance('polygon_points_per_second', this.points.length / (duration / 1000), 'count', {
      polygonSessionId: this.polygonSessionId,
      totalPoints: this.points.length
    });
    
    this.efficiencyManager.trackPerformance('polygon_area_per_second', area / (duration / 1000), 'count', {
      polygonSessionId: this.polygonSessionId,
      totalArea: area
    });
    
    this.recordActivity('polygon_completed', {
      duration,
      pointCount: this.points.length,
      area,
      averagePointInterval
    });
    
    this.polygonStartTime = 0;
    this.polygonSessionId = '';
  }

  /**
   * 追踪多边形错误
   */
  private trackPolygonError(error: unknown): void {
    const now = Date.now();
    const duration = now - this.polygonStartTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.efficiencyManager.trackError({
      errorType: 'runtime',
      message: `ISS polygon creation failed: ${errorMessage}`,
      severity: 'medium',
      context: {
        polygonSessionId: this.polygonSessionId,
        frameSessionId: this.frameSessionId,
        toolType: 'iss',
        duration,
        pointCount: this.points.length,
        pointAdditionTimes: this.pointAdditionTimes,
        timestamp: now
      }
    });
    
    this.recordActivity('polygon_error', {
      duration,
      pointCount: this.points.length,
      error: errorMessage
    });
    
    this.polygonStartTime = 0;
  }

  /**
   * 从当前点创建ISS对象
   */
  private createIssFromPoints(): Iss {
    const points: number[] = [];
    this.points.forEach(p => {
      points.push(p.x, p.y);
    });
    return new Iss({ points: points as any });
  }

  /**
   * 处理新创建的ISS分割段
   */
  private processNewIssSegment(iss: Iss): void {
    this.addSegmentToUnifiedMask(iss);
    this.setupIssMetadata(iss);
  }

  /**
   * 添加分割段到统一掩码构建器
   */
  private addSegmentToUnifiedMask(iss: Iss): void {
    if (!this.unifiedMaskBuilder) {
      console.error('UnifiedMaskBuilder not initialized');
      return;
    }

    try {
      const region = this.createSegmentationRegion(iss);
      this.unifiedMaskBuilder.addSegmentationRegion(region);
      this.updateIssUserData(iss, region);
    } catch (error) {
      console.error('Failed to add segment to unified mask:', error);
    }
  }

  /**
   * 创建分割区域数据
   */
  private createSegmentationRegion(iss: Iss): SegmentationRegion {
    const editor = this.view.editor;
    const userData = editor.getUserData(iss) || {};
    const classConfig = editor.getClassType(userData.classId || '');
    
    return {
      id: `region_${iss.uuid}`,
      instanceId: this.uuidToNumber(iss.uuid),
      classId: classConfig?.id ? parseInt(classConfig.id) : 0,
      className: classConfig?.name || 'Unknown',
      confidence: 1.0,
      polygonPoints: this.points.map(p => ({ x: p.x, y: p.y })),
      isVisible: true,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 更新ISS对象的用户数据
   */
  private updateIssUserData(iss: Iss, region: SegmentationRegion): void {
    const editor = this.view.editor;
    const userData = editor.getUserData(iss) || {};
    
    userData.instanceId = region.instanceId;
    userData.regionId = region.id;
    userData.confidence = region.confidence;
    userData.hasUnifiedMask = true;
    userData.unifiedMaskBuilder = this.unifiedMaskBuilder;
    
    // 直接设置用户数据到对象上
    iss.userData = userData;
    
    // 确保所有现有的ISS对象也引用同一个构建器
    this.syncBuilderToAllExistingIssObjects();
  }

  /**
   * 导出统一掩码数据
   */
  exportUnifiedMaskData(): UnifiedMaskData | null {
    if (!this.unifiedMaskBuilder) {
      console.error('UnifiedMaskBuilder not available for export');
      return null;
    }
    
    try {
      const unifiedMaskData = this.unifiedMaskBuilder.build();
      return unifiedMaskData;
    } catch (error) {
      console.error('Failed to export unified mask data:', error);
      return null;
    }
  }

  /**
   * 加载现有的统一掩码数据
   */
  private loadExistingUnifiedMaskData(): boolean {
    try {
      const editor = this.view.editor;
      const frames = editor.state.frames || [];
      const currentFrame = frames.length > 0 ? frames[0] : null;
      
      if (!currentFrame) {
        return false;
      }

      // 查找ISS_UNIFIED对象
      const issObjects = editor.dataManager.getFrameObject(currentFrame.id, 'ISS' as any) || [];

      // 查找具有统一掩码数据的ISS对象
      for (const issObject of issObjects) {
        const userData = editor.getUserData(issObject);
        
        // 检查unifiedMaskData（加载的数据）而不是unifiedMaskBuilder
        if (userData && userData.unifiedMaskData) {
          // 恢复UnifiedMaskBuilder状态
          this.restoreUnifiedMaskBuilder(userData.unifiedMaskData);
          
          // 将恢复的构建器设置到所有相关的ISS对象上
          this.attachBuilderToAllIssObjects(issObjects, editor);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Failed to load existing unified mask data:', error);
      return false;
    }
  }

  /**
   * 恢复统一掩码构建器状态
   */
  private restoreUnifiedMaskBuilder(unifiedMaskData: UnifiedMaskData): void {
    // 创建全新的构建器以匹配加载的数据
    this.unifiedMaskBuilder = new UnifiedMaskBuilder(
      unifiedMaskData.imageId,
      unifiedMaskData.imageDimensions.width,
      unifiedMaskData.imageDimensions.height
    );
    
    // 恢复所有实例作为分割区域
    let maxInstanceId = 0;
    const instancesArray = Object.values(unifiedMaskData.instances);
    
    instancesArray.forEach((instance, index) => {
      const region: SegmentationRegion = {
        id: `restored_region_${instance.id}`,
        instanceId: instance.id,
        classId: instance.classId,
        className: instance.className,
        confidence: instance.confidence,
        polygonPoints: instance.polygonPoints,
        isVisible: instance.isVisible,
        createdAt: instance.createdAt
      };
      
      this.unifiedMaskBuilder!.addSegmentationRegion(region);
      
      // 跟踪最大实例ID
      maxInstanceId = Math.max(maxInstanceId, instance.id);
    });
    
    // 更新nextRegionId以避免ID冲突
    this.nextRegionId = maxInstanceId + 1;
    
    // 同时更新构建器的nextInstanceId以避免实例ID冲突
    this.unifiedMaskBuilder.setNextInstanceId(maxInstanceId + 1);
  }

  /**
   * 将恢复的构建器附加到所有相关的ISS对象上
   */
  private attachBuilderToAllIssObjects(issObjects: any[], editor: any): void {
    issObjects.forEach(issObject => {
      const userData = editor.getUserData(issObject) || {};
      
      // 设置构建器引用
      userData.hasUnifiedMask = true;
      userData.unifiedMaskBuilder = this.unifiedMaskBuilder;
      
      // 直接设置到对象上
      issObject.userData = userData;
    });
  }

  /**
   * 将 UUID 字符串转换为唯一的数字 ID
   */
  private uuidToNumber(uuid: string): number {
    // 使用 UUID 的简单 hash 算法转换为数字
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      const char = uuid.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    // 确保结果是正数，并限制在合理范围内
    return Math.abs(hash) % 65535 + 1;
  }

  /**
   * 同步构建器到所有现有的ISS对象
   */
  private syncBuilderToAllExistingIssObjects(): void {
    const editor = this.view.editor;
    const frames = editor.state.frames || [];
    const currentFrame = frames.length > 0 ? frames[0] : null;
    
    if (!currentFrame) {
      return;
    }
    
    const issObjects = editor.dataManager.getFrameObject(currentFrame.id, 'ISS' as any) || [];
    
    issObjects.forEach((issObject, index) => {
      const userData = editor.getUserData(issObject) || {};
      
      userData.hasUnifiedMask = true;
      userData.unifiedMaskBuilder = this.unifiedMaskBuilder;
      issObject.userData = userData;
    });
  }

  drawInfo() {
    if (!this.holder.visible()) return '';
    const area = this.holder.getArea();
    return `points: ${this.points.length}; area: ${area.toFixed(0)}px²`;
  }

  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {
    this.addPoint(point);
  }

  onMouseMove(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {
    this.currentAnchor.position(point);
    this.updateHolder();
    this.updateLastHolderLine();
    this.onDrawChange();
    
    // 记录鼠标移动活动
    this.recordActivity('mouse_move', {
      position: point,
      pointCount: this.points.length
    });
  }

  updateLastHolderLine() {
    // Update the preview line from last point to current cursor position
    if (this.points.length >= 1) {
      const endPos = this.currentAnchor.position();
      // Update the temporary preview showing the polygon closure
      const tempPoints = [...this.points, endPos];
      const points: number[] = [];
      tempPoints.forEach(p => {
        points.push(p.x, p.y);
      });
      this.holder.setAttrs({ points });
      this.holder.show();
      this.currentAnchor.show();
    }
  }

  onDoubleClick(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {
    if (this.points.length >= 3) {
      this.stopCurrentDraw();
      
      this.recordActivity('double_click', {
        position: point,
        action: 'complete_polygon'
      });
    }
  }

  addPoint(point: Vector2) {
    if (this.validPoint(point)) {
      const now = Date.now();
      this.points.push(point);
      this.pointAdditionTimes.push(now);
      this.updateAnchors();
      this.updateLines();
      
      // 追踪点添加
      this.efficiencyManager.trackInteraction('point_added', {
        timestamp: now,
        position: point,
        metadata: {
          polygonSessionId: this.polygonSessionId,
          frameSessionId: this.frameSessionId,
          pointIndex: this.points.length - 1,
          totalPoints: this.points.length
        }
      });
      
      this.recordActivity('point_added', {
        position: point,
        pointIndex: this.points.length - 1,
        totalPoints: this.points.length
      });
    }
  }

  updateHolder() {
    if (this.points.length < 2) return;
    
    try {
      const tempPoints = [...this.points, this.currentAnchor.position()];
      const points = this.convertPointsToArray(tempPoints);
      this.holder.setAttrs({ points });
      this.holder.show();
      this.currentAnchor.show();
    } catch (error) {
      console.error('Failed to update holder:', error);
    }
  }

  /**
   * 转换点数组为数字数组
   */
  private convertPointsToArray(points: Vector2[]): number[] {
    const result: number[] = [];
    points.forEach(p => {
      result.push(p.x, p.y);
    });
    return result;
  }

  updateAnchors() {
    this.anchors.removeChildren();
    try {
      this.points.forEach((point) => {
        this.anchors.add(new Anchor({ ...point }));
      });
    } catch (error) {
      console.error('Failed to update anchors:', error);
    }
  }

  updateLines() {
    this.lines.removeChildren();
    if (this.points.length >= 2) {
      for (let i = 0; i < this.points.length - 1; i++) {
        const line = new Line({
          points: [this.points[i], this.points[i + 1]],
          strokeWidth: 2,
          stroke: '#fff',
          dash: [5, 5],
        });
        this.lines.add(line);
      }
    }
  }

  // edit
  edit(object: Iss) {
    try {
      this.removeChangeEvent();
      this.object = object;
      
      // 开始编辑模式追踪
      this.startEditMode(object);
      
      this.initializeEditMode(object);
      this.setupEditUI();
      this.addChangEvent();
      
    } catch (error) {
      console.error('Failed to initialize ISS edit mode:', error);
      this.trackEditError(error);
    }
  }

  /**
   * 开始编辑模式
   */
  private startEditMode(object: Iss): void {
    this.editStartTime = Date.now();
    this.editSessionId = this.generateSessionId();
    
    this.efficiencyManager.trackAnnotation('modify', {
      annotationType: 'polygon',
      objectId: object.uuid,
      metadata: {
        editSessionId: this.editSessionId,
        frameSessionId: this.frameSessionId,
        toolType: 'iss',
        mode: 'edit',
        timestamp: this.editStartTime
      }
    });
    
    this.recordActivity('edit_start', {
      objectId: object.uuid,
      editSessionId: this.editSessionId
    });
  }

  /**
   * 追踪编辑错误
   */
  private trackEditError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.efficiencyManager.trackError({
      errorType: 'runtime',
      message: `ISS edit mode failed: ${errorMessage}`,
      severity: 'medium',
      context: {
        editSessionId: this.editSessionId,
        frameSessionId: this.frameSessionId,
        toolType: 'iss',
        timestamp: Date.now()
      }
    });
  }

  /**
   * 初始化编辑模式
   */
  private initializeEditMode(object: Iss): void {
    const userData = this.view.editor.getUserData(object);
    
    if (userData?.hasUnifiedMask && userData.unifiedMaskData) {
      this.restoreUnifiedMaskBuilder(userData.unifiedMaskData);
      // Edit mode initialized with unified mask data
    } else {
      // Edit mode initialized without unified mask data
    }
  }

  /**
   * 设置编辑UI
   */
  private setupEditUI(): void {
    this.updateEditObject(); // 使用新的updateEditObject方法
    this.updateTransformer();
    this.editGroup.show();
  }

  stopEdit() {
    this.clearEdit();
    this.object = undefined;
    this.removeChangeEvent();
    this.editGroup.hide();
    
    // 追踪编辑结束
    if (this.editStartTime > 0) {
      this.trackEditCompletion();
    }
  }

  /**
   * 追踪编辑完成
   */
  private trackEditCompletion(): void {
    const now = Date.now();
    const duration = now - this.editStartTime;
    
    this.efficiencyManager.trackAnnotation('modify', {
      annotationType: 'polygon',
      duration,
      metadata: {
        editSessionId: this.editSessionId,
        frameSessionId: this.frameSessionId,
        toolType: 'iss',
        mode: 'edit_complete',
        timestamp: now
      }
    });
    
    this.efficiencyManager.trackPerformance('polygon_edit_duration', duration, 'ms', {
      editSessionId: this.editSessionId,
      frameSessionId: this.frameSessionId
    });
    
    this.recordActivity('edit_complete', {
      duration,
      editSessionId: this.editSessionId
    });
    
    this.editStartTime = 0;
    this.editSessionId = '';
  }

  updateTransformer() {
    if (this.object) {
      this.transform.nodes([this.object]);
      
      // 添加变换器保存处理 - 类似于RectTool的处理方式
      this.addTransformSaveHandler();
    }
  }

  // 添加变换器变换的保存处理
  private addTransformSaveHandler() {
    if (!this.object) return;
    
    let startTransform: any;
    
    // 清除之前的事件监听器
    this.transform.off('transformstart transform transformend');
    
    this.transform.on('transformstart', () => {
      if (this.object) {
        startTransform = this.object.clonePointsData();
        this.onEditStart();
      }
    });
    
    this.transform.on('transform', () => {
      // 变换过程中不同步坐标，避免干扰Konva Transformer
      // 让Konva正常处理变换，只在变换结束时同步
      this.updateEditObject();
      this.onEditChange();
    });
    
    this.transform.on('transformend', () => {
      if (this.object && startTransform) {
        // 只在变换结束时同步坐标
        this.syncTransformToPoints();
        
        const endTransform = this.object.clonePointsData();
        this.addTransformCmd(startTransform, endTransform);
        this.updateEditObject();
        this.onEditEnd();
      }
    });
  }

  // 添加变换命令到命令管理器
  private addTransformCmd(startData: any, endData: any) {
    if (!this.object) return;
    
    const editor = this.view.editor;
    const cmd = new UpdateTransform(
      editor, 
      { objects: this.object, transforms: endData }
    );
    cmd.undoData = { objects: this.object, transforms: startData };
    editor.cmdManager.addExecuteManually(cmd as any);
  }

  // 添加角点拖拽命令到命令管理器
  private addPointsCmd(startData: any, endData: any) {
    if (!this.object) return;
    
    const editor = this.view.editor;
    const cmd = new UpdateTransform(
      editor, 
      { objects: this.object, transforms: endData }
    );
    cmd.undoData = { objects: this.object, transforms: startData };
    editor.cmdManager.addExecuteManually(cmd as any);
  }

  updateEditAnchors() {
    this.editAnchors.removeChildren();
    if (this.object) {
      const vectors = this.object.getPointsAsVectors();
      
      // 获取对象的变换信息
      const objectX = this.object.x();
      const objectY = this.object.y();
      const scaleX = this.object.scaleX() || 1;
      const scaleY = this.object.scaleY() || 1;
      const rotation = this.object.rotation() || 0;
      
      vectors.forEach((point, index) => {
        // 计算变换后的实际坐标
        let transformedX = point.x * scaleX;
        let transformedY = point.y * scaleY;
        
        // 如果有旋转，应用旋转变换
        if (rotation !== 0) {
          const cos = Math.cos(rotation);
          const sin = Math.sin(rotation);
          const tempX = transformedX * cos - transformedY * sin;
          const tempY = transformedX * sin + transformedY * cos;
          transformedX = tempX;
          transformedY = tempY;
        }
        
        // 转换为绝对坐标
        const anchorX = transformedX + objectX;
        const anchorY = transformedY + objectY;
        
        const anchor = new Anchor({ 
          x: anchorX,
          y: anchorY,
          id: `anchor-${index}`,
          cursor: Cursor.pointer,
          draggable: true,
          pointIndex: index,
        });
        this.editAnchors.add(anchor);
      });
    }
  }

  // 编辑对象更新方法，用于处理拖动和变换后的坐标同步
  updateEditObject() {
    if (!this.object) return;
    
    this.editAnchors.removeChildren();
    const vectors = this.object.getPointsAsVectors();
    
    // 获取对象的变换信息
    const objectX = this.object.x();
    const objectY = this.object.y();
    const scaleX = this.object.scaleX() || 1;
    const scaleY = this.object.scaleY() || 1;
    const rotation = this.object.rotation() || 0;
    
    vectors.forEach((point, index) => {
      // 计算变换后的实际坐标
      let transformedX = point.x * scaleX;
      let transformedY = point.y * scaleY;
      
      // 如果有旋转，应用旋转变换
      if (rotation !== 0) {
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const tempX = transformedX * cos - transformedY * sin;
        const tempY = transformedX * sin + transformedY * cos;
        transformedX = tempX;
        transformedY = tempY;
      }
      
      // 转换为绝对坐标
      const anchorX = transformedX + objectX;
      const anchorY = transformedY + objectY;
      
      const anchor = new Anchor({
        x: anchorX,
        y: anchorY,
        draggable: true,
        pointIndex: index,
        cursor: Cursor.pointer,
      });
      
      this.editAnchors.add(anchor);
    });
  }

  onObjectChange() {
    // 只在非拖拽状态下更新编辑锚点位置
    // 避免拖拽过程中重新创建锚点导致拖拽中断
    if (!this.isDraggingAnchor()) {
      this.updateEditObject();
    }
    
    // 确保ISS对象修改时会设置frame.needSave = true
    if (this.object) {
      this.view.editor.dataManager.onAnnotatesChange([this.object], 'transform');
    }
  }

  // 检查是否正在拖拽锚点
  private isDraggingAnchor(): boolean {
    // 检查editGroup中是否有锚点正在被拖拽
    const anchors = this.editAnchors.children?.filter(child => child instanceof Anchor) || [];
    return anchors.some((anchor: any) => anchor.isDragging && anchor.isDragging());
  }

  // ISS工具的锚点拖拽事件需要直接触发保存标志
  onEditChange() {
    // 调用父类方法
    super.onEditChange();
    
    // ISS工具的编辑修改需要直接调用onAnnotatesChange
    // 因为锚点拖拽可能不会触发对象的changeEvent
    if (this.object) {
      this.view.editor.dataManager.onAnnotatesChange([this.object], 'transform');
    }
  }

  checkEditAction(action: ToolAction) {
    return action === ToolAction.del;
  }

  /**
   * 删除当前编辑的ISS对象
   * 当用户按下删除快捷键时调用
   */
  onToolDelete() {
    if (this.object) {
      try {
        const editor = this.view.editor;
        
        // 追踪删除操作
        this.trackIssDelete(this.object);
        this.recordActivity('iss_object_deleted', {
          objectId: this.object.uuid,
          deletionMethod: 'keyboard_shortcut'
        });
        // 使用命令管理器删除对象，这样可以支持撤销
        editor.cmdManager.execute('delete-object', [this.object]);
        
        // 触发删除事件
        editor.emit(Event.ANNOTATE_HANDLE_DELETE, { objects: [this.object], type: 1 });
        
        // 清除选择
        editor.selectObject();
        
        // 退出编辑模式
        this.stopEdit();
        

        
      } catch (error) {
        console.error('Failed to delete ISS object:', error);
        this.trackDeleteError(error);
      }
    }
  }

  /**
   * 追踪ISS对象删除
   */
  private trackIssDelete(iss: Iss): void {
    this.efficiencyManager.trackAnnotation('delete', {
      annotationType: 'polygon',
      objectId: iss.uuid,
      metadata: {
        frameSessionId: this.frameSessionId,
        toolType: 'iss',
        deletionMethod: 'keyboard_shortcut',
        instanceId: this.uuidToNumber(iss.uuid),
        timestamp: Date.now()
      }
    });
  }

  /**
   * 追踪删除错误
   */
  private trackDeleteError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.efficiencyManager.trackError({
      errorType: 'runtime',
      message: `ISS object deletion failed: ${errorMessage}`,
      severity: 'medium',
      context: {
        frameSessionId: this.frameSessionId,
        toolType: 'iss',
        timestamp: Date.now()
      }
    });
  }

  clearEdit() {
    this.editAnchors.removeChildren();
  }

  initEditEvent() {
    let dragStartData: any = null; // 保存拖拽开始时的数据

    this.editGroup.on(Event.DRAG_START, (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this.object) return;
      
      if (e.target instanceof Anchor) {
        // 保存拖拽开始时的points数据用于undo
        dragStartData = this.object.clonePointsData();
        this.onEditStart();
      }
    });

    this.editGroup.on(Event.DRAG_MOVE, (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this.object) return;
      
      if (e.target instanceof Anchor) {
        const target = e.target as Anchor;
        const points = this.object.attrs.points as unknown as number[];
        const pointIndex = target.attrs.pointIndex as number;
        const anchorPos = target.position();

        // 获取对象的完整变换信息
        const objX = this.object.x();
        const objY = this.object.y();
        const objScaleX = this.object.scaleX() || 1;
        const objScaleY = this.object.scaleY() || 1;
        const objRotation = this.object.rotation() || 0;

        if (typeof pointIndex === 'number' && points && Array.isArray(points)) {
          // 计算锚点相对于对象的坐标
          let relativeX = anchorPos.x - objX;
          let relativeY = anchorPos.y - objY;

          // 反向应用旋转变换
          if (objRotation !== 0) {
            const cos = Math.cos(-objRotation);
            const sin = Math.sin(-objRotation);
            const tempX = relativeX * cos - relativeY * sin;
            const tempY = relativeX * sin + relativeY * cos;
            relativeX = tempX;
            relativeY = tempY;
          }

          // 反向应用缩放变换，得到原始相对坐标
          const originalX = relativeX / objScaleX;
          const originalY = relativeY / objScaleY;

          // 更新ISS形状中的特定点
          const newPoints: number[] = [...points];
          const pointArrayIndex = pointIndex * 2; // points数组格式为[x1,y1,x2,y2,...]
          newPoints[pointArrayIndex] = originalX;
          newPoints[pointArrayIndex + 1] = originalY;
          
          this.object.setAttrs({ points: newPoints });
          
          // 记录编辑活动
          this.recordActivity('anchor_drag', {
            pointIndex,
            newPosition: { x: anchorPos.x, y: anchorPos.y },
            originalCoords: { x: originalX, y: originalY }
          });
        }
      }

      // 确保所有拖拽事件都触发保存标志
      this.onEditChange();
    });

    this.editGroup.on(Event.DRAG_END, (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this.object) return;
      
      if (e.target instanceof Anchor && dragStartData) {
        // 角点拖拽结束，创建undo命令
        const dragEndData = this.object.clonePointsData();
        this.addPointsCmd(dragStartData, dragEndData);
        dragStartData = null; // 重置
        this.onEditEnd();
      } else if (e.target.constructor.name === 'Transformer') {
        // Transformer拖拽，需要同步变换到points数组
        this.syncTransformToPoints();
        this.onEditEnd();
      }
      
      // 直接emit edit-end事件
      this.view.editor.emit('edit-end', this.object);
    });

    // Handle anchor selection and line editing
    this.editGroup.on(Event.CLICK, (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!this.object) return;
      
      if (e.target instanceof Anchor) {
        // Select anchor for ISS editing
        this.selectAnchor(e.target);
      } else if (e.target instanceof Line) {
        // Add point on line click for ISS
        this.onIssEdgeEdit(e.target);
      }
    });
  }

  selectAnchor(anchor: Anchor) {
    const pointIndex = anchor.attrs.pointIndex as number;
    const anchors = this.editAnchors.children?.filter((e) => e instanceof Anchor) as Anchor[];
    
    if (!anchors || anchors.length === 0) return;
    
    // Update anchor selection state
    anchors.forEach((e, index) => {
      e.state = e.state || {};
      e.state.select = index === pointIndex;
    });
    
    this.view.updateStateStyle(anchors);
    this.selectAnchorIndex(pointIndex, -1);
    
    // 记录锚点选择
    this.recordActivity('anchor_select', {
      pointIndex
    });
  }

  onIssEdgeEdit(target: Line) {
    if (!this.object) return;
    
    const points = this.object.attrs.points as unknown as number[];
    const lineIndex = target.attrs.lineIndex as number;
    const objectX = this.object.attrs.x as number;
    const objectY = this.object.attrs.y as number;
    
    // 保存编辑前的状态用于undo
    const editStartData = this.object.clonePointsData();
    this.onEditStart();
    
    // Get relative position for new point
    let relPos = this.editGroup.getRelativePointerPosition() || { x: 0, y: 0 };
    
    if (typeof lineIndex === 'number' && points && Array.isArray(points)) {
      // Convert points array back to Vector2 format for editing
      const vectors: Vector2[] = [];
      for (let i = 0; i < points.length; i += 2) {
        vectors.push({ x: points[i], y: points[i + 1] });
      }
      
      // Insert new point at the clicked line position
      vectors.splice(lineIndex + 1, 0, { x: relPos.x - objectX, y: relPos.y - objectY });
      
      // Convert back to points array format
      const newPoints: number[] = [];
      vectors.forEach(v => {
        newPoints.push(v.x, v.y);
      });
      this.object.setAttrs({ points: newPoints as any });
      
      // 创建undo命令
      const editEndData = this.object.clonePointsData();
      this.addPointsCmd(editStartData, editEndData);
      
      // 记录边缘编辑
      this.recordActivity('edge_edit', {
        lineIndex,
        newPointPosition: { x: relPos.x, y: relPos.y }
      });
      
      // 边缘编辑也需要触发保存标志
      this.view.editor.dataManager.onAnnotatesChange([this.object], 'transform');
    }
    
    this.onEditEnd();
  }

  /**
   * 完成帧标注时调用（应在更高层级调用）
   */
  completeFrameAnnotation(): void {
    this.trackFrameAnnotationComplete();
    
    // 重置帧状态
    this.frameAnnotationStartTime = Date.now();
    this.frameSessionId = this.generateSessionId();
    this.framePolygonCount = 0;
    this.frameCompletedPolygons = [];
    this.totalIdleTime = 0;
    
    // 开始新的帧追踪
    this.trackFrameAnnotationStart();
  }

  /**
   * 获取当前帧的统计信息
   */
  getFrameStats(): {
    frameSessionId: string;
    duration: number;
    polygonCount: number;
    totalIdleTime: number;
    activeTime: number;
    efficiencyRatio: number;
    completedPolygons: Array<{
      id: string;
      duration: number;
      pointCount: number;
      area: number;
    }>;
  } {
    const now = Date.now();
    const duration = now - this.frameAnnotationStartTime;
    const activeTime = duration - this.totalIdleTime;
    
    return {
      frameSessionId: this.frameSessionId,
      duration,
      polygonCount: this.framePolygonCount,
      totalIdleTime: this.totalIdleTime,
      activeTime,
      efficiencyRatio: activeTime / duration,
      completedPolygons: [...this.frameCompletedPolygons]
    };
  }

  private setupIssMetadata(iss: Iss) {
    const editor = this.view.editor;
    const userData = editor.getUserData(iss) || {};
    const classConfig = editor.getClassType(userData.classId || '');
    
    const imageWidth = editor.mainView?.backgroundWidth || 1920;
    const imageHeight = editor.mainView?.backgroundHeight || 1080;
    
    // 生成实例ID
    const instanceId = Date.now() % 65535;
    
    // 设置基本元数据
    this.setupBasicMetadata(iss, instanceId, imageWidth, imageHeight);
  }

  private setupBasicMetadata(iss: Iss, instanceId: number, imageWidth: number, imageHeight: number) {
    const editor = this.view.editor;
    const userData = editor.getUserData(iss) || {};
    const classConfig = editor.getClassType(userData.classId || '');
    
    // 基本ISS元数据
    const issMetadata = {
      instanceId: instanceId,
      confidence: 1.0,
      isVisible: true,
      semanticLabel: classConfig?.id ? parseInt(classConfig.id) : 0,
      createdAt: new Date().toISOString()
    };
    
    userData.instanceId = instanceId;
    userData.confidence = 1.0;
    userData.semanticLabel = issMetadata.semanticLabel;
    userData.issMetadata = issMetadata;
    userData.hasIssMetadata = true;
    
    // 直接设置用户数据到对象上
    iss.userData = userData;
  }

  // 将变换效果同步到points数组
  private syncTransformToPoints() {
    if (!this.object) return;
    
    const currentPoints = this.object.attrs.points as unknown as number[];
    if (!currentPoints || !Array.isArray(currentPoints) || currentPoints.length === 0) return;
    
    // 获取当前的变换信息
    const objX = this.object.x();
    const objY = this.object.y();
    const objScaleX = this.object.scaleX() || 1;
    const objScaleY = this.object.scaleY() || 1;
    const objRotation = this.object.rotation() || 0;
    
    // 检查是否有任何变换
    const hasTransform = objX !== 0 || objY !== 0 || objScaleX !== 1 || objScaleY !== 1 || objRotation !== 0;
    
    if (!hasTransform) {
      return;
    }
    
    // 将变换应用到每个点上，然后更新points数组
    const newPoints: number[] = [];
    for (let i = 0; i < currentPoints.length; i += 2) {
      let x = currentPoints[i];
      let y = currentPoints[i + 1];
      
      // 应用缩放
      x *= objScaleX;
      y *= objScaleY;
      
      // 应用旋转
      if (objRotation !== 0) {
        const cos = Math.cos(objRotation);
        const sin = Math.sin(objRotation);
        const tempX = x * cos - y * sin;
        const tempY = x * sin + y * cos;
        x = tempX;
        y = tempY;
      }
      
      // 应用位移
      x += objX;
      y += objY;
      
      newPoints.push(x, y);
    }
    
    // 更新points数组并重置变换属性
    this.object.setAttrs({
      points: newPoints,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0
    });
  }
} 