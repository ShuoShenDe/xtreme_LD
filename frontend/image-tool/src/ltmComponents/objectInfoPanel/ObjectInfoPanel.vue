<template>
  <div class="object-info-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-left">
        <h3>{{ t('objectInfoPanel.title') }}</h3>
      </div>
      <div class="header-actions">
        <a-tooltip :title="t('objectInfoPanel.viewMode.toggle')">
          <a-button 
            :type="viewMode === ViewMode.JSON ? 'primary' : 'default'" 
            @click="toggleViewMode"
            size="small"
          >
            <i class="fas fa-code"></i>
            {{ viewMode === ViewMode.JSON ? t('objectInfoPanel.viewMode.component') : t('objectInfoPanel.viewMode.json') }}
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="panel-content">
      <template v-if="viewMode === ViewMode.JSON">
        <!-- JSON Mode -->
        <div v-if="selectedObject" class="json-view">
          <json-editor-vue
            :content="jsonContent"
            :mode="Mode.tree"
            class="jse-theme-dark"
            height="100%"
          />
        </div>
        <div v-else class="no-selection">
          <p>{{ t('objectInfoPanel.noObjectSelected') }}</p>
        </div>
      </template>
      
      <template v-else>
        <!-- Component Mode -->
        <div v-if="selectedObject && hasConfiguration" class="component-view">
          <object-properties 
            :selected-object="selectedObject" 
            @property-change="handlePropertyChange"
          />
          <!-- 添加物体属性编辑组件 -->
          <object-edit-class 
            :selected-object="selectedObject"
          />
        </div>
        <div v-else-if="selectedObject && !hasConfiguration" class="no-configuration">
          <p>{{ t('objectInfoPanel.noConfiguration') }}</p>
          <p class="object-type">{{ t('objectInfoPanel.objectType') }}: {{ selectedObject.className }}</p>
          <!-- 即使没有配置，也显示编辑组件 -->
          <object-edit-class 
            :selected-object="selectedObject"
          />
        </div>
        <div v-else class="no-selection">
          <p>{{ t('objectInfoPanel.noObjectSelected') }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import JsonEditorVue from 'json-editor-vue';
import { Mode } from 'vanilla-jsoneditor';
import { useObjectInfoPanel } from './useObjectInfoPanel';
import { ViewMode } from './types';
import ObjectProperties from './components/ObjectProperties.vue';
import ObjectEditClass from './components/ObjectEditClass.vue';
import { useProjectMetaStore } from '@/stores/projectMeta';
import { useObjectPropertyUpdate } from './useObjectPropertyUpdate';
import type { PropertyChangeEvent } from './types';
import 'vanilla-jsoneditor/themes/jse-theme-dark.css';

const { selectedObject, viewMode, toggleViewMode } = useObjectInfoPanel();
const projectMetaStore = useProjectMetaStore();
const { t } = useI18n();
const { updateObjectProperty } = useObjectPropertyUpdate();

// JSON editor content
const jsonContent = computed(() => {
  return {
    json: selectedObject.value,
  };
});

// Check if configuration exists
const hasConfiguration = computed(() => {
  if (!selectedObject.value?.className) {
    return false;
  }
  
  const className = selectedObject.value.className;
  const labelSettings = projectMetaStore.curLabelSettings;
  
  if (!labelSettings) {
    return false;
  }
  
  const typeSettings = labelSettings[className as keyof typeof labelSettings];
  if (!typeSettings) {
    return false;
  }
  
  return true;
});

// Expand all nodes
const expandAll = () => {
  nextTick(() => {
    const editorElement = document.querySelector('.jse');
    if (editorElement) {
          // Find and click expand button
    const expandButton = editorElement.querySelector('button.jse-button.jse-expand-all') as HTMLElement;
      if (expandButton) {
        expandButton.click();
      }
    }
  });
};

// Handle property changes from ObjectProperties component
const handlePropertyChange = (event: PropertyChangeEvent) => {
  // 更新编辑器中的物体属性
  updateObjectProperty(event);
  
  // 更新 selectedObject 以保持面板数据同步
  if (selectedObject.value && event.selectedObject.uuid === selectedObject.value.uuid) {
    // 创建一个新的对象引用以触发响应式更新
    const updatedObject = { ...selectedObject.value };
    
    // 根据属性路径更新对象
    const { propSetting, newValue } = event;
    const keys = propSetting.propName.split('.');
    let current = updatedObject;
    
    // 遍历到最后一个键的父对象
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    // 设置最终属性值
    current[keys[keys.length - 1]] = newValue;
    
    // 更新 selectedObject
    selectedObject.value = updatedObject;
  }
};

// Watch selectedObject changes
watch(selectedObject, (newVal, oldVal) => {
  // When changing from null to a value and currently in json view, try to expand all nodes
  if (!oldVal && newVal && viewMode.value === ViewMode.JSON) {
    expandAll();
  }
});
</script>

<style scoped>
.object-info-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #252525;
  color: #ffffff;
}

