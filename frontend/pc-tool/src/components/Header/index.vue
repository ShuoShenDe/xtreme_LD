<template>
    <div class="pc-flow">
        <div class="item-wrap">
            <span :class="blocking ? 'close disable' : 'close'" @click="blocking ? null : onClose()"
                ><CloseOutlined /><span style="margin-left: 4px">{{ $$('btn-close') }}</span></span
            >
            <div class="task-header-info">
                <span :title="iState.dataName || ''" class="task-header-name">{{
                    iState.dataName || ''
                }}</span>
                <i class="iconfont icon-a-Jobinformation task-header-icon"></i>
            </div>
        </div>
        
        <!-- Scene Navigation for Multiple Scenes -->
        <div class="item-wrap data-index" v-if="state.isSeriesFrame && state.sceneIds.length > 1">
            <LeftOutlined
                :class="state.sceneIndex > 0 && !blocking ? 'icon' : 'icon disable'"
                @click="state.sceneIndex > 0 && !blocking ? onScenePre() : null"
            />
            <a-input-number
                :disabled="blocking"
                v-model:value="sceneDisplayIndex"
                size="small"
                :min="1"
                :step="1"
                @change="onSceneIndexChange"
                @blur="onSceneIndexBlur"
                :max="state.sceneIds.length"
                style="width: 50px; text-align: center; font-size: 18px"
            />
            <span class="text">
                <span style="margin-right: 4px">/</span>{{ state.sceneIds.length }}
            </span>
            <RightOutlined
                :class="
                    state.sceneIndex < state.sceneIds.length - 1 && !blocking
                        ? 'icon'
                        : 'icon disable'
                "
                @click="state.sceneIndex < state.sceneIds.length - 1 && !blocking ? onSceneNext() : null"
            />
        </div>
        
        <!-- Frame Navigation for Single Scene or Non-Series Frame -->
        <div class="item-wrap data-index" v-else-if="state.frames.length > 0">
            <LeftOutlined
                :class="state.frameIndex > 0 && !blocking ? 'icon' : 'icon disable'"
                @click="state.frameIndex > 0 && !blocking ? onPre() : null"
            />
            <a-input-number
                :disabled="blocking"
                v-model:value="dataIndex"
                size="small"
                :min="1"
                :step="1"
                @change="onIndexChange"
                @blur="onIndexBlur"
                :max="state.frames.length"
                style="width: 50px; text-align: center; font-size: 18px"
            />
            <span class="text">
                <span style="margin-right: 4px">/</span>{{ state.frames.length }}
            </span>
            <RightOutlined
                :class="
                    state.frameIndex < state.frames.length - 1 && !blocking
                        ? 'icon'
                        : 'icon disable'
                "
                @click="state.frameIndex < state.frames.length - 1 && !blocking ? onNext() : null"
            />
            <span class="frame-label" style="margin-left: 8px; color: #bec1ca; font-size: 12px;">
                {{ state.isSeriesFrame ? 'Frames' : 'Frames' }}
            </span>
        </div>
        
        <div class="item-wrap">
            <!-- Save -->
            <a-button
                class="basic-btn"
                v-if="has(BsUIType.flowSave)"
                :disabled="blocking"
                size="large"
                :loading="bsState.saving"
                @click="onSave"
            >
                <template #icon><SaveOutlined /></template>
                <div class="title">{{ $$('btn-save') }}</div>
            </a-button>
            <!-- shortcut -->
            <a-button class="basic-btn" size="large" :disabled="blocking" @click="onHelp">
                <template #icon
                    ><i style="font-size: 16px" class="iconfont icon-help"></i
                ></template>
                <div class="title">{{ $$('btn-shortcut') }}</div>
            </a-button>
            <!-- full screen -->
            <a-button class="basic-btn" size="large" @click="onFullScreen">
                <template #icon>
                    <i
                        style="font-size: 16px"
                        class="iconfont"
                        :class="[iState.fullScreen ? 'icon-tuichuquanping' : 'icon-a-Fullscreen']"
                    ></i
                ></template>
                <div class="title">{{
                    iState.fullScreen ? $$('btn-full-exit') : $$('btn-full')
                }}</div>
            </a-button>
            <!-- Language Switch -->
            <a-divider type="vertical" style="height: 32px; background-color: #57575c" />
            <div class="language-switch" @click="toggleLanguage">
                <span class="language-text">{{ currentLanguageText }}</span>
                <i class="iconfont icon-down action-icon" />
            </div>
            <a-divider type="vertical" style="height: 32px; background-color: #57575c" />
            <template v-if="editor.state.frameIndex >= 0">
                <a-button
                    class="basic modify"
                    :disabled="blocking"
                    :loading="bsState.modifying"
                    v-show="!canEdit()"
                    @click="onModify"
                >
                    {{ $$('btn-modify') }}
                </a-button>
                <a-button
                    :class="
                        currentFrame.dataStatus === 'VALID'
                            ? 'basic mark-invalid'
                            : 'basic mark-valid'
                    "
                    v-show="canEdit()"
                    :disabled="blocking"
                    :loading="bsState.validing"
                    @click="onToggleValid"
                >
                    {{ currentFrame.dataStatus === 'VALID' ? $$('btn-invalid') : $$('btn-valid') }}
                </a-button>
                <a-button
                    class="basic skip"
                    v-show="canEdit() && !state.isSeriesFrame"
                    @click="onToggleSkip"
                    :disabled="blocking"
                >
                    {{ $$('btn-skip') }}
                </a-button>
                <a-button
                    class="basic submit"
                    v-show="canEdit()"
                    :loading="bsState.submitting"
                    :disabled="blocking"
                    @click="onSubmit"
                >
                    <template #icon><SaveOutlined /></template>
                    {{
                        currentFrame.annotationStatus === 'ANNOTATED'
                            ? $$('btn-update')
                            : $$('btn-submit')
                    }}
                </a-button>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
    // import { PointCloud } from '../lib';
    import { computed, onMounted, ref, watch } from 'vue';
    import {
        RightOutlined,
        LeftOutlined,
        SaveOutlined,
        CloseOutlined,
    } from '@ant-design/icons-vue';
    import { useInjectEditor } from '../../state';
    import useHeader from './useHeader';
    import useFlow from '../../hook/useFlow';
    import useUI from '../../hook/useUI';
    import useFlowIndex from './useFlowIndex';
    import * as _ from 'lodash';
    import { BsUIType } from '../../config/ui';

    let {
        $$,
        onFullScreen,
        iState,
        blocking,
        currentFrame,
        dataIndex,
        onIndexChange,
        onHelp,
        onIndexBlur,
        onSave,
        onPre,
        onNext,
        onClose,
        onToggleValid,
        onToggleSkip,
        onSubmit,
        onModify,
    } = useHeader();
    
    let { has, canEdit } = useUI();
    let { init } = useFlow();
    let { indexInfo: getFlowIndexInfo, onIndex } = useFlowIndex();
    let editor = useInjectEditor();
    let { state, bsState } = editor;

    // Scene navigation
    const sceneDisplayIndex = ref(1);
    const flowIndexInfo = computed(() => getFlowIndexInfo());

    // Watch for scene changes to update display
    watch(
        () => [state.sceneIndex, state.isSeriesFrame, state.sceneIds.length, state.frames.length],
        () => {
            if (state.isSeriesFrame && state.sceneIds.length > 1) {
                sceneDisplayIndex.value = state.sceneIndex + 1; // Convert to 1-based display
            }
        },
        { immediate: true }
    );

    const onSceneIndexChange = _.debounce(() => {
        if (sceneDisplayIndex.value && sceneDisplayIndex.value >= 1 && sceneDisplayIndex.value <= state.sceneIds.length) {
            onIndex(sceneDisplayIndex.value);
        }
    }, 200);

    function onSceneIndexBlur() {
        if (!sceneDisplayIndex.value || sceneDisplayIndex.value < 1 || sceneDisplayIndex.value > state.sceneIds.length) {
            sceneDisplayIndex.value = state.sceneIndex + 1;
        }
    }

    async function onScenePre() {
        if (state.sceneIndex > 0) {
            // Move to previous scene: current 1-based display index - 1
            const newDisplayIndex = sceneDisplayIndex.value - 1;
            await onIndex(newDisplayIndex);
            // Force update display index after scene change
            sceneDisplayIndex.value = state.sceneIndex + 1;
        }
    }

    async function onSceneNext() {
        if (state.sceneIndex < state.sceneIds.length - 1) {
            // Move to next scene: current 1-based display index + 1
            const newDisplayIndex = sceneDisplayIndex.value + 1;
            await onIndex(newDisplayIndex);
            // Force update display index after scene change
            sceneDisplayIndex.value = state.sceneIndex + 1;
        }
    }

    onMounted(() => {
        init();
    });

    // 语言切换逻辑
    const LangType = { 'en-US': 'en-US', 'zh-CN': 'zh-CN' } as const;
    const currentLanguage = ref<string>(LangType['en-US']);
    const currentLanguageText = computed(() => {
        const langMap: Record<string, string> = {
            [LangType['en-US']]: 'EN',
            [LangType['zh-CN']]: '中文',
        };
        return langMap[currentLanguage.value] || 'EN';
    });
    const toggleLanguage = () => {
        const nextLang = currentLanguage.value === LangType['en-US'] ? LangType['zh-CN'] : LangType['en-US'];
        localStorage.setItem('lang', nextLang);
        window.location.reload();
    };
    onMounted(() => {
        const savedLang = localStorage.getItem('lang') || LangType['en-US'];
        currentLanguage.value = savedLang;
    });
