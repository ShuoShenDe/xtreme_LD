<!-- StringMappingEditor.vue -->
<template>
  <div class="property-editor property-editor--inline" :style="editorStyle">
    <span class="property-label">{{ propSetting.label }}</span>
    <a-select
      :model-value="displayValue"
      @change="handleChange"
      v-bind="$attrs"
    >
      <a-select-option
        v-for="(label, value) in propSetting.propTypeSettings?.mapping || {}"
        :key="value"
        :label="label"
        :value="value"
      />
    </a-select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ObjectInfoItem } from '@/stores/types/projectMeta';
import type { PropertyEditorProps, PropertyChangeEvent } from '../types';

interface Props extends PropertyEditorProps {}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'change', event: PropertyChangeEvent): void;
}>();

// Handle mapping value
const displayValue = computed(() => {
  let value = props.modelValue;
  
  // If it's an array, take the first element
  if (Array.isArray(value)) {
    value = value.length > 0 ? value[0] : '';
  }

  // If value is empty, return empty string directly
  if (!value) {
    return '';
  }

  const { mapping, ignoreCase, trim } = props.propSetting.propTypeSettings || {};
  
  // If no mapping configuration, return original value
  if (!mapping) {
    return value;
  }

  // Process input value, value might not be a string, force conversion
  let processedValue = String(value);
  if (trim) {
    processedValue = processedValue.trim();
  }
  if (ignoreCase) {
    processedValue = processedValue.toLowerCase();
  }

  // 查找映射值
  const mappingEntries = Object.entries(mapping);
  const matchedEntry = mappingEntries.find(([key]) => {
    let processedKey = key;
    if (trim) {
      processedKey = processedKey.trim();
    }
    if (ignoreCase) {
      processedKey = processedKey.toLowerCase();
    }
    return processedKey === processedValue;
  });

  return matchedEntry ? matchedEntry[0] : value;
});

// Handle selection change
const handleChange = (newValue: string) => {
  emit('change', {
    selectedObject: props.selectedObject,
    propSetting: props.propSetting,
    oldValue: props.modelValue,
    newValue: Array.isArray(props.modelValue) ? [newValue] : newValue
  });
};

// Editor style, supports highlight color
const editorStyle = computed(() => {
  if (props.highlightColor) {
    return {
      backgroundColor: props.highlightColor,
      padding: '4px',
      borderRadius: '4px'
    };
  }
  return {};
});
</script>

<style scoped>
.property-editor {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.property-label {
  font-size: 12px;
  color: #888;
}

.property-editor--inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.property-editor--inline .property-label {
  flex-shrink: 0;
  min-width: 80px;
}

.property-editor--inline :deep(.ant-select) {
  flex: 1;
  min-width: 0;
}
</style> 