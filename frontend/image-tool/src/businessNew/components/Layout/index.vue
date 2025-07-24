<template>
  <!-- [header] -->
  <!-- [container] = [tools, editor, operation] -->
  <div class="image-tool-layout">
    <div class="layout-header"><slot name="header" /></div>
    <div class="layout-content">
      <div class="tools-wrap"><slot name="tools" /></div>
      <div class="main-wrap"><slot name="default" /></div>
      <div 
        class="operation-wrap" 
        :style="{ width: operationWidth + 'px' }"
      >
        <slot name="operation" />
      </div>
      <div 
        class="resize-handle"
        :style="{ right: operationWidth + 'px' }"
        @mousedown="startResize"
      ></div>
      <slot name="mask"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const operationWidth = ref(350);
const minWidth = 350;
const isResizing = ref(false);

const startResize = (e: MouseEvent) => {
  e.preventDefault();
  isResizing.value = true;
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', stopResize);
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isResizing.value) return;
  
  const container = document.querySelector('.layout-content') as HTMLElement;
  if (!container) return;
  
  const containerRect = container.getBoundingClientRect();
  const newWidth = containerRect.right - e.clientX;
  
  if (newWidth >= minWidth) {
    operationWidth.value = newWidth;
  }
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', stopResize);
};

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', stopResize);
});
</script>

<style lang="less">
  .image-tool-layout {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background-color: #3a393e;

    .layout-header {
      width: 100%;
      height: 54px;
      background-color: #1e1f22;
    }
    .layout-content {
      flex: 1;
      display: flex;
      flex-direction: row;
      position: relative;
    }
    .tools-wrap {
      width: 50px;
    }
    .operation-wrap {
      position: relative;
      min-width: 350px;
      padding: 4px;
      background-color: #3a393e;
    }
    .main-wrap {
      flex: 1;
    }
    .resize-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 4px;
      background-color: transparent;
      cursor: col-resize;
      z-index: 10;
      
      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      &:active {
        background-color: rgba(255, 255, 255, 0.2);
      }
    }
  }
</style>
