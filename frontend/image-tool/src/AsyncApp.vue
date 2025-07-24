<template>
    <Editor />
</template>

<script setup lang="ts">
import Editor from '/@/businessNew/Editor.vue';
import { useProjectMetaStore } from '@/stores/projectMeta';
import { useCommentStore } from '@/stores/comment';

// 在组件挂载时获取项目元数据
// 这个函数会在 Suspense 中等待完成
const projectMetaStore = useProjectMetaStore();
const commentStore = useCommentStore();

try {
  // 确保项目元数据已加载
  await projectMetaStore.fetchProjectMeta();
  
  // 确保评论数据已加载
  await commentStore.fetchAllComments();
  
  console.log('项目数据和评论数据加载完成');
} catch (error) {
  console.error('数据加载失败:', error);
  // 即使数据加载失败，也继续渲染组件，避免整个应用崩溃
}
</script>

<style scoped>
/* 样式继承自 Editor 组件 */
</style> 