.panel-header {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #3d3d3d;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-left h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
  min-height: 0; /* 重要：确保 flex 布局正确处理滚动 */
}

/* 自定义滚动条样式 */
.panel-content::-webkit-scrollbar {
  width: 8px;
}

.panel-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #3d3d3d;
  border-radius: 4px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #4d4d4d;
}

.json-view {
  height: 100%;
}

.component-view {
  height: 100%;
}

.no-selection,
.no-configuration {
  text-align: center;
  color: #8c8c8c;
  padding: 40px 0;
}

.no-selection p,
.no-configuration p {
  margin: 0;
  font-size: 14px;
}

.object-type {
  font-size: 12px !important;
  color: #666 !important;
  margin-top: 8px !important;
}

/* JSON 编辑器样式覆盖 */
.panel-content :deep(.jse) {
  height: 100%;
  background: #252525;
  border: 1px solid #3d3d3d;
  border-radius: 4px;
}

/* 覆盖所有可能的滚动条样式 */
.panel-content :deep(*)::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
}

.panel-content :deep(*)::-webkit-scrollbar-track {
  background: #1e1e1e !important;
}

.panel-content :deep(*)::-webkit-scrollbar-thumb {
  background: #3d3d3d !important;
  border-radius: 4px !important;
}

.panel-content :deep(*)::-webkit-scrollbar-thumb:hover {
  background: #4d4d4d !important;
}

.panel-content :deep(*)::-webkit-scrollbar-corner {
  background: #1e1e1e !important;
}

/* 特别处理 navigation bar 的滚动条 */
.panel-content :deep(.jse-navigation-bar)::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
}

.panel-content :deep(.jse-navigation-bar)::-webkit-scrollbar-track {
  background: #1e1e1e !important;
}

.panel-content :deep(.jse-navigation-bar)::-webkit-scrollbar-thumb {
  background: #3d3d3d !important;
  border-radius: 4px !important;
}

.panel-content :deep(.jse-navigation-bar)::-webkit-scrollbar-thumb:hover {
  background: #4d4d4d !important;
}

.panel-content :deep(.jse-navigation-bar)::-webkit-scrollbar-corner {
  background: #1e1e1e !important;
}

/* 特别处理主内容区域的滚动条 */
.panel-content :deep(.jse-main)::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
}

.panel-content :deep(.jse-main)::-webkit-scrollbar-track {
  background: #1e1e1e !important;
}

.panel-content :deep(.jse-main)::-webkit-scrollbar-thumb {
  background: #3d3d3d !important;
  border-radius: 4px !important;
}

.panel-content :deep(.jse-main)::-webkit-scrollbar-thumb:hover {
  background: #4d4d4d !important;
}

.panel-content :deep(.jse-main)::-webkit-scrollbar-corner {
  background: #1e1e1e !important;
}
</style>
