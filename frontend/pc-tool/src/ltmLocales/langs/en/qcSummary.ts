export default {
  title: 'QC Summary',
  description: 'Task quality check summary panel',
  operation: {
    title: 'Operation Area',
    pass: 'Pass',
    reject: 'Reject',
    passSuccess: 'Task passed successfully',
    rejectSuccess: 'Task rejected successfully',
    operationFailed: 'Operation failed'
  },
  data: {
    title: 'Data Display Area',
    version: 'QC Version',
    totalComments: 'Total Root Comments',
    statusGroups: {
      open: 'Open',
      close: 'Closed',
      fixed: 'Fixed'
    }
  },
  comments: {
    empty: 'No comments yet',
    clickToJump: 'Click to jump to comment first frame'
  },
  msg: {
    lastPhase: 'Already the last phase',
    firstPhase: 'Already the first phase',
    noFrame: 'This comment is not associated with any frame',
    jumpToFrame: 'Jumped to frame {frame}',
    jumpFailed: 'Jump failed, please check frame range',
    fetchFailed: 'Failed to fetch QC summary data'
  }
} 