<template>
  <div class="collapse-panel">
    <div class="panel-header">
      <div class="header-left" @click="toggleExpand">
        <DownOutlined v-if="expanded" class="expand-icon" />
        <RightOutlined v-else class="expand-icon" />
        <div class="title">
          <slot name="title"></slot>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click.stop="handleAdd" :title="t('collapsePanel.add')">
          <PlusOutlined />
        </button>
      </div>
    </div>
    <div v-show="expanded" class="panel-content">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { DownOutlined, RightOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const expanded = ref(true);

const toggleExpand = () => {
  expanded.value = !expanded.value;
};

const emit = defineEmits(['add']);

const handleAdd = () => {
  emit('add');
};
</script>

<style lang="less" scoped>
.collapse-panel {
  background: #2d2d2d;
  border-radius: 4px;
  margin-bottom: 8px;
  border: 1px solid #4a4a4a;
}

.panel-header {
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #363636;
  font-size: 13px;
  border-radius: 4px 4px 0 0;
  min-height: 32px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #404040;
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  flex: 1;
}

.expand-icon {
  color: #909399;
  font-size: 12px;
  transition: transform 0.2s;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.panel-content {
  padding: 12px;
  background: #2d2d2d;
  border-radius: 0 0 4px 4px;
}

.action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid #3d3d3d;
  border-radius: 50%;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;

  &:hover {
    background: #4d4d4d;
    border-color: #4d4d4d;
  }

  &:active {
    background: #5d5d5d;
  }
}
</style>
