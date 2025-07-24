<template>
  <div class="pc-editor-operation">
    <div class="operation-tabs">
      <div class="tabs-sidebar">
        <div
          v-for="(tab, index) in tabConfig"
          :key="tab.key"
          class="tab-item"
          :class="{ 
            active: activeTab === tab.key,
            disabled: tab.disabled 
          }"
          @click="handleTabClick(tab.key)"
        >
          <component :is="tab.icon" class="tab-icon" />
        </div>
      </div>
      <div class="tabs-content">
        <component :is="activeTabComponent" />
      </div>
    </div>
    <div v-show="!canOperate()" class="over-not-allowed"></div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
  import useUI from '../../hook/useUI';
  import { tabConfig, defaultActiveKey } from './config';
  import { useQualityPanel } from '@/ltmComponents/qualityPanel/useQualityPanel';
  import { useProjectMetaStore } from '@/stores/projectMeta';
  import { Event } from 'image-editor';

  const { canOperate } = useUI();
  const { activeOperationTab, handleToolChange, updateCommentBubbleToolVisibility } = useQualityPanel();
  const projectMetaStore = useProjectMetaStore();

  // 当前激活的 tab
  const activeTab = computed(() => activeOperationTab.value);

  // 当前激活的 tab 组件
  const activeTabComponent = computed(() => {
    const currentTab = tabConfig.find(tab => tab.key === activeTab.value);
    return currentTab?.component;
  });

  // 处理 tab 点击
  const handleTabClick = (tabKey: string) => {
    const tab = tabConfig.find(t => t.key === tabKey);
    if (tab && !tab.disabled) {
      activeOperationTab.value = tabKey;
    }
  };

  // 监听工具变化
  onMounted(() => {
    const editor = (window as any).editor;
    if (editor) {
      // 监听 activeTool 变化
      watch(() => editor.state.activeTool, (newTool) => {
        handleToolChange(newTool);
      });
      
      // 监听编辑器初始化完成事件
      editor.on('BUSINESS_INIT', () => {
        setTimeout(() => {
          updateCommentBubbleToolVisibility();
        }, 100);
      });
      
      // 初始化时更新工具可见性
      updateCommentBubbleToolVisibility();
    }
  });

  onUnmounted(() => {
    // 不需要手动清理 watch，Vue 会自动处理
  });

  // 监听项目元数据变化，确保工具可见性正确
  watch(() => projectMetaStore.phase, (newPhase) => {
    // 延迟执行，确保 editor 已经初始化
    setTimeout(() => {
      updateCommentBubbleToolVisibility();
    }, 100);
  });

  // 监听项目元数据加载完成
  watch(() => projectMetaStore.task, (newTask) => {
    if (newTask && newTask.data && newTask.data.id) {
      setTimeout(() => {
        updateCommentBubbleToolVisibility();
      }, 100);
    }
  });

  // 监听 modeConfig 变化
  watch(() => {
    const editor = (window as any).editor;
    return editor?.state?.modeConfig;
  }, (newModeConfig) => {
    if (newModeConfig) {
      setTimeout(() => {
        updateCommentBubbleToolVisibility();
      }, 100);
    }
  }, { deep: true });
</script>

<style lang="less">
  .pc-editor-operation {
    position: absolute;
    color: white;
    inset: 0;
    overflow-y: overlay;
    display: flex;
    flex-direction: column;

    &::-webkit-scrollbar {
      width: 0;
    }
  }

  .operation-tabs {
    display: flex;
    height: 100%;
    width: 100%;
  }

  .tabs-sidebar {
    width: 48px;
    background-color: #1f1f1f;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 8px;
  }

  .tab-item {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 6px;
    margin-bottom: 4px;
    transition: all 0.2s ease;
    color: #999;

    &:hover {
      background-color: #333;
      color: #fff;
    }

    &.active {
      background-color: #1890ff;
      color: #fff;
    }

    &.disabled {
      cursor: not-allowed;
      color: #666;
      opacity: 0.5;

      &:hover {
        background-color: transparent;
        color: #666;
      }
    }
  }

  .tab-icon {
    font-size: 16px;
  }

  .tabs-content {
    flex: 1;
    overflow: hidden;
  }
</style>
