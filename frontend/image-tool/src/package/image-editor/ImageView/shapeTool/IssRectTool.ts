import Konva from 'konva';
import { ToolAction, ToolName, Vector2, MsgType } from '../../types';
import { Cursor, Event, defaultCircleConfig } from '../../configs';
import ImageView from '../index';
import { Anchor, Line, Rect, Shape } from '../shape';
import * as utils from '../../utils';
import RectTool from './RectTool';
import { stringToArray } from 'konva/lib/shapes/Text';
import { AIAssistantHelper } from '../../mixins/AIAssistantMixin';

export default class IssRectTool extends RectTool {
  name = ToolName['iss-rect'];
  private aiHelper: AIAssistantHelper;

  constructor(view: ImageView) {
    super(view);
    this.aiHelper = new AIAssistantHelper(this);
  }

  // ✅ 重写为public方法以实现AIAssistedTool接口
  public emitPerformanceMetric(metricName: string, value: number, unit: string, metadata?: Record<string, any>): void {
    super.emitPerformanceMetric(metricName, value, unit, metadata);
  }

  // ✅ 实现AIAssistedTool接口的handleAISuccess方法
  async handleAISuccess(objects: any[], modelCode: string, editor: any): Promise<void> {
    // 直接渲染结果
    const { convertModelResultAndAddISS } = await import('../utils/convertModelResultAndAddIss');
    const draw_objects = await convertModelResultAndAddISS({ objects, modelCode }, editor) || [];
    
    // ✅ 追踪AI辅助成功
    this.aiHelper.trackAIAssistComplete(draw_objects.length);
    
    this.showSuccessMessage(`Created ${draw_objects.length} segmentation object(s)`);
  }

  // 重写draw方法，添加EFFM追踪
  draw() {
    super.draw();
    // ✅ 新架构：开始绘制追踪（ISS工具）
    this.startDrawTracking({ 
      toolType: 'iss-rect',
      hasAIAssist: true 
    });
  }

  // 重写stopCurrentDraw方法，在rect创建完成后调用AI模型
  stopCurrentDraw() {
    let rect = undefined;
    if (this.points.length === 2) {
      const rectOption = utils.getRectFromPoints(this.points as any);
      rect = new Rect(rectOption);
      
      // ✅ 新架构：完成基础绘制追踪（用户交互部分）
      const userDrawDuration = Date.now() - this.eventMixin['drawStartTime'];
      this.completeDrawTracking(this.points, {
        userDrawDuration,
        toolType: 'iss-rect',
        phase: 'user_interaction'
      });
      
      // 先添加rect到画布
      this.onDraw(rect);
      
      // 创建rect后调用AI模型，传递rect引用以便在失败时删除
      if (rect) {
        this.callAIModel(rect, userDrawDuration);
      }
    } else {
      // ✅ 新架构：取消绘制追踪
      this.cancelDrawTracking({ 
        reason: 'insufficient_points', 
        pointCount: this.points.length,
        toolType: 'iss-rect'
      });
      this.onDraw(rect);
    }
    
    this.clearDraw();
  }

  // 调用AI模型的方法
  private async callAIModel(rect: Rect, userDrawDuration: number) {
    try {
      // ✅ 新架构：开始AI辅助会话
      this.aiHelper.startAIAssistSession();
      this.aiHelper.trackAIAssistStart({ userDrawDuration });
      
      // 获取矩形边界
      const rectBounds = {
        x: rect.x(),
        y: rect.y(),
        width: rect.width(),
        height: rect.height()
      };
      
      // 获取当前图像和数据集信息
      const editor = this.view.editor;
      const frame = editor.getCurrentFrame();
      const bsState = (editor as any).bsState;
      
      if (!frame) {
        throw new Error('No current frame found');
      }
      
      // 构建AI模型配置
      const aiConfig = await this.buildAIConfig(frame, rectBounds, bsState);
      
      // 调用AI模型
      await this.aiHelper.processWithAI(aiConfig, 'AI is processing your selection...');
      this.deleteRect(rect);
    } catch (error: any) {
      // ✅ 新架构：AI辅助错误追踪
      this.aiHelper.trackAIAssistError(error.message || 'AI processing failed');
      
      this.showErrorMessage(error.message || 'AI processing failed');
      
      // AI处理失败时删除刚刚画的rect
      this.deleteRect(rect);
    }
  }

