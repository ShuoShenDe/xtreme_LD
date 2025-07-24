<template>
  <div class="operation-tab">
    <Results />
    <Classification />
    <Instance />
  </div>
</template>

<script setup lang="ts">
  import Results from './Results/index.vue';
  import Instance from '../Instance/index.vue';
  import Classification from './Classification/index.vue';
</script>

<style lang="less" scoped>
  .operation-tab {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style> 