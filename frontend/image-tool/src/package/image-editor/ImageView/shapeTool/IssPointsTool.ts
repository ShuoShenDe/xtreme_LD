import Konva from 'konva';
import { ToolAction, ToolName, Vector2, MsgType } from '../../types';
import { Cursor, Event, defaultCircleConfig } from '../../configs';
import ImageView from '../index';
import { Anchor, Line, KeyPoint, Shape } from '../shape';
import * as utils from '../../utils';
import KeyPointTool from './KeyPointTool';
import { convertModelResultAndAddISS } from '../utils/convertModelResultAndAddIss';
import { AIAssistantHelper } from '../../mixins/AIAssistantMixin';

export default class IssPointsTool extends KeyPointTool {
  name = ToolName['iss-points'];
  private isCollectingPoints = false;
  private collectedPoints: Array<{x: number, y: number, positive: boolean}> = [];
  private maxPoints = 10; // Maximum number of points to collect
  private minPoints = 1; // Minimum number of points needed
  private isStarted = false; // 控制工具是否已启动
  private lastGeneratedObjects: any[] = []; // 记录上次生成的标注对象
  private wasPointsCleared = false; // 标记点集是否被清空过
  private pointCollectionStartTime: number = 0; // 点收集开始时间
  private aiHelper: AIAssistantHelper;

  constructor(view: ImageView) {
    super(view);
    this.aiHelper = new AIAssistantHelper(this);
    this.bindKeyboardEvents();
  }

  // ✅ 重写为public方法以实现AIAssistedTool接口
  public emitPerformanceMetric(metricName: string, value: number, unit: string, metadata?: Record<string, any>): void {
    super.emitPerformanceMetric(metricName, value, unit, metadata);
  }

  // ✅ 实现AIAssistedTool接口的handleAISuccess方法
  async handleAISuccess(objects: any[], modelCode: string, editor: any): Promise<void> {
    // 只有在连续添加点时才删除之前的ISS对象
    // 如果点集被清空过(wasPointsCleared=true)，说明这是新一轮的收集，不删除之前的结果
    if (this.collectedPoints.length > 1) {
      editor.cmdManager.withGroup(() => {
        editor.cmdManager.execute('delete-object', this.lastGeneratedObjects);
      });
      this.lastGeneratedObjects = []; // 清空记录
    }
    
    // 直接渲染结果
    const draw_objects = await convertModelResultAndAddISS({ objects, modelCode }, editor) || [];
    
    // ✅ 追踪AI辅助成功
    this.aiHelper.trackAIAssistComplete(draw_objects.length, {
      inputPointCount: this.collectedPoints.length
    });
    
    // 记录新生成的标注对象
    this.lastGeneratedObjects = draw_objects;
    this.showSuccessMessage(`Created ${draw_objects.length} segmentation object(s)`);
  }

  private trackPointCollectionSession() {
    // 为每次点收集会话创建独立的追踪
    this.startDrawTracking({
      toolType: 'iss-points',
      hasAIAssist: true,
      maxPoints: this.maxPoints
    });
  }

