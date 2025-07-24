<!-- StringEditor.vue -->
<template>
  <div class="property-editor property-editor--inline" :style="editorStyle">
    <span class="property-label">{{ propSetting.label }}</span>
    <a-input
      :value="displayValue"
      @update:modelValue="handleInput"
      v-bind="$attrs"
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

// Handle display value
const displayValue = computed(() => {
  const value = props.modelValue;
  
  // If it's an array, take the first element
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : '';
  }
  
  // If value is undefined or null, return empty string
  return value ?? '';
});

// Handle input event
const handleInput = (value: string) => {
  // If original value is an array, maintain array format
  const newValue = Array.isArray(props.modelValue) ? [value] : value;
  
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

.property-editor--inline :deep(.ant-input) {
  flex: 1;
  min-width: 0;
}
</style> 