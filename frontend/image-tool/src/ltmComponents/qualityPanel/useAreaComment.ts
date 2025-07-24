import { ref, computed } from 'vue'
import type { CommentData, BubbleConfig } from '@/ltmApi/types/comment'
import type { CommentData as TreeCommentData, Label } from '@/ltmComponents/commentTree/types'
import { useProjectMetaStore } from '@/stores/projectMeta'
import { useCommentStore } from '@/stores/comment'
import { getLoginUsername } from '@/utils/auth'
import Editor from '@/package/image-editor/Editor'
import { LABEL_COLORS } from '@/ltmComponents/commentTree/types'
import { useI18n } from 'vue-i18n'

export function useAreaComment() {
  const {t} = useI18n()
  const projectMetaStore = useProjectMetaStore()
  const commentStore = useCommentStore()
  
  // 创建默认的区域评论
  const createDefaultAreaComment = (bubbleConfig?: BubbleConfig): CommentData => {
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
        params: {},
        type: 'area',
        target: '',
        frames: [frameIdx], // 使用当前帧索引
        version: qcVersion, // 使用项目配置的 QC version
        creator: getLoginUsername(),
        created: now,
        updated: now
      }
    }

    // 如果有气泡配置，保存到 params 中
    if (bubbleConfig) {
      comment.attributes.params!.bubbleConfig = bubbleConfig
    }

    // 根据 QC 设置配置，设置评论的默认值
    const areaComponents = projectMetaStore.curQcSettings.annotationComponents?.area?.objectComponents || []
    for (const component of areaComponents) {
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

    return comment
  }

  // 验证评论是否有效
  const validateComment = (comment: CommentData): boolean => {
    const params = comment.attributes.params || {}
    
    // 检查是否有拒绝原因
    const hasRejectReasons = areaComponents.value.some(component => {
      if (component.type === 'rejectReason') {
        const reasons = params[component.valueName]
        return Array.isArray(reasons) && reasons.length > 0
      }
      return false
    })

    // 检查是否有评论内容
    const hasComment = comment.attributes.content.trim() !== ''

    return hasRejectReasons || hasComment
  }

  // 获取区域组件配置
  const areaComponents = computed(() => {
    return projectMetaStore.curQcSettings.annotationComponents?.area?.objectComponents || []
  })

  // 获取最大帧数
  const maxFrameNum = computed(() => {
    const editor = (window as any).editor as Editor
    if (editor && editor.state && editor.state.sceneIds) {
      return editor.state.sceneIds.length
    }
    return 1
  })

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

      // 处理拒绝原因标签
      const areaComponents = projectMetaStore.curQcSettings.annotationComponents?.area?.objectComponents || []
      areaComponents.forEach((component: any) => {
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

  // 获取区域评论列表
  const areaComments = computed(() => {
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
        // 过滤条件：属于当前任务、类型为area、且包含当前帧
        if (comment.attributes.belong !== projectMetaStore.taskId || 
            comment.attributes.type !== 'area') {
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
      const replyComment = createDefaultAreaComment()
      replyComment.attributes.parent = payload.id
      replyComment.attributes.content = payload.content
      
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
    createDefaultAreaComment,
    validateComment,
    areaComponents,
    maxFrameNum,
    convertToTreeCommentData,
    areaComments,
    handleReply,
    handleDelete,
    handleChangeStatus
  }
} 