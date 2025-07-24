<template>
  <div class="operation-tab">
    <SourceTab />
    <Classification />
    <Results />
  </div>
</template>

<script setup lang="ts">
  import SourceTab from './SourceTab/index.vue';
  import Classification from './Classification/index.vue';
  import Results from './Results/index.vue';
</script>

<style lang="less" scoped>
  .operation-tab {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style> 