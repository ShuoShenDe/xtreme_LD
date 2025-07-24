<!-- ObjectProperties.vue -->
<template>
  <div v-if="selectedObject" class="object-properties">
    <a-collapse v-model:activeKey="activeCollapse">
      <!-- Common Properties -->
      <a-collapse-panel
        v-if="filteredCommonProps.length > 0"
        key="common"
        :header="t('objectInfoPanel.commonProps')"
      >
        <div class="property-list">
          <property-editor
            v-for="prop in filteredCommonProps"
            :key="prop.propName"
            v-model="propValues[prop.propName]"
            :prop-setting="prop"
            :selected-object="selectedObject"
            :type-settings="currentTypeSettings"
            size="small"
            @change="handlePropertyChange"
          />
        </div>
      </a-collapse-panel>

      <!-- Object Properties -->
      <a-collapse-panel
        v-if="filteredObjectProps.length > 0"
        key="object"
        :header="t('objectInfoPanel.objectProps')"
      >
        <div class="property-list">
          <property-editor
            v-for="prop in filteredObjectProps"
            :key="prop.propName"
            v-model="propValues[prop.propName]"
            :prop-setting="prop"
            :selected-object="selectedObject"
            :type-settings="currentTypeSettings"
            size="small"
            @change="handlePropertyChange"
          />
        </div>
      </a-collapse-panel>
    </a-collapse>
  </div>
  <div v-else class="no-object-selected">
    <p>{{ t('objectInfoPanel.noObjectSelected') }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useProjectMetaStore } from '@/stores/projectMeta';
import type { ObjectInfoItem } from '@/stores/types/projectMeta';
import type { PropertyChangeEvent } from '../types';
import PropertyEditor from '../editors/PropertyEditor.vue';
import { getPropertyByPath } from '../utils';

interface Props {
  selectedObject: any;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'property-change', event: PropertyChangeEvent): void;
}>();
const projectMetaStore = useProjectMetaStore();
const { t } = useI18n();
const activeCollapse = ref(['common', 'object']);

// Get current object type configuration
const currentTypeSettings = computed(() => {
  if (!props.selectedObject?.className || !projectMetaStore.curLabelSettings) {
    return null;
  }

  const className = props.selectedObject.className;
  return projectMetaStore.curLabelSettings[className as keyof typeof projectMetaStore.curLabelSettings];
});

// Common properties list (filter out non-existent properties)
const filteredCommonProps = computed<ObjectInfoItem[]>(() => {
  const configProps = currentTypeSettings.value?.commonProps || [];
  return configProps.filter((prop: ObjectInfoItem) => {
    const value = getPropertyByPath(props.selectedObject, prop.propName);
    return value !== undefined;
  });
});

// Object properties list (filter out non-existent properties)
const filteredObjectProps = computed<ObjectInfoItem[]>(() => {
  const configProps = currentTypeSettings.value?.objectProps || [];
  return configProps.filter((prop: ObjectInfoItem) => {
    const value = getPropertyByPath(props.selectedObject, prop.propName);
    return value !== undefined;
  });
});

// 属性值映射
const propValues = computed(() => {
  const values: Record<string, any> = {};
  
  if (!props.selectedObject) {
    return values;
  }

  // Handle common properties
  filteredCommonProps.value.forEach((prop) => {
    const value = getPropertyByPath(props.selectedObject, prop.propName);
    values[prop.propName] = value;
  });

  // Handle object properties
  filteredObjectProps.value.forEach((prop) => {
    const value = getPropertyByPath(props.selectedObject, prop.propName);
    values[prop.propName] = value;
  });

  return values;
});

// Handle property changes
const handlePropertyChange = (event: PropertyChangeEvent) => {
  // 向上传递属性变化事件
  emit('property-change', event);
};
</script>

<style scoped>
.object-properties {
  color: #fff;
}

.property-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-object-selected {
  color: #888;
  text-align: center;
  padding: 20px;
}

/* a-collapse 样式覆盖 */
.object-properties :deep(.ant-collapse) {
  border: none;
  background: transparent;
}

.object-properties :deep(.ant-collapse-header) {
  background: transparent;
  color: #fff !important;
  border-bottom: 1px solid #3d3d3d;
}

.object-properties :deep(.ant-collapse-content) {
  background: transparent;
  color: #fff;
  padding: 16px;
}

.object-properties :deep(.ant-collapse-item) {
  background: transparent;
  border-bottom: 1px solid #3d3d3d;
}
</style> 