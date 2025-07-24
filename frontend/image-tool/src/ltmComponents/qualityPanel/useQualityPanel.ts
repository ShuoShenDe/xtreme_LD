import { ref, watch } from 'vue'
import { useProjectMetaStore } from '@/stores/projectMeta'
import { UIType } from 'image-editor'

// 全局状态，用于控制右侧面板的切换
const activeOperationTab = ref('operation')

export function useQualityPanel() {
  const projectMetaStore = useProjectMetaStore()

  // 控制评论气泡工具的显示/隐藏
  const updateCommentBubbleToolVisibility = () => {
    const editor = (window as any).editor
    if (!editor) {
      return
    }

    // 只有在 QC 阶段才显示评论气泡工具
    const shouldShow = projectMetaStore.phase === 'qc'
    
    // 检查 modeConfig.ui 是否存在
    if (!editor.state.modeConfig || !editor.state.modeConfig.ui) {
      return
    }
    
    editor.state.modeConfig.ui[UIType.tool_commentBubble] = shouldShow
    
    // 触发视图更新
    editor.emit('update_view_mode')
  }

  // 监听 phase 变化，自动更新工具可见性
  watch(() => projectMetaStore.phase, () => {
    updateCommentBubbleToolVisibility()
  })

  // 监听工具变化，自动切换到质检面板
  const handleToolChange = (toolName: string) => {
    // 只有在 QC 阶段才启用自动切换
    if (projectMetaStore.phase !== 'qc') {
      return
    }

    // 当用户使用评论气泡工具时，自动切换到质检面板
    if (toolName === 'comment-bubble') {
      activeOperationTab.value = 'quality-check'
    }
  }

  // 监听质检面板的离开，自动切换回编辑工具
  const handleQualityPanelLeave = () => {
    // 只有在 QC 阶段才启用自动切换
    if (projectMetaStore.phase !== 'qc') {
      return
    }

    // 如果当前工具是评论气泡工具，切换回编辑工具
    const editor = (window as any).editor
    if (editor && editor.state.activeTool === 'comment-bubble') {
      editor.actionManager.execute('selectTool')
    }
  }

  // 获取当前激活的标签页
  const getActiveTab = () => {
    return activeOperationTab.value
  }

  // 设置当前激活的标签页
  const setActiveTab = (tabKey: string) => {
    activeOperationTab.value = tabKey
  }

  return {
    activeOperationTab,
    updateCommentBubbleToolVisibility,
    handleToolChange,
    handleQualityPanelLeave,
    getActiveTab,
    setActiveTab
  }
} 