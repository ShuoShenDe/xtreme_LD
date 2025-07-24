<template>
    <div class="pc-editor">
        <div class="pc-editor-layout">
            <div class="business-container"><Header /></div>
            <div class="content-container-wrap">
                <div class="content-container">
                    <div class="tool-container">
                        <Tool />
                    </div>
                    <div class="main-container">
                        <Main />
                    </div>
                    <div 
                        class="operation-container" 
                        :style="{ width: operationWidth + 'px' }"
                    >
                        <Operation />
                        <div 
                            class="resize-handle"
                            @mousedown="startResize"
                        ></div>
                    </div>
                </div>
                <Loading />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { reactive, onMounted, ref, onUnmounted } from 'vue';

    // 首先调用useProvideEditor，确保在任何子组件渲染之前Provider已经设置好
    import { useProvideEditor } from '../../state';
    let editor = useProvideEditor();

    // 然后导入其他组件
    import Header from '../Header/index.vue';
    import Operation from '../Operation/index.vue';
    import Tool from '../Tool/index.vue';
    import Main from './main.vue';

    import Loading from '../Modal/Loading.vue';

    import ModelHelp from '../Modal/sub/ModelHelp.vue';
    import ModalConfirm from '../Modal/sub/ModalConfirm.vue';

    // 新增：接收 lang 作为 prop
    const props = defineProps<{ lang: 'en' | 'zh' }>();

    // 拖拽调整大小相关状态
    const operationWidth = ref(270);
    const minWidth = 270;
    const isResizing = ref(false);

    const startResize = (e: MouseEvent) => {
        e.preventDefault();
        isResizing.value = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResize);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.value) return;
        
        const container = document.querySelector('.content-container') as HTMLElement;
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

    onMounted(() => {
        // 新增：根据 prop 设置 editor.state.lang
        editor.state.lang = props.lang;
        editor.registerModal('ModelHelp', ModelHelp);
        editor.registerModal('ModalConfirm', ModalConfirm);
    });

    onUnmounted(() => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResize);
    });
</script>

<style lang="less">
    .pc-editor {
        width: 100%;
        height: 100%;
        position: relative;
        background: #3a393e;

        .pc-editor-layout {
            .business-container {
                position: absolute;
                top: 0px;
                left: 0px;
                right: 0px;
                height: 54px;
                background: #1e1f23;
            }

            .content-container-wrap {
                position: absolute;
                top: 54px;
                left: 0px;
                right: 0px;
                bottom: 0px;
                padding: 6px 0px;
            }

            .content-container {
                height: 100%;
                width: 100%;
                display: flex;
                flex-direction: row;
                position: relative;
            }

            .tool-container {
                width: 50px;
                height: 100%;
                flex-shrink: 0;
                position: relative;
                z-index: 10;
            }

            .main-container {
                flex: 1 1 0%;
                min-width: 0;
                height: 100%;
                position: relative;
                z-index: 1;
                display: flex;
                flex-direction: column;
            }

            .operation-container {
                width: 270px;
                min-width: 270px;
                height: 100%;
                position: relative;
                background: #3a393e;
                border-left: 1px solid #545454;
                display: flex;
                flex-direction: column;
                z-index: 2;
                transition: width 0.1s;

                .resize-handle {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 4px;
                    height: 100%;
                    background-color: transparent;
                    cursor: col-resize;
                    z-index: 10;
                    transition: background 0.2s;
                    &:hover {
                        background-color: rgba(255, 255, 255, 0.1);
                    }
                    &:active {
                        background-color: rgba(255, 255, 255, 0.2);
                    }
                }
            }
        }
    }
</style>