  // 构建AI配置
  private async buildAIConfig(frame: any, rectBounds: any, bsState: any) {
    // 获取可用的AI模型
    const models = this.view.editor.state.models || [];
    const segmentationModel = models.find((model: any) => 
      model.code === 'IMAGE_INTERACTIVE' || model.type === 'IMAGE_INTERACTIVE'
    );
    
    if (!segmentationModel) {
      throw new Error('No segmentation model available');
    }
    
    // 构建AI配置（基于现有runModel的配置结构）
    const config = {
      datasetId: bsState.datasetId,
      dataIds: [+frame.id],
      modelId: +segmentationModel.id,
      modelVersion: segmentationModel.version,
      modelCode: segmentationModel.code,
      dataType: 'SINGLE_DATA',
      resultFilterParam: {
        classes: segmentationModel!.classes?.map((e: any) => e.value) || [],
        interactiveData: {
          type: 'rect',
          coordinates: {
            x: rectBounds.x,
            y: rectBounds.y,
            width: rectBounds.width,
            height: rectBounds.height
          }
        }
      }
    };
    
    return config;
  }

  // AI处理逻辑
  private async processWithAI(config: any) {
    // 显示加载状态
    this.showLoadingMessage('AI is processing your selection...');
    
    try {
      // 动态导入API模块 - 使用相对路径
      const { runModel } = await import('../../../../businessNew/api/model');
      
      // 调用AI模型API
      const result = await runModel(config);
      
      if (!result.data) {
        throw new Error('Invalid AI model response');
      }
      
      // 设置frame.model状态
      const editor = this.view.editor;
      const frame = editor.getCurrentFrame();
      const model = editor.state.models.find((e: any) => String(e.id) === String(config.modelId));
      
      if (!model) {
        throw new Error('Model not found');
      }
      
      frame.model = {
        recordId: result.data,
        id: model.id,
        version: model.version,
        state: 'loading' as any, // 使用字符串，因为这是frame.model的状态
        code: model.code,
      };
      
      // 轮询模型结果
      await this.pollModelResult(result.data);
      
    } catch (error) {
      throw error;
    } finally {
      this.hideLoadingMessage();
    }
  }

  // 轮询模型结果
  private async pollModelResult(recordId: string) {
    const maxAttempts = 10;
    const pollInterval = 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Manual poll once (returns true if completed)
        const isCompleted = await this.manualPollOnce(recordId);
        
        if (isCompleted) {
          return;
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        
        // 如果是模型明确返回的失败信息，立即抛出异常，不要重试
        
        if (error instanceof Error && (
          error.message.includes('service is busy') ||
          error.message.includes('Model processing failed') ||
          error.message.includes('Model failed')
        )) {
          throw error; // 直接抛出模型失败异常
        }

        // 对于其他错误（如网络错误），继续重试
        if (attempt === maxAttempts - 1) {
          throw new Error('AI processing timeout');
        }
      }
    }
    
