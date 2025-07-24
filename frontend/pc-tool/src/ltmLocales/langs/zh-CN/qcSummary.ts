export default {
  title: '质检汇总',
  description: '任务质检信息的汇总面板',
  operation: {
    title: '操作区',
    pass: '通过',
    reject: '驳回',
    passSuccess: '任务已通过',
    rejectSuccess: '任务已驳回',
    operationFailed: '操作失败'
  },
  data: {
    title: '数据展示区',
    version: '质检版本',
    totalComments: '根评论总数',
    statusGroups: {
      open: '未解决',
      close: '已解决',
      fixed: '已修改'
    }
  },
  comments: {
    empty: '暂无评论',
    clickToJump: '点击跳转到评论首次出现帧'
  },
  msg: {
    lastPhase: '已经是最后一个阶段',
    firstPhase: '已经是第一个阶段',
    noFrame: '该评论没有关联的帧',
    jumpToFrame: '已跳转到第{frame}帧',
    jumpFailed: '跳转失败，请检查数据帧范围',
    fetchFailed: '获取质检统计数据失败'
  }
} 