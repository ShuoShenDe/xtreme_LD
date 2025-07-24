import { Vector2 } from '../types';
import ImageView from '../ImageView/index';

/**
 * AI辅助标注工具接口
 */
interface AIAssistedTool {
  view: ImageView;
  name: string;
  emitPerformanceMetric(metricName: string, value: number, unit: string, metadata?: Record<string, any>): void;
  showLoadingMessage(message: string): void;
  hideLoadingMessage(): void;
  showSuccessMessage(message: string): void;
  showErrorMessage(message: string): void;
  handleAISuccess(objects: any[], modelCode: string, editor: any): Promise<void>;
}

/**
 * AI辅助标注助手类
 * 包含所有AI相关的通用逻辑，避免代码重复
 */
export class AIAssistantHelper {
  // AI会话管理
  private aiStartTime: number = 0;
  private aiSessionId: string = '';
  
  private host: AIAssistedTool;

  constructor(host: AIAssistedTool) {
    this.host = host;
  }

  /**
   * 开始AI辅助会话
   */
  startAIAssistSession(metadata?: Record<string, any>): void {
    this.aiStartTime = Date.now();
    this.aiSessionId = `ai-${this.host.name}-${this.aiStartTime}`;
  }

  /**
   * 分类错误类型
   */
  private classifyErrorType(errorMessage: string): string {
    if (errorMessage.includes('timeout')) {
      return 'timeout_error';
    } else if (errorMessage.includes('No segmentation model available')) {
      return 'model_unavailable';
    } else if (errorMessage.includes('service is busy')) {
      return 'service_busy';
    } else if (errorMessage.includes('Model processing failed') || errorMessage.includes('Model failed')) {
      return 'model_processing_failed';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'network_error';
    }
    return 'unknown_error';
  }

  /**
   * 追踪AI辅助开始
   */
  trackAIAssistStart(metadata: Record<string, any> = {}): void {
    this.host.emitPerformanceMetric('ai_assist_start', this.aiStartTime, 'timestamp', {
      sessionId: this.aiSessionId,
      phase: 'ai_processing_start',
      ...metadata
    });
  }

  /**
   * 追踪AI辅助成功
   */
  trackAIAssistComplete(generatedCount: number, metadata: Record<string, any> = {}): void {
    const aiDuration = Date.now() - this.aiStartTime;
    this.host.emitPerformanceMetric('ai_assist_complete', aiDuration, 'milliseconds', {
      generatedObjectCount: generatedCount,
      sessionId: this.aiSessionId,
      success: true,
      phase: 'ai_processing_complete',
      ...metadata
    });
  }

  /**
   * 追踪AI辅助错误
   */
  trackAIAssistError(errorMessage: string, metadata: Record<string, any> = {}): void {
    const aiDuration = Date.now() - this.aiStartTime;
    const errorType = this.classifyErrorType(errorMessage);
    
    this.host.emitPerformanceMetric('ai_assist_error', aiDuration, 'milliseconds', {
      errorMessage,
      errorType,
      sessionId: this.aiSessionId,
      success: false,
      phase: 'ai_processing_error',
      ...metadata
    });
  }

  /**
   * 构建基础AI配置
   */
  async buildBaseAIConfig(frame: any, bsState: any): Promise<{
    datasetId: any,
    dataIds: number[],
    modelId: number,
    modelVersion: string,
    modelCode: string,
    dataType: string,
    segmentationModel: any
  }> {
    // 获取可用的AI模型
    const models = this.host.view.editor.state.models || [];
    const segmentationModel = models.find((model: any) => 
      model.code === 'IMAGE_INTERACTIVE' || model.type === 'IMAGE_INTERACTIVE'
    );
    
    if (!segmentationModel) {
      throw new Error('No segmentation model available');
    }
    
    return {
      datasetId: bsState.datasetId,
      dataIds: [+frame.id],
      modelId: +segmentationModel.id,
      modelVersion: segmentationModel.version,
      modelCode: segmentationModel.code,
      dataType: 'SINGLE_DATA',
      segmentationModel
    };
  }

  /**
   * AI处理通用逻辑
   */
  async processWithAI(config: any, loadingMessage: string = 'AI is processing...'): Promise<void> {
    // 显示加载状态
    this.host.showLoadingMessage(loadingMessage);
    
    try {
      // 动态导入API模块
      const { runModel } = await import('../../../businessNew/api/model');
      
      // 调用AI模型API
      const result = await runModel(config);
      
      if (!result.data) {
        throw new Error('Invalid AI model response');
      }
      
      // 设置frame.model状态
      const editor = this.host.view.editor;
      const frame = editor.getCurrentFrame();
      const model = editor.state.models.find((e: any) => String(e.id) === String(config.modelId));
      
      if (!model) {
        throw new Error('Model not found');
      }
      
      frame.model = {
        recordId: result.data,
        id: model.id,
        version: model.version,
        state: 'loading' as any,
        code: model.code,
      };
      
      // 轮询模型结果
      await this.pollModelResult(result.data);
      
    } catch (error) {
      throw error;
    } finally {
      this.host.hideLoadingMessage();
    }
  }

  /**
   * 轮询模型结果
   */
  async pollModelResult(recordId: string): Promise<void> {
    const maxAttempts = 10;
    const pollInterval = 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Manual poll once (returns true if completed)
        console.log(`pollModelResult times ${attempt + 1}/${maxAttempts}`);
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

  /**
   * 单次轮询
   */
  async manualPollOnce(recordId: string): Promise<boolean> {
    try {
      const editor = this.host.view.editor;
      const frame = editor.getCurrentFrame();
      
      const { getModelResult } = await import('../../../businessNew/api/model');
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
              
              // 存储结果到DataManager
              (editor.dataManager as any).setModelResult(frame.id, { 
                objects, 
                modelCode: data.data.modelCode 
              });
              
              // 处理AI成功的结果 - 由宿主类实现
              await this.host.handleAISuccess(objects, data.data.modelCode, editor);
              return true; // 成功完成
            } else {
              // AI成功但没有检测到对象的情况
              this.trackAIAssistComplete(0);
              frame.model = undefined;
              this.host.showSuccessMessage('AI processing completed but no objects detected');
              return true; // 技术上成功，但没有结果
            }
          } else {
            frame.model = undefined;
            // 抛出异常，让上层处理
            throw new Error(modelResult.message || 'Model processing failed');
          }
        }
      }
      
      return false; // 还没有完成
    } catch (error) {
      throw error;
    }
  }
} 