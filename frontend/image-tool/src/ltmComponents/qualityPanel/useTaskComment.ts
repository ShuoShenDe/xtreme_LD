import { ref, computed } from 'vue'
import type { CommentData } from '@/ltmApi/types/comment'
import type { CommentData as TreeCommentData, Label } from '@/ltmComponents/commentTree/types'
import { useProjectMetaStore } from '@/stores/projectMeta'
import { useCommentStore } from '@/stores/comment'
import { getLoginUsername } from '@/utils/auth'
import { useI18n } from 'vue-i18n'
import Editor from '@/package/image-editor/Editor'
import { LABEL_COLORS } from '@/ltmComponents/commentTree/types'

export function useTaskComment() {
  const projectMetaStore = useProjectMetaStore()
  const commentStore = useCommentStore()
  const { t } = useI18n()
  
  // 创建默认的任务评论
  const createDefaultTaskComment = (): CommentData => {
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
        type: 'task',
        target: '',
        frames: [frameIdx], // 使用当前帧索引
        version: qcVersion, // 使用项目配置的 QC version
        creator: getLoginUsername(),
        created: now,
        updated: now
      }
    }

    // 根据 QC 设置配置，设置评论的默认值
    const taskComponents = projectMetaStore.curQcSettings.taskComponents
    for (const component of taskComponents) {
      if (component.type === 'rejectReason') {
        comment.attributes.params![component.valueName] = []
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
    const hasRejectReasons = taskComponents.value.some(component => {
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

  // 获取任务组件配置
  const taskComponents = computed(() => {
    return projectMetaStore.curQcSettings.taskComponents
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
          content: `${t('commentTree.comments.status')}: ${status.status}`,
          textColor: LABEL_COLORS.STATUS_TEXT.text,
          backgroundColor: LABEL_COLORS.STATUS_TEXT.background
        })
      }

      // 处理拒绝原因标签
      const taskComponents = projectMetaStore.curQcSettings.taskComponents
      taskComponents.forEach(component => {
        if (component.type === 'rejectReason') {
          const reasons = comment.attributes.params?.[component.valueName]
          if (Array.isArray(reasons) && reasons.length > 0) {
            reasons.forEach((reason: string) => {
              const option = component.options?.find((opt) => opt.value === reason)
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

  // 获取任务评论列表
  const taskComments = computed(() => {
    return commentStore.allComments.data
      .filter(comment => 
        comment.attributes.belong === projectMetaStore.taskId &&
        comment.attributes.type === 'task'
      )
      .map(convertToTreeCommentData)
  })

  // 处理评论回复
  const handleReply = async (payload: { id: string; content: string }) => {
    try {
      const replyComment = createDefaultTaskComment()
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
    createDefaultTaskComment,
    validateComment,
    taskComponents,
    taskComments,
    handleReply,
    handleDelete,
    handleChangeStatus
  }
} 