    throw new Error('AI processing timeout');
  }

  // Manual poll once - returns true if completed (successfully or with error)
  private async manualPollOnce(recordId: string): Promise<boolean> {
    try {
      const editor = this.view.editor;
      const frame = editor.getCurrentFrame();
      
      const { getModelResult } = await import('../../../../businessNew/api/model');
      const data = await getModelResult([frame.id], recordId);
      
      if (data.data && data.data.modelDataResults) {
        const resultList = data.data.modelDataResults;
        const resultMap = {} as Record<string, any>;
        resultList.forEach((e: any) => {
          resultMap[e.dataId] = e;
        });
        
        const info = resultMap[frame.id];
        
        if (info) {
          const modelResult = info.modelResult;
          if (modelResult.code === 'OK') {
            const objects = (modelResult.objects || []) as any[];
            if (objects.length > 0) {
              // 更新frame.model状态
              if (frame.model) {
                frame.model.state = 'complete' as any;
              }
              
              // 存储结果到DataManager (使用与 InteractiveConfig.vue 相同的方法)
              (editor.dataManager as any).setModelResult(frame.id, { 
                objects, 
                modelCode: data.data.modelCode 
              });
              
              // 直接渲染结果
              const { convertModelResultAndAddISS } = await import('../utils/convertModelResultAndAddIss');
              const draw_objects = await convertModelResultAndAddISS({ objects, modelCode: data.data.modelCode }, editor) || [];
              
              // ✅ 新架构：AI辅助成功追踪
              this.trackAIAssistComplete(draw_objects.length);
              
              this.showSuccessMessage(`Created ${draw_objects.length} segmentation object(s)`);
              return true; // 成功完成
            } else {
              // ✅ 新架构：AI成功但没有检测到对象的情况
              this.trackAIAssistComplete(0);
              frame.model = undefined;
              this.showSuccessMessage('AI processing completed but no objects detected');
              return true; // 技术上成功，但没有结果
            }
                      } else {
              frame.model = undefined;
              // 抛出异常，让上层删除rect
              throw new Error(modelResult.message || 'Model processing failed');
            }
        }
      }
      
      return false; // 还没有完成
    } catch (error) {
      throw error;
    }
  }



  // 重写drawInfo方法，添加AI相关信息
  drawInfo() {
    const baseInfo = super.drawInfo();
    if (baseInfo) {
      return baseInfo + '\n🤖 AI processing will be triggered after completion';
    }
    return '';
  }

  // 用户反馈方法
  private showLoadingMessage(message: string) {
    // TODO: 集成实际的UI加载提示
    // 可以调用编辑器的消息系统
    const editor = this.view.editor;
    if (editor && typeof editor.showMsg === 'function') {
      editor.showMsg(MsgType.info, message);
    }
  }

  private hideLoadingMessage() {
    // TODO: 隐藏加载提示
  }

  private showErrorMessage(message: string) {
    const editor = this.view.editor;
    if (editor && typeof editor.showMsg === 'function') {
      editor.showMsg(MsgType.error, message);
    }
  }

  private showSuccessMessage(message: string) {
    const editor = this.view.editor;
    if (editor && typeof editor.showMsg === 'function') {
      editor.showMsg(MsgType.success, message);
    }
  }

  // 删除rect对象的方法
  private deleteRect(rect: Rect) {
    try {
      const editor = this.view.editor as any;
      // 如果rect存在于编辑器中，使用命令删除它
      if (rect && editor) {
        const frame = editor.getCurrentFrame();
        if (frame) {
          // 获取当前frame的所有对象
          const objects = editor.dataManager.getFrameObject(frame.id) || [];
          const rectIndex = objects.findIndex((obj: any) => obj === rect);
          
          if (rectIndex !== -1) {
            // 使用正确的命令名称删除对象
            editor.cmdManager.execute('delete-object', [rect]);
          } else {
            // 如果在objects中找不到，直接删除
            editor.cmdManager.execute('delete-object', [rect]);
          }
          
          // 手动触发重绘以确保界面更新
          this.forceRedraw();
        }
      }
    } catch (error) {
      // 删除失败时静默处理，用户界面会显示删除效果
    }
  }

  // 强制重绘方法
  private forceRedraw() {
    try {
      // 方法1: 通过ImageView重绘
      if (this.view && typeof this.view.draw === 'function') {
        this.view.draw();
      }
      
      // 方法2: 通过编辑器重绘
      const editor = this.view.editor as any;
      if (editor && typeof editor.render === 'function') {
        editor.render();
      }
      
      // 方法3: 通过Konva stage重绘
      if (this.view.stage) {
        this.view.stage.batchDraw();
      }
      
    } catch (error) {
      // 重绘失败时静默处理
    }
  }
} 