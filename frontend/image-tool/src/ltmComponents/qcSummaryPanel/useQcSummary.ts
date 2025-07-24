import { ref, computed, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { useProjectMetaStore } from '@/stores/projectMeta'
import { useCommentStore } from '@/stores/comment'
import { updateTask } from '@/ltmApi/task'
import useFlowIndex from '@/businessNew/components/Header/useFlowIndex'
import type { CommentData as ApiCommentData } from '@/ltmApi/types/comment'

export interface QcSummaryStats {
  totalFrames: number
  checkedFrames: number
  qualityScore: number
  errorCount: number
  warningCount: number
}

export function useQcSummary() {
  const { t } = useI18n()
  const projectMetaStore = useProjectMetaStore()
  const commentStore = useCommentStore()
  
  // 使用数据帧切换功能
  const { onIndex, indexInfo } = useFlowIndex()

  // 加载状态
  const isLoading = ref(false)
  const isOperating = ref(false)

  // 质检统计数据
  const summaryStats = reactive<QcSummaryStats>({
    totalFrames: 0,
    checkedFrames: 0,
    qualityScore: 0,
    errorCount: 0,
    warningCount: 0
  })

  // 获取质检版本号
  const qcVersion = computed(() => {
    return projectMetaStore.task.data.attributes.qcversion || '1'
  })

  // 动态获取所有根评论的状态分组
  const rootCommentsByStatus = computed(() => {
    const allComments = commentStore.allComments.data
    const rootComments = allComments.filter(comment => 
      comment.attributes.belong === projectMetaStore.taskId && 
      comment.attributes.parent === null
    )
    // 动态收集所有出现过的状态
    const statusMap: Record<string, ApiCommentData[]> = {}
    rootComments.forEach(comment => {
      const statusArr = comment.attributes.params?.status
      let status = 'open'
      if (Array.isArray(statusArr) && statusArr.length > 0) {
        status = statusArr[statusArr.length - 1].status || 'open'
      }
      if (!statusMap[status]) {
        statusMap[status] = []
      }
      statusMap[status].push(comment)
    })
    return statusMap
  })

  // 获取所有出现过的状态（用于排序和展示）
  const allRootCommentStatuses = computed(() => {
    return Object.keys(rootCommentsByStatus.value)
  })

  // 获取根评论总数
  const totalRootComments = computed(() => {
    return Object.values(rootCommentsByStatus.value).reduce((total, comments) => total + comments.length, 0)
  })

  // 处理任务通过
  const handlePass = async () => {
    try {
      isOperating.value = true
      
      // 获取下一个阶段
      const currentPhaseIndex = projectMetaStore.taskPhases.findIndex(phase => phase === projectMetaStore.phase)
      const nextPhase = projectMetaStore.taskPhases[currentPhaseIndex + 1]
      
      if (!nextPhase) {
        message.error(t('qcSummary.msg.lastPhase'))
        return
      }

      // 更新任务阶段
      await updateTask(projectMetaStore.taskId, {
        phase: nextPhase
      })

      // 更新本地状态
      projectMetaStore.phase = nextPhase
      projectMetaStore.task.data.attributes.phase = nextPhase

      message.success(t('qcSummary.operation.passSuccess'))
    } catch (error) {
      console.error('任务通过失败:', error)
      message.error(t('qcSummary.operation.operationFailed'))
    } finally {
      isOperating.value = false
    }
  }

  // 处理任务驳回
  const handleReject = async () => {
    try {
      isOperating.value = true
      
      // 获取上一个阶段
      const currentPhaseIndex = projectMetaStore.taskPhases.findIndex(phase => phase === projectMetaStore.phase)
      const prevPhase = projectMetaStore.taskPhases[currentPhaseIndex - 1]
      
      if (!prevPhase) {
        message.error(t('qcSummary.msg.firstPhase'))
        return
      }

      // 更新任务阶段
      await updateTask(projectMetaStore.taskId, {
        phase: prevPhase
      })

      // 更新本地状态
      projectMetaStore.phase = prevPhase
      projectMetaStore.task.data.attributes.phase = prevPhase

      message.success(t('qcSummary.operation.rejectSuccess'))
    } catch (error) {
      console.error('任务驳回失败:', error)
      message.error(t('qcSummary.operation.operationFailed'))
    } finally {
      isOperating.value = false
    }
  }

  // 跳转到评论首次出现帧
  const jumpToCommentFrame = async (comment: ApiCommentData) => {
    try {
      isLoading.value = true
      
      const frames = comment.attributes.frames
      if (!frames || frames.length === 0) {
        message.warning(t('qcSummary.msg.noFrame'))
        return
      }

      // 跳转到第一个帧
      const frameNumber = Number(frames[0])
      
      // frames[0] might be 1-based, but onIndex expects 0-based
      // Convert to 0-based index if needed
      const frameIndex = frameNumber - 1
      
      await onIndex({ index: frameIndex })
      
      message.success(t('qcSummary.msg.jumpToFrame', { frame: frameNumber }))
    } catch (error) {
      console.error('跳转失败:', error)
      message.error(t('qcSummary.msg.jumpFailed'))
    } finally {
      isLoading.value = false
    }
  }

  // 初始化统计数据
  const initSummaryStats = () => {
    summaryStats.totalFrames = indexInfo.value.total || 0
    summaryStats.checkedFrames = 0
    summaryStats.qualityScore = 0
    summaryStats.errorCount = 0
    summaryStats.warningCount = 0
  }

  // 刷新统计数据
  const refreshSummaryStats = async () => {
    try {
      // 这里后续可以调用API获取最新的质检统计数据
      initSummaryStats()
    } catch (error) {
      console.error('获取质检统计数据失败:', error)
      message.error(t('qcSummary.msg.fetchFailed'))
    }
  }

  return {
    isLoading,
    isOperating,
    summaryStats,
    indexInfo,
    qcVersion,
    rootCommentsByStatus,
    allRootCommentStatuses,
    totalRootComments,
    handlePass,
    handleReject,
    jumpToCommentFrame,
    refreshSummaryStats
  }
} 