import { reactive, toRefs, watch, inject, onMounted, onBeforeUnmount } from 'vue';
import { useInjectEditor } from '../../state';
import { allItems } from './item';
import { IActionName, StatusType } from 'pc-editor';
import { Image2DRenderView, CreateAction, Box } from 'pc-render';
import { IModelResult, IModel } from 'pc-editor';
import * as api from '../../api';
import { PcToolIntegration } from '@efficiency/integrations/PcToolIntegration';
import { Event } from 'pc-editor';

let createActions: IActionName[] = [
    'create2DBox',
    'create2DRect',
    'createObjectWith3',
    'createPolyline3D',
    'createPolygon3D',
    'createSegmentation3D',
    'pickObject',
];

export interface IConfig {
    noUtility?: boolean;
    noAnnotate?: boolean;
}

export interface IClass {
    label: string;
    value: string;
    selected: boolean;
}
export default function useTool() {
    let editor = useInjectEditor();
    let innerState = reactive({
        tools: allItems,
    });

    // 获取 EFFM 集成实例
    const effmIntegration = inject<PcToolIntegration | null>('effmIntegration', null);
    
    // 工具会话追踪
    const toolSessions = new Map<string, { startTime: number; toolName: string }>();

    // 处理对象创建完成后的工具重新激活
    function onAnnotateAdd() {
        const config = editor.state.config;
        
        // 检查是否有活跃的创建工具，如果有则重新启动
        setTimeout(() => {
            // 如果用户已经切换到选择工具（所有标注工具都未激活），则不重新激活
            const isSelectToolActive = !config.active3DBox && 
                                     !config.activePolyline3D && 
                                     !config.activePolygon3D && 
                                     !config.activeSegmentation3D;
            
            if (isSelectToolActive) {
                // 用户已经切换到选择工具，不进行重新激活
                return;
            }
            
            if (config.active3DBox) {
                editor.actionManager.execute('createObjectWith3');
            } else if (config.activePolyline3D) {
                editor.actionManager.execute('createPolyline3D');
            } else if (config.activePolygon3D) {
                editor.actionManager.execute('createPolygon3D');
            } else if (config.activeSegmentation3D) {
                editor.actionManager.execute('createSegmentation3D');
            }
        }, 100); // 短暂延迟确保当前动作完全结束
    }

    // 生命周期管理
    onMounted(() => {
        editor.addEventListener(Event.ANNOTATE_ADD, onAnnotateAdd);
    });

    onBeforeUnmount(() => {
        editor.removeEventListener(Event.ANNOTATE_ADD, onAnnotateAdd);
    });

    // 获取当前激活的工具
    function getCurrentActiveTool(): string | null {
        const config = editor.state.config;
        if (config.active3DBox) return 'create3DBox';
        if (config.activePolyline3D) return 'createPolyline3D';
        if (config.activePolygon3D) return 'createPolygon3D';
        if (config.activeSegmentation3D) return 'createSegmentation3D';
        if (config.activeTranslate) return 'translate';
        if (config.activeTrack) return 'track';
        // 如果没有其他工具激活，则认为是选择工具
        return 'select';
    }

    // 完成工具会话追踪
    function completeToolSession(toolName: string, success: boolean = true, metadata: Record<string, any> = {}) {
        const session = toolSessions.get(toolName);
        if (session && effmIntegration) {
            const duration = Date.now() - session.startTime;
            effmIntegration.trackToolCompletion(toolName, duration, {
                success,
                ...metadata
            });
            toolSessions.delete(toolName);
        }
    }

    // 停止所有其他 3D 创建工具的状态
    function stopOther3DTools(currentTool: string) {
        let config = editor.state.config;
        
        // 如果当前工具是选择工具，则停止所有其他工具
        if (currentTool === 'select') {
            config.active3DBox = false;
            config.activePolyline3D = false;
            config.activePolygon3D = false;
            config.activeSegmentation3D = false;
            return;
        }
        
        // 清除所有 3D 工具的激活状态，除了当前激活的工具
        if (currentTool !== 'create3DBox') {
            config.active3DBox = false;
        }
        if (currentTool !== 'createPolyline3D') {
            config.activePolyline3D = false;
        }
        if (currentTool !== 'createPolygon3D') {
            config.activePolygon3D = false;
        }
        if (currentTool !== 'createSegmentation3D') {
            config.activeSegmentation3D = false;
        }
    }

    function onTool(name: string) {
        let config = editor.state.config;
        
        if (effmIntegration) {
            effmIntegration.trackToolActivation(name, {
                previousTool: getCurrentActiveTool(),
                timestamp: Date.now()
            });
            
            // 开始工具会话追踪
            toolSessions.set(name, {
                startTime: Date.now(),
                toolName: name
            });
        }
        
        switch (name) {
            case 'select':
                // 切换到选择工具：停止所有其他工具
                stopOther3DTools('select');
                stopOtherCreateAction('');
                
                // 确保停止当前的创建动作并重置所有工具状态
                if (editor.actionManager.currentAction) {
                    const currentActionName = editor.actionManager.currentAction.name;
                    editor.actionManager.stopCurrentAction();
                    
                    // 手动重置相应的工具状态标志，确保完全停止
                    switch (currentActionName) {
                        case 'createPolyline3D':
                            config.activePolyline3D = false;
                            break;
                        case 'createPolygon3D':
                            config.activePolygon3D = false;
                            break;
                        case 'createSegmentation3D':
                            config.activeSegmentation3D = false;
                            break;
                        case 'createObjectWith3':
                            config.active3DBox = false;
                            break;
                    }
                }
                
                // 选择工具不需要额外的action，因为它是默认状态
                if (effmIntegration) {
                    effmIntegration.trackToolActivation('select', {
                        previousTool: getCurrentActiveTool()
                    });
                }
                break;
            case 'create2DBox':
                stopOtherCreateAction('create2DBox');
                editor.actionManager.execute('create2DBox');
                break;
            case 'create3DBoxStandard':
                stopOtherCreateAction('createObjectWith3');
                stopOther3DTools('create3DBox');
                
                // 确保停止当前动作并重置其他工具状态
                if (editor.actionManager.currentAction && editor.actionManager.currentAction.name !== 'createObjectWith3') {
                    editor.actionManager.stopCurrentAction();
                }
                
                config.boxMethod = 'STANDARD';
                config.active3DBox = !config.active3DBox;
                if (config.active3DBox) {
                    editor.actionManager.execute('createObjectWith3');
                } else {
                    // 停止当前正在执行的创建动作
                    if (editor.actionManager.currentAction && editor.actionManager.currentAction.name === 'createObjectWith3') {
                        editor.actionManager.stopCurrentAction();
                    }
                    // 重置编辑器状态为默认状态
                    editor.state.status = StatusType.Default;
                    completeToolSession('create3DBoxStandard', true, { reason: 'tool_deactivated' });
                }
                break;
            case 'create3DBoxAI':
                stopOtherCreateAction('createObjectWith3');
                stopOther3DTools('create3DBox');
                
                // 确保停止当前动作并重置其他工具状态
                if (editor.actionManager.currentAction && editor.actionManager.currentAction.name !== 'createObjectWith3') {
                    editor.actionManager.stopCurrentAction();
                }
                
                config.boxMethod = 'AI';
                config.active3DBox = !config.active3DBox;
                if (config.active3DBox) {
                    editor.actionManager.execute('createObjectWith3');
                } else {
                    // 停止当前正在执行的创建动作
                    if (editor.actionManager.currentAction && editor.actionManager.currentAction.name === 'createObjectWith3') {
                        editor.actionManager.stopCurrentAction();
                    }
                    // 重置编辑器状态为默认状态
                    editor.state.status = StatusType.Default;
                    completeToolSession('create3DBoxAI', true, { reason: 'tool_deactivated' });
                }
                break;
            case 'createPolyline3D':
                stopOtherCreateAction('createPolyline3D');
                stopOther3DTools('createPolyline3D');
                
                // 确保停止当前动作并重置其他工具状态
                if (editor.actionManager.currentAction && editor.actionManager.currentAction.name !== 'createPolyline3D') {
                    editor.actionManager.stopCurrentAction();
                }
                
                config.activePolyline3D = !config.activePolyline3D;
                if (config.activePolyline3D) {
                    editor.actionManager.execute('createPolyline3D');
                } else {
                    // 停止当前正在执行的创建动作
                    if (editor.actionManager.currentAction && editor.actionManager.currentAction.name === 'createPolyline3D') {
                        editor.actionManager.stopCurrentAction();
                    }
                    // 重置编辑器状态为默认状态
                    editor.state.status = StatusType.Default;
                    completeToolSession('createPolyline3D', true, { reason: 'tool_deactivated' });
                }
                break;
            case 'createPolygon3D':
                stopOtherCreateAction('createPolygon3D');
                stopOther3DTools('createPolygon3D');
                
                // 确保停止当前动作并重置其他工具状态
                if (editor.actionManager.currentAction && editor.actionManager.currentAction.name !== 'createPolygon3D') {
                    editor.actionManager.stopCurrentAction();
                }
                
                config.activePolygon3D = !config.activePolygon3D;
                if (config.activePolygon3D) {
                    editor.actionManager.execute('createPolygon3D');
                } else {
                    // 停止当前正在执行的创建动作
                    if (editor.actionManager.currentAction && editor.actionManager.currentAction.name === 'createPolygon3D') {
                        editor.actionManager.stopCurrentAction();
                    }
                    // 重置编辑器状态为默认状态
                    editor.state.status = StatusType.Default;
                    completeToolSession('createPolygon3D', true, { reason: 'tool_deactivated' });
                }
                break;
            case 'createSegmentation3D':
                stopOtherCreateAction('createSegmentation3D');
                stopOther3DTools('createSegmentation3D');
                
                // 确保停止当前动作并重置其他工具状态
                if (editor.actionManager.currentAction && editor.actionManager.currentAction.name !== 'createSegmentation3D') {
                    editor.actionManager.stopCurrentAction();
                }
                
                config.activeSegmentation3D = !config.activeSegmentation3D;
                if (config.activeSegmentation3D) {
                    editor.actionManager.execute('createSegmentation3D');
                } else {
                    // 停止当前正在执行的创建动作
                    if (editor.actionManager.currentAction && editor.actionManager.currentAction.name === 'createSegmentation3D') {
                        editor.actionManager.stopCurrentAction();
                    }
                    // 重置编辑器状态为默认状态
                    editor.state.status = StatusType.Default;
                    completeToolSession('createSegmentation3D', true, { reason: 'tool_deactivated' });
                }
                break;
            case 'createRect':
                stopOtherCreateAction('create2DRect');
                editor.actionManager.execute('create2DRect');
                break;
            case 'translate':
                editor.actionManager.execute('toggleTranslate');
                if (effmIntegration) {
                    effmIntegration.trackPcAnnotation('translate', 'toggle', {
                        active: config.activeTranslate
                    });
                }
                break;
            case 'togglePointEdit':
                editor.actionManager.execute('togglePointEdit');
                if (effmIntegration) {
                    effmIntegration.trackPcAnnotation('pointEdit', 'toggle', {
                        active: config.activePointEdit
                    });
                }
                break;
            case 'reProjection':
                reProject();
                if (effmIntegration) {
                    effmIntegration.trackPcAnnotation('reProjection', 'execute');
                }
                break;
            case 'projection':
                project();
                if (effmIntegration) {
                    effmIntegration.trackPcAnnotation('projection', 'execute');
                }
                break;
            case 'track':
                config.activeTrack = !config.activeTrack;
                if (effmIntegration) {
                    effmIntegration.trackPcAnnotation('track', 'toggle', {
                        active: config.activeTrack
                    });
                }
                break;
            case 'model':
                onModel();
                if (effmIntegration) {
                    effmIntegration.trackPcAnnotation('model', 'execute');
                }
                break;
            case 'filter2D':
                onFilter2D();
                if (effmIntegration) {
                    effmIntegration.trackPcAnnotation('filter2D', 'toggle', {
                        active: config.filter2DByTrack
                    });
                }
                break;
        }
    }

    function onFilter2D() {
        let config = editor.state.config;
        config.filter2DByTrack = !config.filter2DByTrack;
        editor.pc.render();
    }

    function project() {
        let selection = editor.pc.selection;

        if (selection.length > 0) {
            let object3D = selection.filter((e) => e instanceof Box);
            if (object3D.length === 0) {
                editor.showMsg('warning', 'Please Select a 3D Result');
                return;
            }
            editor.actionManager.execute('projectObject2D', {
                createFlag: true,
                updateFlag: false,
                selectFlag: true,
            });
        } else {
            editor.actionManager.execute('projectObject2D', {
                createFlag: true,
                updateFlag: false,
            });
        }
    }

    function reProject() {
        let selection = editor.pc.selection;
        let object3D = selection.filter((e) => e instanceof Box);
        if (object3D.length === 0) {
            editor.showMsg('warning', 'Please Select a 3D Result');
            return;
        }

        editor.actionManager.execute('projectObject2D', {
            createFlag: true,
            updateFlag: true,
            selectFlag: true,
        });
    }

    async function runModel() {
        const modelConfig = editor.state.modelConfig;
        if (!modelConfig.model) {
            editor.showMsg('warning', 'Please choose Model');
            return;
        }
        let toolState = editor.state;
        let bsState = editor.bsState;
        let data = toolState.frames[toolState.frameIndex];
        let model = toolState.models.find((e) => e.name === modelConfig.model) as IModel;
        const resultFilterParam = {
            minConfidence: 0.5,
            maxConfidence: 1,
            classes: model?.classes.map((e) => e.value),
        };
        if (!modelConfig.predict) {
            const selectedClasses = (modelConfig.classes[modelConfig.model] || []).reduce(
                (classes, item) => {
                    if (item.selected) {
                        classes.push(item.value);
                    }
                    return classes;
                },
                [] as string[],
            );
            if (selectedClasses.length <= 0) {
                editor.showMsg('warning', 'Select at least one Class!');
                return;
            }
            resultFilterParam.minConfidence = modelConfig.confidence[0];
            resultFilterParam.maxConfidence = modelConfig.confidence[1];
            resultFilterParam.classes = selectedClasses;
        }
        let config = {
            datasetId: bsState.datasetId,
            dataIds: [+data.id],
            modelId: +model.id,
            modelVersion: model?.version,
            dataType: 'SINGLE_DATA',
            modelCode: model.code,
            // annotationRecordId: +toolState.recordId,
            resultFilterParam,
        };
        // modelConfig.loading = true;
        try {
            let result = await api.runModel(config);
            if (!result.data) throw new Error('Model Run Error');
            data.model = {
                recordId: result.data,
                id: model.id,
                version: model.version,
                state: 'loading',
            };
        } catch (error: any) {
            editor.showMsg('error', error.message || 'Model Run Error');
        }
        // modelConfig.loading = false;
        editor.dataManager.pollDataModelResult();
    }
    function onModel() {
        let toolState = editor.state;
        let dataInfo = toolState.frames[toolState.frameIndex];

        if (dataInfo.model && dataInfo.model.state === 'loading') return;

        // if (dataInfo.model) {
        if (dataInfo.model && dataInfo.model.state === 'complete') {
            let model = dataInfo.model as IModelResult;
            // editor.showConfirm({ title: 'Model Results', subTitle: 'Add Results?' }).then(
            //     async () => {
            //     },
            //     () => {},
            // );
            api.clearModel([+dataInfo.id], model.recordId);
            editor.modelManager.addModelData();
        } else {
            runModel();
            // editor.showModal('modelRun', { title: 'AI Annotation', data: {} });
        }
    }

    function stopOtherCreateAction(name: string) {
        if (editor.actionManager.currentAction) {
            let action = editor.actionManager.currentAction;
            if (action.name === name) return;
            if (createActions.indexOf(action.name as IActionName) >= 0) {
                editor.actionManager.stopCurrentAction();
            }
        }
    }

    return {
        ...toRefs(innerState),
        runModel,
        onModel,
        onTool,
    };
}