</script>

<style lang="less">
    .pc-flow {
        height: 100%;
        display: flex;
        justify-content: space-between;
        .task-header-info {
            border-radius: 16px;
            height: 28px;
            padding: 2px 15px;
            background: rgba(58, 58, 62, 0.39);
            border: 1px solid rgba(58, 58, 62, 0.39);
            display: flex;
            align-items: center;
            margin-left: 12px;

            .task-header-name {
                font-size: 14px;
                line-height: 18px;
                color: #bec1ca;
                padding-right: 12px;
                border-right: 1px solid #57575c;
                max-width: 120px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .task-header-icon {
                margin-left: 10px;
                cursor: pointer;
            }
        }
        .item-wrap {
            // min-width: 100px;
            display: flex;
            align-items: center;
            .basic-btn {
                padding: 0 8px;
                border: none;
                .anticon {
                    font-size: 16px;
                }
                .title {
                    font-size: 14px;
                    margin-top: -4px;
                }
                &.ant-btn:hover,
                &.ant-btn:focus {
                    color: white;
                    border-color: #434343;
                }
            }
            .header-info {
                background-color: #3a393e;
                border-radius: 16px;
                margin-left: 20px;
                padding: 5px 15px;
                color: #bec1ca;
                display: flex;
            }

            .icon {
                font-size: 20px;
                margin: 0px 4px;
                cursor: pointer;
            }

            .icon.disable {
                cursor: not-allowed;
                color: #5a5a5a;
            }

            .text {
                font-size: 18px;
                margin-left: 4px;
            }
        }

        .close {
            font-size: 20px;
            margin-left: 10px;
            cursor: pointer;

            &.disable {
                cursor: not-allowed;
                color: #5a5a5a;
            }
        }

        .data-index {
            .ant-input-number-handler-wrap {
                display: none;
            }
            .ant-input-number-sm input {
                text-align: center;
            }
        }

        .basic {
            // font-size: 18px;
            margin-right: 10px;
            // cursor: pointer;
            // padding: 4px;
            border-radius: 30px;
            // background: #3a393e;

            &.mark-invalid {
                background-color: #fcb17a;
            }
            &.mark-valid {
                background-color: #49aa19;
            }
            &.skip {
                background-color: #98b0d2;
            }
            &.skipped,
            &.modify {
                background-color: #ff6906;
            }
            &.submit {
                background-color: #60a9fe99;
                padding-left: 15px !important;
                .anticon {
                    background: #60a9fe;
                    height: 30px;
                    margin-top: -4px;
                    width: 32px;
                    margin-left: -16px;
                    border-radius: 16px;
                    padding-top: 5px;
                }
            }
            .anticon {
                font-size: 20px;
                vertical-align: middle;
            }

            &.ant-btn:hover,
            &.ant-btn:focus {
                color: white;
                border-color: #434343;
            }

            // &:hover {
            //     background: #3a393e;
            // }
        }

        .dataset-name {
            display: inline-block;
            max-width: 100px;
        }
    }
    .language-switch {
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
        &:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        .language-text {
            font-size: 14px;
            font-weight: 500;
            color: #ffffff;
        }
    }
    .action-icon {
        font-size: 16px;
        margin-left: 2px;
    }
</style>
