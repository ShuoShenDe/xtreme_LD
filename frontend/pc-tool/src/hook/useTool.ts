import { useInjectEditor } from '../state';
import * as api from '../api';
import { BSError } from 'pc-editor';
import * as THREE from 'three';
import { IFrame } from '../packages/pc-editor/type';

export default function useTool() {
    let editor = useInjectEditor();
    let { bsState, state } = editor;

    async function loadClasses() {
        try {
            let config = await api.getDataSetClass(bsState.datasetId);
            // test
            // if (config.length > 0) {
            //     config[0].constraint = true;
            //     config[0].size3D = new THREE.Vector3(4, 4, 4);
            // }
            editor.setClassTypes(config);
        } catch (error) {
            throw new BSError('', editor.lang('load-class-error'), error);
        }
    }

    async function loadModels() {
        try {
            let models = await api.getModelList();
            editor.state.models = models;
        } catch (error) {
            throw new BSError('', editor.lang('load-model-error'), error);
        }
    }

    async function loadDateSetClassification() {
        try {
            let classifications = await api.getDataSetClassification(bsState.datasetId);
            editor.state.classifications = classifications;
        } catch (error) {
            throw new BSError('', editor.lang('load-dataset-classification-error'), error);
        }
    }

    async function loadRecord() {
        try {
            let { dataInfos, isSeriesFrame, seriesFrameId } = await api.getInfoByRecordId(
                bsState.recordId,
            );
            
            state.isSeriesFrame = isSeriesFrame;
            bsState.seriesFrameId = seriesFrameId;
            
            // Set dataset ID first
            bsState.datasetId = dataInfos[0].datasetId + '';
            
            // Initialize scene data
            if (isSeriesFrame) {
                // For multi-scene datasets, get all scenes from the dataset
                try {
                    // Get all scenes from the dataset
                    const allScenes = await api.getAllScenesFromDataset(bsState.datasetId);
                    
                    if (allScenes.length > 1) {
                        // Use all scenes from dataset
                        state.sceneIds = allScenes;
                        
                        // Set current scene based on the record's scene or use first scene
                        const currentRecordSceneId = dataInfos[0]?.sceneId?.toString();
                        const sceneIndex = currentRecordSceneId && allScenes.includes(currentRecordSceneId) 
                            ? allScenes.indexOf(currentRecordSceneId) 
                            : 0;
                        
                        state.sceneId = state.sceneIds[sceneIndex];
                        state.sceneIndex = sceneIndex;
                        
                        // Get data for all scenes
                        const allSceneData: IFrame[] = [];
                        for (const sceneId of allScenes) {
                            try {
                                const sceneFrames = await api.getFrameSeriesData(bsState.datasetId, sceneId);
                                // Add sceneId to each frame
                                sceneFrames.forEach(frame => {
                                    frame.sceneId = sceneId;
                                });
                                allSceneData.push(...sceneFrames);
                            } catch (error) {
                                // Silently continue if a scene fails to load
                            }
                        }
                        
                        if (allSceneData.length > 0) {
                            // Set scene data for management
                            editor.dataManager.setSceneDataByFrames(allSceneData);
                            
                            // Load first scene frames
                            const firstSceneFrames = editor.dataManager.getFramesBySceneId(state.sceneId);
                            editor.setFrames(firstSceneFrames.length > 0 ? firstSceneFrames : allSceneData);
                        } else {
                            // Fallback to original data
                            state.sceneIds = [dataInfos[0]?.sceneId?.toString() || '__UNSERIES__'];
                            state.sceneId = state.sceneIds[0];
                            state.sceneIndex = 0;
                            editor.dataManager.setSceneDataByFrames(dataInfos);
                            editor.setFrames(dataInfos);
                        }
                    } else {
                        // Single scene or no scenes found, use original logic
                        const sceneIds = [...new Set(dataInfos.map(data => data.sceneId).filter(Boolean))].map(id => String(id));
                        state.sceneIds = sceneIds.length > 0 ? sceneIds : ['__UNSERIES__'];
                        state.sceneId = state.sceneIds[0];
                        state.sceneIndex = 0;
                        
                        editor.dataManager.setSceneDataByFrames(dataInfos);
                        const firstSceneFrames = editor.dataManager.getFramesBySceneId(state.sceneId);
                        editor.setFrames(firstSceneFrames.length > 0 ? firstSceneFrames : dataInfos);
                    }
                } catch (error) {
                    // Fallback to original data
                    const sceneIds = [...new Set(dataInfos.map(data => data.sceneId).filter(Boolean))].map(id => String(id));
                    state.sceneIds = sceneIds.length > 0 ? sceneIds : ['__UNSERIES__'];
                    state.sceneId = state.sceneIds[0];
                    state.sceneIndex = 0;
                    
                    editor.dataManager.setSceneDataByFrames(dataInfos);
                    const firstSceneFrames = editor.dataManager.getFramesBySceneId(state.sceneId);
                    editor.setFrames(firstSceneFrames.length > 0 ? firstSceneFrames : dataInfos);
                }
            } else {
                let dataId = bsState.query.dataId;
                if (dataId) {
                    dataInfos = dataInfos.filter((data) => data.id === dataId);
                }
                if (dataInfos.length === 0) {
                    throw '';
                }
                editor.setFrames(dataInfos);
            }
        } catch (error) {
            throw new BSError('', editor.lang('load-record-error'), error);
        }
    }

    async function loadUserInfo() {
        try {
            const data = await api.getUserInfo();
            Object.assign(editor.bsState.user, {
                id: data.id,
                nickname: data.nickname,
                username: data.username,
            });
        } catch (error) {
            throw new BSError('', 'load user info error', error);
        }
    }

    async function loadDataSetInfo() {
        try {
            let datasetId = editor.bsState.datasetId;
            let data = await api.getDataSetInfo(datasetId);
            bsState.datasetName = data.name;
            bsState.datasetType = data.type;
        } catch (error) {
            throw new BSError('', 'load data-set info error', error);
        }
    }
    async function loadDataFromFrameSeries(frameSeriesId: string) {
        try {
            const { datasetId } = editor.bsState;
            const frames = await api.getFrameSeriesData(datasetId, frameSeriesId);
            if (frames.length === 0) throw new BSError('', 'load scene error');
            // state.frames = frames;
            editor.setFrames(frames);
        } catch (error) {
            throw error instanceof BSError ? error : new BSError('', 'load scene error', error);
        }
    }

    return {
        loadUserInfo,
        loadModels,
        loadClasses,
        loadDataSetInfo,
        loadRecord,
        loadDateSetClassification,
        loadDataFromFrameSeries,
    };
}
