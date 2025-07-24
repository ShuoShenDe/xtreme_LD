import { useInjectBSEditor } from '@/businessNew/context';
import { Event } from 'image-editor';
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import { default as CommentBubbleManager, ICommentBubbleConfig } from './CommentBubbleManager';
import { useProjectMetaStore } from '@/stores/projectMeta';
import { useAreaComment } from './useAreaComment';
import type { BubbleConfig } from '@/ltmApi/types/comment';
import type { CommentData } from '@/ltmApi/types/comment';
import type { CommentData as TreeCommentData, Label } from '@/ltmComponents/commentTree/types';
import { useCommentStore } from '@/stores/comment';
import { getLoginUsername } from '@/utils/auth';
import Editor from '@/package/image-editor/Editor';
import { LABEL_COLORS } from '@/ltmComponents/commentTree/types';

import { useI18n } from 'vue-i18n';

export default function useObjectComment() {
  const editor = useInjectBSEditor();
  const bubbleManager = ref<any>(null);
  const {t} = useI18n()
  
  // 在组件初始化时获取 useAreaComment 的方法
  const { createDefaultAreaComment } = useAreaComment();
  
  // 在组件初始化时获取 projectMetaStore
  const projectMetaStore = useProjectMetaStore();
  const commentStore = useCommentStore();

  // 创建默认的物体评论
  const createDefaultObjectComment = (selectedObject?: any, bubbleConfig?: BubbleConfig): CommentData => {
    // 获取当前帧索引
    const editor = (window as any).editor as Editor
    let frameIdx = 0
    if (editor) {
      const currentFrame = editor.getCurrentFrame()
      frameIdx = editor.getFrameIndex(currentFrame.id)
    } else {
      console.error('Editor not initialized yet, using frame 0')
    }

    // 获取 QC version
    const qcVersion = projectMetaStore.task.data.attributes.qcversion 
      ? Number(projectMetaStore.task.data.attributes.qcversion) 
      : 1

    const now = new Date().toISOString()
    const comment: CommentData = {
      id: '',
      type: 'comments',
      attributes: {
        category: 'task',
        belong: projectMetaStore.taskId,
        parent: null,
        content: '',
        params: {
          annotationProps: {},
          objectPropChecks: {}
        },
        type: 'object',
        target: '',
        frames: [frameIdx], // 使用当前帧索引
        version: qcVersion, // 使用项目配置的 QC version
        creator: getLoginUsername(),
        created: now,
        updated: now
      }
    }

    // 如果有选中的物体，保存其属性
    if (selectedObject) {
      // 保存物体的 attrs 和 userData
      comment.attributes.params!.annotationProps = {
        attrs: { ...selectedObject.attrs },
        className: selectedObject.className,
        userData: { ...selectedObject.userData },
        uuid: selectedObject.uuid
      }

      // 根据物体类型确定配置键
      const configKey = selectedObject.className
      
      // 检查是否有对应的配置
      if (!projectMetaStore.curQcSettings.annotationComponents?.[configKey as keyof typeof projectMetaStore.curQcSettings.annotationComponents]) {
        console.warn(`未找到物体类型 ${selectedObject.className} 对应的配置`)
      }

      // 根据 QC 设置配置，设置评论的默认值
      const objectComponents = projectMetaStore.curQcSettings.annotationComponents?.[configKey as keyof typeof projectMetaStore.curQcSettings.annotationComponents]?.objectComponents
      if (objectComponents) {
        for (const component of objectComponents) {
          if (component.type === 'rejectReason') {
            comment.attributes.params![component.valueName] = []
          } else if (component.type === 'frameRange') {
            comment.attributes.params![component.valueName] = {
              type: 'current',
              start: 1,
              end: 1
            }
          } else if (component.type === 'comment') {
            comment.attributes.content = ''
          }
        }
      }

      // 根据 objectInfo 配置，设置物体属性检查的默认值
      const objectInfo = projectMetaStore.curQcSettings.annotationComponents?.[configKey as keyof typeof projectMetaStore.curQcSettings.annotationComponents]?.objectInfo || []
      for (const info of objectInfo) {
        if (info.valueName) {
          comment.attributes.params!.objectPropChecks![info.valueName] = false
        }
      }
    }

    // 如果有气泡配置，保存到 params 中
    if (bubbleConfig) {
      comment.attributes.params!.bubbleConfig = bubbleConfig
    }

    return comment
  }

  // 验证评论是否有效
  const validateComment = (comment: CommentData): boolean => {
    const params = comment.attributes.params || {}
    
    // 检查是否有拒绝原因
    const hasRejectReasons = objectComponents.value.some((component: any) => {
      if (component.type === 'rejectReason') {
        const reasons = params[component.valueName]
        return Array.isArray(reasons) && reasons.length > 0
      }
      return false
    })

    // 检查是否有评论内容
    const hasComment = comment.attributes.content.trim() !== ''

    // 检查是否有物体属性检查
    const hasCheckedAttributes = Object.values(params.objectPropChecks || {}).some(value => value === true)

    return hasRejectReasons || hasComment || hasCheckedAttributes
  }

  // 获取物体组件配置
  const objectComponents = computed(() => {
    const selectedObject = getCurrentSelection()
    if (!selectedObject || selectedObject.length === 0) {
      return []
    }

    const object = selectedObject[0]
    const configKey = object.className

    return projectMetaStore.curQcSettings.annotationComponents?.[configKey as keyof typeof projectMetaStore.curQcSettings.annotationComponents]?.objectComponents || []
  })

  // 获取物体信息配置
  const objectInfo = computed(() => {
    // 这里需要从外部传入选中的物体，而不是从 getCurrentSelection 获取
    // 因为对话框组件需要知道具体是哪个物体
    return []
  })

  // 获取最大帧数
  const maxFrameNum = computed(() => {
    const editor = (window as any).editor as Editor
    if (editor && editor.state && editor.state.sceneIds) {
      return editor.state.sceneIds.length
    }
    return 1
  })

  // 选择事件处理函数
  const handleSelect = (preSelection: any[], currentSelection: any[]) => {
    // 获取评论 store
    const commentStore = useCommentStore();
    
    if (currentSelection.length > 0) {
      currentSelection.forEach((object) => {
        // 检查是否是气泡
        if (object.className === 'comment-bubble') {
          const commentId = object.userData?.commentId;
          if (commentId) {
            // 高亮对应的评论
            commentStore.setHighlightCommentIds([commentId]);
          }
        } else {
          // 如果选中的不是气泡，取消所有评论高亮
          commentStore.clearHighlightCommentIds();
        }
      });
    } else {
      // 没有选中任何物体时，取消所有评论高亮
      commentStore.clearHighlightCommentIds();
    }
  };

  // 评论气泡创建事件处理函数
  const handleCommentBubbleCreate = (config: ICommentBubbleConfig) => {
    // 检查是否是 QC 阶段
    if (projectMetaStore.phase !== 'qc') {
      return;
    }
    
    // 创建默认的区域评论，包含气泡配置
    // 将 ICommentBubbleConfig 转换为 BubbleConfig
    const bubbleConfig: BubbleConfig = {
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height,
      tailWidth: config.tailWidth,
      tailHeight: config.tailHeight
    };
    
    const areaComment = createDefaultAreaComment(bubbleConfig);
    
    // 触发事件，让父组件处理对话框显示
    editor.emit('AREA_COMMENT_CREATE', { comment: areaComment, bubbleConfig: config });
  };

  // 评论气泡创建完成事件处理函数
  const handleCommentBubbleCreated = (data: { bubbleId: string; config: ICommentBubbleConfig }) => {
    // 这里可以添加创建评论的逻辑
    // 例如：打开评论创建对话框，然后将气泡配置和评论内容一起保存到数据库
    // 保存评论后，可以通过 createBubbleByCommentId 重新创建气泡并关联评论ID
  };

  // 在组件挂载时获取气泡管理器实例并设置事件监听器
  onMounted(() => {
    // 获取已初始化的单例实例
    const manager = CommentBubbleManager.getInstance();
    bubbleManager.value = manager;
    
    // 注意：不再在这里注册事件监听器，因为 CommentBubbleInitializer 已经处理了
    // 避免重复监听同一事件导致的问题
  });

  // 在组件卸载时清理事件监听器（但不销毁管理器）
  onBeforeUnmount(() => {
    // 注意：不再在这里清理事件监听器，因为 CommentBubbleInitializer 已经处理了
    // 避免重复清理导致的问题
    bubbleManager.value = null;
  });



  /**
   * 获取当前选中的物体信息
   */
  function getCurrentSelection() {
    const selection = editor.selection;
    return selection;
  }

  // ========== 评论气泡相关方法 ==========

  /**
   * 通过代码创建气泡
   */
  function createBubble(config: ICommentBubbleConfig): string | null {
    if (!bubbleManager.value) {
      console.error('气泡管理器未初始化');
      return null;
    }
    
    try {
      const bubbleId = bubbleManager.value.createBubble(config);
      return bubbleId;
    } catch (error) {
      console.error('创建气泡失败:', error);
      return null;
    }
  }

  /**
   * 通过评论ID创建气泡
   */
  function createBubbleByCommentId(commentId: string, config: ICommentBubbleConfig): string | null {
    if (!bubbleManager.value) {
      console.error('气泡管理器未初始化');
      return null;
    }
    
    try {
      const bubbleId = bubbleManager.value.createBubbleByCommentId(commentId, config);
      return bubbleId;
    } catch (error) {
      console.error('通过评论ID创建气泡失败:', error);
      return null;
    }
  }

  /**
   * 删除气泡
   */
  function deleteBubble(bubbleId: string): boolean {
    if (!bubbleManager.value) {
      console.error('气泡管理器未初始化');
      return false;
    }
    
    try {
      const result = bubbleManager.value.deleteBubble(bubbleId);
      return result;
    } catch (error) {
      console.error('删除气泡失败:', error);
      return false;
    }
  }

  /**
   * 通过评论ID删除气泡
   */
  function deleteBubbleByCommentId(commentId: string): boolean {
    if (!bubbleManager.value) {
      console.error('气泡管理器未初始化');
      return false;
    }
    
    try {
      const result = bubbleManager.value.deleteBubbleByCommentId(commentId);
      return result;
    } catch (error) {
      console.error('通过评论ID删除气泡失败:', error);
      return false;
    }
  }

  /**
   * 高亮气泡
   */
  function highlightBubble(bubbleId: string): boolean {
    if (!bubbleManager.value) {
      console.error('气泡管理器未初始化');
      return false;
    }
    
    try {
      const result = bubbleManager.value.highlightBubble(bubbleId);
      return result;
    } catch (error) {
      console.error('高亮气泡失败:', error);
      return false;
    }
  }

  /**
   * 通过评论ID高亮气泡
   */
  function highlightBubbleByCommentId(commentId: string): boolean {
    if (!bubbleManager.value) {
      console.error('气泡管理器未初始化');
      return false;
    }
    
    try {
      const result = bubbleManager.value.highlightBubbleByCommentId(commentId);
      return result;
    } catch (error) {
      console.error('通过评论ID高亮气泡失败:', error);
      return false;
    }
  }

  /**
   * 通过评论ID取消高亮气泡
   */
  function unhighlightBubbleByCommentId(commentId: string): boolean {
    if (!bubbleManager.value) {
      console.error('气泡管理器未初始化');
      return false;
    }
    
    try {
      const result = bubbleManager.value.unhighlightBubbleByCommentId(commentId);
      return result;
    } catch (error) {
      console.error('通过评论ID取消高亮气泡失败:', error);
      return false;
    }
  }

  /**
   * 获取气泡管理器实例
   */
  function getBubbleManager(): CommentBubbleManager | null {
    return bubbleManager.value;
  }



  // 将数据库评论数据转换为树形评论数据
  const convertToTreeCommentData = (comment: CommentData): TreeCommentData => {
    const labels: Label[] = []
    

    // 只为根评论添加标签
    if (comment.attributes.parent === null) {
      // 评论状态标签，取 status 的最后一个作为当前状态
      const status = comment.attributes.params?.status?.[comment.attributes.params.status.length - 1]
      if (status) {
        labels.push({
          id: `status-${comment.id}`,
          content: `${t('commentTree.comments.status')}: ${status.status}`, // 直接使用硬编码文本，避免 useI18n 依赖
          textColor: LABEL_COLORS.STATUS_TEXT.text,
          backgroundColor: LABEL_COLORS.STATUS_TEXT.background
        })
      }

      // 根据物体的 className 获取对应的配置键
      const className = comment.attributes.params?.annotationProps?.className
      const configKey = className
      
      // 检查是否有对应的配置
      if (!projectMetaStore.curQcSettings.annotationComponents?.[configKey as keyof typeof projectMetaStore.curQcSettings.annotationComponents]) {
        console.warn(`未找到物体类型 ${className} 对应的配置，跳过标签渲染`)
        return {
          id: comment.id,
          commentVersion: comment.attributes.version?.toString() || '1',
          creator: comment.attributes.creator,
          created: comment.attributes.created,
          parrentId: comment.attributes.parent || '',
          parrentCreator: '', // 这个值会在 CommentTree 组件中设置
          content: comment.attributes.content,
          labels
        }
      }

      // 获取对应的配置
      const config = projectMetaStore.curQcSettings.annotationComponents?.[configKey as keyof typeof projectMetaStore.curQcSettings.annotationComponents]
      if (!config) {
        console.warn(`未找到物体类型 ${className} 对应的配置，跳过标签渲染`)
        return {
          id: comment.id,
          commentVersion: comment.attributes.version?.toString() || '1',
          creator: comment.attributes.creator,
          created: comment.attributes.created,
          parrentId: comment.attributes.parent || '',
          parrentCreator: '', // 这个值会在 CommentTree 组件中设置
          content: comment.attributes.content,
          labels
        }
      }

      // 处理拒绝原因标签
      const objectComponents = config.objectComponents || []
      objectComponents.forEach((component: any) => {
        if (component.type === 'rejectReason') {
          const reasons = comment.attributes.params?.[component.valueName]
          if (Array.isArray(reasons) && reasons.length > 0) {
            reasons.forEach((reason: string) => {
              const option = component.options?.find((opt: any) => opt.value === reason)
              if (option) {
                labels.push({
                  id: `reject-${reason}`,
                  content: option.label,
                  textColor: LABEL_COLORS.REJECT_TEXT.text,
                  backgroundColor: LABEL_COLORS.REJECT_TEXT.background
                })
              }
            })
          }
        }
      })

      // 处理只读属性标签
      const objectInfo = config.objectInfo || []
      const annotationProps = comment.attributes.params?.annotationProps || {}
      
      objectInfo.forEach((info: any) => {
        if (info.canCheck === false) { // 只读属性
          try {
            // 根据 propName 获取属性值
            const propValue = getNestedProperty(annotationProps, info.propName)
            if (propValue !== undefined) {
              labels.push({
                id: `readonly-${info.valueName}`,
                content: `${info.label}: ${propValue}`,
                textColor: LABEL_COLORS.OBJECT_TEXT.text,
                backgroundColor: LABEL_COLORS.OBJECT_TEXT.background
              })
            } else {
              console.warn(`无法获取属性值: ${info.propName}`)
            }
          } catch (error) {
            console.warn(`获取属性值失败: ${info.propName}`, error)
          }
        }
      })

      // 处理错误属性标签
      const objectPropChecks = comment.attributes.params?.objectPropChecks || {}
      objectInfo.forEach((info: any) => {
        if (info.canCheck === true) { // 可检查属性
          const isError = objectPropChecks[info.valueName]
          if (isError === true) {
            labels.push({
              id: `error-${info.valueName}`,
              content: info.label,
              textColor: LABEL_COLORS.PROP_ERROR_TEXT.text,
              backgroundColor: LABEL_COLORS.PROP_ERROR_TEXT.background
            })
          }
        }
      })
    }

    return {
      id: comment.id,
      commentVersion: comment.attributes.version?.toString() || '1',
      creator: comment.attributes.creator,
      created: comment.attributes.created,
      parrentId: comment.attributes.parent || '',
      parrentCreator: '', // 这个值会在 CommentTree 组件中设置
      content: comment.attributes.content,
      labels
    }
  }

  // 辅助函数：根据路径获取嵌套属性值
  const getNestedProperty = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  // 获取物体评论列表
  const objectComments = computed(() => {
    // 获取当前帧索引
    const editor = (window as any).editor as Editor
    let currentFrameIdx = 0
    if (editor) {
      const currentFrame = editor.getCurrentFrame()
      currentFrameIdx = editor.getFrameIndex(currentFrame.id)
    } else {
      console.error('Editor not initialized yet, using frame 0')
    }

    return commentStore.allComments.data
      .filter(comment => {
        // 过滤条件：属于当前任务、类型为object、且包含当前帧
        if (comment.attributes.belong !== projectMetaStore.taskId || 
            comment.attributes.type !== 'object') {
          return false
        }
        
        // 检查 frames 是否包含当前帧
        const frames = comment.attributes.frames
        if (!frames || frames.length === 0) {
          return false
        }
        
        // 确保 frames 是数字数组进行比较
        const frameNumbers = frames.map((f: string | number) => Number(f))
        return frameNumbers.includes(currentFrameIdx)
      })
      .map(convertToTreeCommentData)
  })

  // 处理评论回复
  const handleReply = async (payload: { id: string; content: string }) => {
    try {
      // 创建回复评论
      const replyComment: CommentData = {
        id: '',
        type: 'comments',
        attributes: {
          category: 'task',
          belong: projectMetaStore.taskId,
          parent: payload.id,
          content: payload.content,
          params: {},
          type: 'object',
          target: '',
          frames: [], // 回复评论不需要帧信息
          version: 1,
          creator: getLoginUsername(),
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      }
      
      await commentStore.addComment(replyComment)
      return true
    } catch (error) {
      console.error('回复评论失败:', error)
      throw error
    }
  }

  // 处理评论删除
  const handleDelete = async (commentId: string) => {
    try {
      // 检查是否有子评论
      const hasChildren = commentStore.allComments.data.some(
        comment => comment.attributes.parent === commentId
      )
      
      if (hasChildren) {
        throw new Error('Cannot delete comment with children')
      }

      // 调用 store 的删除方法
      await commentStore.removeComment(commentId)
      return true
    } catch (error) {
      console.error('删除评论失败:', error)
      throw error
    }
  }

  // 处理评论状态变更
  const handleChangeStatus = async (payload: { id: string; status: string }) => {
    try {
      // 获取当前评论
      const comment = commentStore.allComments.data.find(c => c.id === payload.id)
      if (!comment) {
        throw new Error('Comment not found')
      }

      // 构建状态更新数据
      const currentStatus = comment.attributes.params?.status || []
      const newStatus = {
        operator: getLoginUsername(),
        created: new Date().toISOString(),
        status: payload.status
      }

      const updateData = {
        params: {
          ...comment.attributes.params,
          status: [...currentStatus, newStatus]
        },
        updated: new Date().toISOString()
      }

      // 调用 store 的更新方法
      await commentStore.updateComment(payload.id, updateData)
      return true
    } catch (error) {
      console.error('更新评论状态失败:', error)
      throw error
    }
  }

  return {
    // 气泡相关方法
    createBubble,
    createBubbleByCommentId,
    deleteBubble,
    deleteBubbleByCommentId,
    highlightBubble,
    highlightBubbleByCommentId,
    unhighlightBubbleByCommentId,
    getBubbleManager,
    
    // 评论相关方法
    createDefaultObjectComment,
    validateComment,
    objectComponents,
    objectInfo,
    maxFrameNum,
    convertToTreeCommentData,
    objectComments,
    handleReply,
    handleDelete,
    handleChangeStatus
  };
}