  // Bind keyboard events for start/stop control
  private bindKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      if (this.view.editor.state.activeTool === this.name) {
        this.onKeyDown(e);
      }
    });
  }

  // Override draw to prepare for point collection mode
  draw() {
    super.draw();
    this.collectedPoints = [];
    this.lastGeneratedObjects = []; // 清空之前的结果记录
    this.wasPointsCleared = false; // 重置清空标记
    
    // ✅ 新架构：开始点收集追踪
    this.pointCollectionStartTime = Date.now();
    this.trackPointCollectionSession();
    
    // 自动启动点收集模式
    this.isStarted = true;
    this.isCollectingPoints = true;
    this.showInstructions();
  }

  // Override stopDraw to finish point collection
  stopDraw() {
    super.stopDraw();
    
    // ✅ 新架构：完成或取消绘制追踪
    if (this.collectedPoints.length > 0) {
      // 如果有收集的点，记录为完成
      this.completeDrawTracking(
        this.collectedPoints.map(p => ({ x: p.x, y: p.y })),
        {
          pointCount: this.collectedPoints.length,
          toolType: 'iss-points',
          duration: Date.now() - this.pointCollectionStartTime
        }
      );
    } else {
      // 如果没有点，记录为取消
      this.cancelDrawTracking({
        reason: 'tool_deactivated',
        toolType: 'iss-points'
      });
    }
    
    // 停止点收集模式
    this.isStarted = false;
    this.isCollectingPoints = false;
    this.clearPointMarkers();
    this.collectedPoints = [];
    this.lastGeneratedObjects = []; // 清空结果记录
    this.wasPointsCleared = false; // 重置清空标记
    this.hideInstructions();
  }

  // Override onMouseDown to collect multiple points
  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {
    
    if (!this.isStarted || !this.isCollectingPoints) {
      // Don't call super.onMouseDown to avoid creating keypoint objects
      return;
    }

    // Add point to collection with positive/negative based on Shift key
    const positive = !e.evt.shiftKey;
    const newPoint = {
      x: point.x,
      y: point.y,
      positive: positive
    };
    
    this.collectedPoints.push(newPoint);
    
    // ✅ 新架构：追踪鼠标点击和点添加
    this.trackMouseDown(point, { 
      pointCount: this.collectedPoints.length,
      positive: positive,
      toolType: 'iss-points'
    });
    this.trackPointAdded(point, { 
      totalPoints: this.collectedPoints.length,
      positive: positive
    });
    
    // 标记点集没有被清空过
    this.wasPointsCleared = false;
    
    // Visual feedback - create a small circle at the point
    this.createPointMarker(newPoint);

    // Call AI model immediately after adding point (like InteractiveConfig)
    this.callAIModelWithPoints(this.collectedPoints);

    // Show status when we have collected points
    if (this.collectedPoints.length >= this.minPoints) {
      this.showPointsSummary();
    }

    // Show message when reaching max points
    if (this.collectedPoints.length >= this.maxPoints) {
      this.showMessage(`Maximum ${this.maxPoints} points reached. Press Escape to clear points.`);
    }
  }

  // Handle key press for clearing points
  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      // 只清空当前收集的点
      this.clearCurrentPoints();
    } else if (e.key === 'Escape') {
      // 清空点集和删除生成的ISS对象
      this.clearPointsAndResults();
    }
  }

  // 清空当前收集的点
  private clearCurrentPoints() {
    this.collectedPoints = [];
    this.clearPointMarkers();
    this.wasPointsCleared = true; // 标记点集被清空
    this.showSuccessMessage('Points cleared');
    // 注意：不清空 lastGeneratedObjects，保留已生成的标注对象
  }

  // 清空点集和删除生成的ISS对象
  private clearPointsAndResults() {
    // 清空点集
    this.collectedPoints = [];
    this.clearPointMarkers();
    this.wasPointsCleared = true;
    
    // 删除生成的ISS对象
    this.removePreviousResults();
    
    this.showSuccessMessage('Points and results cleared');
  }

  // 显示点收集摘要
  private showPointsSummary() {
    const positiveCount = this.collectedPoints.filter(p => p.positive).length;
    const negativeCount = this.collectedPoints.filter(p => !p.positive).length;
    this.showMessage(`Collected ${this.collectedPoints.length} points (${positiveCount} positive, ${negativeCount} negative)`);
  }

  // Start point collection (保留用于兼容性)
  startPointCollection() {
    this.isStarted = true;
    this.isCollectingPoints = true;
    this.collectedPoints = [];
    this.clearPointMarkers();
    this.showInstructions();
  }

  // Stop point collection (保留用于兼容性)
  stopPointCollection() {
    this.isStarted = false;
    this.isCollectingPoints = false;
    this.clearPointMarkers();
    this.collectedPoints = [];
  }

  // Public methods for external control
  public start() {
    this.startPointCollection();
  }

  public stop() {
    this.stopPointCollection();
  }

  public getStatus() {
    return {
      isStarted: this.isStarted,
      isCollectingPoints: this.isCollectingPoints,
      pointCount: this.collectedPoints.length,
      maxPoints: this.maxPoints
    };
  }

  // 移除不需要的方法，简化代码

  // Create visual marker for collected points
  private createPointMarker(point: {x: number, y: number, positive: boolean}) {
    const marker = new Konva.Circle({
      x: point.x,
      y: point.y,
      radius: 3,
      fill: point.positive ? '#52c41a' : '#ff4d4f', // 绿色为positive，红色为negative
      stroke: '#ffffff',
      strokeWidth: 1,
      name: 'iss-point-marker'
    });
    
    this.view.helpLayer.add(marker);
    this.view.helpLayer.draw();
  }

  // Clear all point markers
  private clearPointMarkers() {
    const markers = this.view.helpLayer.find('.iss-point-marker');
    markers.forEach((marker: any) => marker.destroy());
    this.view.helpLayer.draw();
  }

  // Call AI model with collected points
  private async callAIModelWithPoints(points: Array<{x: number, y: number, positive: boolean}>) {
    try {
      // ✅ 新架构：开始AI辅助会话和追踪
      this.aiHelper.startAIAssistSession();
      const pointCollectionDuration = Date.now() - this.pointCollectionStartTime;
      this.aiHelper.trackAIAssistStart({
        pointCount: points.length,
        pointCollectionDuration
      });
      
      // Get current frame and editor info
      const editor = this.view.editor;
      const frame = editor.getCurrentFrame();
      const bsState = (editor as any).bsState;
      
      if (!frame) {
        throw new Error('No current frame found');
      }
      
      // Build AI configuration for points
      const aiConfig = await this.buildAIConfigForPoints(frame, points, bsState);
      
      // Process with AI
      await this.aiHelper.processWithAI(aiConfig, 'AI is processing your points...');
      
    } catch (error: any) {
      // ✅ 新架构：AI辅助错误追踪
      this.aiHelper.trackAIAssistError(error.message || 'AI processing failed', {
        inputPointCount: this.collectedPoints.length
      });
      
      this.showErrorMessage(error.message || 'AI processing failed');
      
      // Remove the last added point when error occurs
      if (this.collectedPoints.length > 0) {
        this.collectedPoints.pop(); // Remove the last point
        setTimeout(() => {
          this.clearPointMarkers(); // Remove its visual marker
          
          // Update points summary if we still have points
          this.showMessage('Point removed due to error. Continue adding points.');
        }, 1000);
      }
    }
  }

  // Build AI configuration for points
  private async buildAIConfigForPoints(frame: any, points: Array<{x: number, y: number, positive: boolean}>, bsState: any) {
    // Get available AI models
    const models = this.view.editor.state.models || [];
    const segmentationModel = models.find((model: any) => 
      model.code === 'IMAGE_INTERACTIVE' || model.type === 'IMAGE_INTERACTIVE'
    );
    
    if (!segmentationModel) {
      throw new Error('No segmentation model available');
    }
    
    // Build AI configuration
    const config = {
      datasetId: bsState.datasetId,
      dataIds: [+frame.id],
      modelId: +segmentationModel.id,
      modelVersion: segmentationModel.version,
      modelCode: segmentationModel.code,
      dataType: 'SINGLE_DATA',
      resultFilterParam: {
        classes: segmentationModel.classes?.map((e: any) => e.value) || [],
        interactiveData: {
          type: 'points',
          points: points // Use the points with positive/negative info directly
        }
      }
    };
    
    return config;
  }



  // 移除之前的结果
  private removePreviousResults() {
    const editor = this.view.editor;
    const frame = editor.getCurrentFrame();
    
    // 只删除之前记录的标注对象，而不是删除所有标注对象
    if (this.lastGeneratedObjects.length > 0) {
      editor.cmdManager.withGroup(() => {
        editor.cmdManager.execute('delete-object', this.lastGeneratedObjects);
      });
      this.showSuccessMessage(`Removed ${this.lastGeneratedObjects.length} previous segmentation object(s)`);
      this.lastGeneratedObjects = []; // 清空记录
    }
  }


  // UI helper methods - made public for AIAssistedTool interface
  private showInstructions() {
    this.showMessage('Click on image to add points for AI segmentation. Hold Shift for negative points. Press Enter to clear points only. Press Escape to clear points and remove ISS results.');
  }

  private hideInstructions() {
    this.hideMessage();
  }

  public showLoadingMessage(message: string) {
    const editor = this.view.editor;
    (editor as any).emit('message', {
      type: MsgType.info,
      message: message
    });
  }

  public hideLoadingMessage() {
    const editor = this.view.editor;
    (editor as any).emit('message', {
      type: MsgType.info,
      message: ''
    });
  }

  public showErrorMessage(message: string) {
    const editor = this.view.editor;
    if (editor && typeof editor.showMsg === 'function') {
      editor.showMsg(MsgType.error, message);
    }
  }

  public showSuccessMessage(message: string) {
    const editor = this.view.editor;
    (editor as any).emit('message', {
      type: MsgType.success,
      message: message
    });
  }

  private showMessage(message: string) {
    const editor = this.view.editor;
    (editor as any).emit('message', {
      type: MsgType.info,
      message: message
    });
  }

  private hideMessage() {
    const editor = this.view.editor;
    (editor as any).emit('message', {
      type: MsgType.info,
      message: ''
    });
  }


} 