<template>
    <div class="qc-summary-panel">
        <div class="panel-header">
            <h3>{{ $t('qcSummary.title') }}</h3>
            <p class="panel-description">{{ $t('qcSummary.description') }}</p>
        </div>

        <div class="panel-content">
            <!-- 操作区 - 只在 qc 阶段显示 -->
            <div v-if="projectMetaStore.phase === 'qc'" class="operation-section">
                <h4>{{ $t('qcSummary.operation.title') }}</h4>
                <div class="operation-buttons">
                    <a-button 
                        type="primary" 
                        @click="handlePass" 
                        :loading="isOperating"
                        class="pass-button"
                    >
                        <template #icon>
                            <CheckCircleOutlined />
                        </template>
                        {{ $t('qcSummary.operation.pass') }}
                    </a-button>
                    <a-button 
                        danger 
                        @click="handleReject" 
                        :loading="isOperating"
                        class="reject-button"
                    >
                        <template #icon>
                            <CloseCircleOutlined />
                        </template>
                        {{ $t('qcSummary.operation.reject') }}
                    </a-button>
                </div>
            </div>

            <!-- 数据展示区 -->
            <div class="data-section">
                <h4>{{ $t('qcSummary.data.title') }}</h4>
                
                <!-- 基本信息 -->
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">{{ $t('qcSummary.data.version') }}</div>
                        <div class="info-value">{{ qcVersion }}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">{{ $t('qcSummary.data.totalComments') }}</div>
                        <div class="info-value">{{ totalRootComments }}</div>
                    </div>
                </div>

                <!-- 按状态分组的评论 -->
                <div class="comments-section">
                    <div 
                        v-for="status in allRootCommentStatuses" 
                        :key="status"
                        class="status-group"
                    >
                        <div class="status-header">
                            <span class="status-title">{{ $t(`qcSummary.data.statusGroups.${status}`) || status }}</span>
                            <span class="status-count">({{ rootCommentsByStatus[status]?.length || 0 }})</span>
                        </div>
                        <div class="status-content">
                            <SimpleCommentTree 
                                :comments="rootCommentsByStatus[status] || []"
                                @comment-click="handleCommentClick"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Button as AButton } from 'ant-design-vue';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons-vue';
import { useQcSummary } from './useQcSummary';
import { useProjectMetaStore } from '@/stores/projectMeta';
import SimpleCommentTree from './SimpleCommentTree.vue';

// 使用质检汇总 composable
const {
    isLoading,
    isOperating,
    summaryStats,
    indexInfo,
    qcVersion,
    rootCommentsByStatus,
    allRootCommentStatuses,
    totalRootComments,
    handlePass,
    handleReject,
    jumpToCommentFrame
} = useQcSummary();

// 获取项目元数据 store
const projectMetaStore = useProjectMetaStore();

// 处理评论点击
const handleCommentClick = (comment: any) => {
    jumpToCommentFrame(comment);
};
</script>

<style lang="less" scoped>
.qc-summary-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #252525;
    color: #ffffff;
    padding: 16px;
    overflow-y: auto;

    .panel-header {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #333;

        h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 600;
            color: #ffffff;
        }

        .panel-description {
            margin: 0;
            color: #888;
            font-size: 14px;
        }
    }

    .panel-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 20px;

        .operation-section {
            background: #1e1f22;
            padding: 20px;
            border-radius: 6px;
            border: 1px solid #333;

            h4 {
                margin: 0 0 16px 0;
                font-size: 16px;
                font-weight: 500;
                color: #ffffff;
            }

            .operation-buttons {
                display: flex;
                gap: 12px;

                .pass-button {
                    flex: 1;
                    height: 40px;
                    font-weight: 500;
                }

                .reject-button {
                    flex: 1;
                    height: 40px;
                    font-weight: 500;
                }
            }
        }

        .data-section {
            background: #1e1f22;
            padding: 20px;
            border-radius: 6px;
            border: 1px solid #333;
            flex: 1;
            display: flex;
            flex-direction: column;

            h4 {
                margin: 0 0 16px 0;
                font-size: 16px;
                font-weight: 500;
                color: #ffffff;
            }

            .info-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
                margin-bottom: 20px;

                .info-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 90px;
                    background: #2a2a2a;
                    border-radius: 6px;
                    border: 1px solid #333;
                    text-align: center;

                    .info-label {
                        font-size: 13px;
                        color: #888;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        font-weight: 500;
                    }

                    .info-value {
                        font-size: 32px;
                        font-weight: 700;
                        color: #1890ff;
                        line-height: 1;
                        letter-spacing: 1px;
                    }
                }
            }

            .comments-section {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 16px;
                overflow-y: auto;

                .status-group {
                    .status-header {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 12px;
                        padding: 8px 12px;
                        background: #2a2a2a;
                        border-radius: 4px;
                        border: 1px solid #333;

                        .status-title {
                            font-size: 14px;
                            font-weight: 500;
                            color: #d4d4d4;
                        }

                        .status-count {
                            font-size: 12px;
                            color: #888;
                        }
                    }

                    .status-content {
                        height: 200px;
                        overflow-y: auto;
                    }
                }
            }
        }
    }
}

/* 自定义滚动条样式 */
.qc-summary-panel::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.qc-summary-panel::-webkit-scrollbar-track {
    background: #1e1e1e;
}

.qc-summary-panel::-webkit-scrollbar-thumb {
    background: #3d3d3d;
    border-radius: 4px;
}

.qc-summary-panel::-webkit-scrollbar-thumb:hover {
    background: #4d4d4d;
}
</style>
