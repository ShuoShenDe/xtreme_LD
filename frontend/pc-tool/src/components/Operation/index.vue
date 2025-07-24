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
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { tabConfig, defaultActiveKey } from './config';

  // 当前激活的 tab
  const activeTab = ref(defaultActiveKey);

  // 当前激活的 tab 组件
  const activeTabComponent = computed(() => {
    const currentTab = tabConfig.find(tab => tab.key === activeTab.value);
    return currentTab?.component;
  });

  // 处理 tab 点击
  const handleTabClick = (tabKey: string) => {
    const tab = tabConfig.find(t => t.key === tabKey);
    if (tab && !tab.disabled) {
      activeTab.value = tabKey;
    }
  };
</script>

<style lang="less">
  .pc-editor-operation {
    color: white;
    height: 100%;
    overflow-y: auto;
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
