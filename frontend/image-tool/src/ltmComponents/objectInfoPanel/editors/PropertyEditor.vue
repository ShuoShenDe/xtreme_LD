<!-- PropertyEditor.vue -->
<template>
  <component 
    :is="editorComponent" 
    :model-value="props.modelValue" 
    :prop-setting="props.propSetting"
    :selected-object="props.selectedObject" 
    :type-settings="props.typeSettings"
    :highlight-color="props.highlightColor"
    v-bind="$attrs" 
    @change="handleChange" 
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ObjectInfoItem } from '@/stores/types/projectMeta';
import type { PropertyEditorProps, PropertyChangeEvent } from '../types';
import StringEditor from './StringEditor.vue';
import NumberEditor from './NumberEditor.vue';
import BooleanEditor from './BooleanEditor.vue';
import StringMappingEditor from './StringMappingEditor.vue';

interface Props extends PropertyEditorProps {}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'change', event: PropertyChangeEvent): void;
}>();

// Select corresponding editor component based on property type
const editorComponent = computed(() => {
  switch (props.propSetting.propType) {
    case 'Number':
      return NumberEditor;
    case 'String':
      return StringEditor;
    case 'Boolean':
      return BooleanEditor;
    case 'StringMapping':
      return StringMappingEditor;
    default:
      return StringEditor; // 默认使用字符串编辑器
  }
});

// Handle editor component change events
const handleChange = (event: PropertyChangeEvent) => {
  emit('change', event);
};
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

/* 普通输入框使用行内布局 */
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
  /* 防止 flex 子元素溢出 */
}

:deep(.ant-input.ant-input-disabled) {
  background-color: #2b2b2b !important;
}

:deep(.ant-input.ant-input-disabled .ant-input) {
  color: #d3d3d3 !important;
  -webkit-text-fill-color: #d3d3d3 !important;
}
</style> 