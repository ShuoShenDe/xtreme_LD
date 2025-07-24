<!-- NumberEditor.vue -->
<template>
  <div class="property-editor property-editor--inline" :style="editorStyle">
    <span class="property-label">{{ propSetting.label }}</span>
    <a-input-number
      :value="displayValue"
      v-bind="inputNumberProps"
      @change="handleChange"
    />
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

// Handle array values and precision
const displayValue = computed(() => {
  let value = props.modelValue;
  
  // If value is an array, take the first element
  if (Array.isArray(value)) {
    value = value[0];
  }
  
  return value;
});

// Configure a-input-number props based on propTypeSettings
const inputNumberProps = computed(() => {
  const settings = props.propSetting.propTypeSettings || {};
  const inputProps: Record<string, any> = {};
  
  // Set precision if specified
  if (settings.precision !== undefined) {
    inputProps.precision = settings.precision;
  }
  
  // Set step if specified
  if (settings.step !== undefined) {
    inputProps.step = settings.step;
  }
  
  // Set min if specified
  if (settings.min !== undefined) {
    inputProps.min = settings.min;
  }
  
  // Set max if specified
  if (settings.max !== undefined) {
    inputProps.max = settings.max;
  }
  
  return inputProps;
});

// Handle change event
const handleChange = (value: number | null) => {
  const numValue = value === null ? 0 : value;
  
  // If original value is an array, maintain array format
  const newValue = Array.isArray(props.modelValue) ? [numValue] : numValue;
  
  emit('change', {
    selectedObject: props.selectedObject,
    propSetting: props.propSetting,
    oldValue: props.modelValue,
    newValue
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

.property-editor--inline :deep(.ant-input-number) {
  flex: 1;
  min-width: 0;
}
</style> 