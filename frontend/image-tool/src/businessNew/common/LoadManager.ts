import Editor from './Editor';
import * as api from '../api';
import {
  AnnotateModeEnum,
  LoadManager as BaseLoadManager,
  Event,
  IDataResource,
  IFrame,
  SourceType,
  ToolType,
  __UNSERIES__,
  utils as EditorUtils,
} from 'image-editor';
import { ShapeRoot } from 'image-editor/ImageView';
import * as utils from '../utils';

export default class LoadManager extends BaseLoadManager {
  declare editor: Editor;
  constructor(editor: Editor) {
    super(editor);
  }

  /**
   * Override loadSceneData to support dynamic scene loading
   */
  async loadSceneData(index: number) {
    this.editor.showLoading(true);

    const { state } = this.editor;
    state.sceneIndex = index;
    state.sceneId = state.sceneIds[index] || __UNSERIES__;
    
    let sceneFrames = this.editor.dataManager.getFramesBySceneId(state.sceneId);
    
    // If no frames found for this scene, try to load them dynamically
    if (sceneFrames.length === 0 && state.sceneId !== __UNSERIES__) {
      try {
        const { datasetId } = this.editor.bsState;
        const dynamicFrames = await api.getFrameSeriesData(datasetId, state.sceneId);
        
        // Add the frames to the data manager
        this.editor.dataManager.setSceneDataByFrames([...this.getAllExistingFrames(), ...dynamicFrames]);
        sceneFrames = this.editor.dataManager.getFramesBySceneId(state.sceneId);
      } catch (error) {
        console.error('Failed to load scene data dynamically:', error);
        this.editor.showLoading(false);
        return;
      }
    }
    
    if (sceneFrames.length === 0) {
      this.editor.showLoading(false);
      return;
    }
    
    this.editor.setFrames(sceneFrames);
    // If it is a seriesFrame, all frames need to be loaded
    if (state.isSeriesFrame) {
      await this.loadFramesData(state.frames);
      const allObject: any[] = [];
      sceneFrames.forEach((frame) => {
        // 🔧 修复：使用getAllFrameObjects获取所有类型的对象（包括ISS）
        const frameObject = this.editor.dataManager.getAllFrameObjects(frame.id) || [];
        allObject.push(...frameObject);
      });
      this.updateTrack(allObject);
    }
    await this.editor.loadFrame(0, false, true);

    this.editor.showLoading(false);
    this.editor.emit(Event.SCENE_LOADED);
  }

  /**
   * Get all existing frames from the scene map
   */
  private getAllExistingFrames(): IFrame[] {
    const allFrames: IFrame[] = [];
    for (const frames of this.editor.dataManager.sceneMap.values()) {
      allFrames.push(...frames);
    }
    return allFrames;
  }

  /**
   * load frames data
   */
  async loadFramesData(frames: IFrame[]) {
    this.editor.clearResource({ resetBgRotation: true });

    // Filter out data that has already been loaded
    const loadFrames = frames.filter((frame) => {
      // 🔧 修复：检查frame中是否有任何类型的对象（包括ISS）
      const objects = this.editor.dataManager.getAllFrameObjects(frame.id);
      return !objects || objects.length === 0;
    });
    if (loadFrames.length === 0) return;

    const dataIds = loadFrames.map((e) => e.id);
    const frameDatas = await api.getAnnotationByDataIds({ dataIds });
    if (!frameDatas || frameDatas.length === 0) return;

    const dataMap: Record<string, any> = {};
    frameDatas.forEach((e) => (dataMap[`${e.dataId}`] = e));

    for (const frame of loadFrames) {
      // 🔧 修复：始终为每个frame创建roots，即使没有数据
      const root_ins = new ShapeRoot({ frame, type: AnnotateModeEnum.INSTANCE });
      const root_seg = new ShapeRoot({ frame, type: AnnotateModeEnum.SEGMENTATION });
      this.editor.dataManager.setFrameRoot(frame.id, [root_ins, root_seg]);
      
      const frameData = dataMap[String(frame.id)];
      if (!frameData) {
        continue;
      }
      
      const instances = frameData.objects || [];
      
      try {
        const annotates_ins = await utils.convertObject2Annotate(this.editor, instances);

        // Filter out any invalid objects before updating
        const validAnnotates = annotates_ins.filter(obj => obj && typeof obj.setAttrs === 'function');

        if (validAnnotates.length > 0) {
          // 🔧 修复：确保所有对象在当前帧内都有唯一的trackName
          // 使用统一的initIDInfo方法处理所有需要ID分配的对象
          const objectsNeedingInit = validAnnotates.filter(obj => {
            const userData = this.editor.getUserData(obj);
            return !userData.id || !userData.trackId || !userData.trackName;
          });
          
          if (objectsNeedingInit.length > 0) {
            // 🔧 关键修复：initIDInfo 现在确保帧内唯一性
            this.editor.initIDInfo(objectsNeedingInit);
          }
          
          // 🔧 修复：确保所有对象都具有selectable属性
          validAnnotates.forEach(obj => {
            if (obj.attrs && obj.attrs.selectable !== true) {
              obj.setAttrs({ selectable: true });
            }
          });
          
          this.editor.mainView.updateObjectByUserData(validAnnotates);
          
          // 根据对象类型分配到不同的root中
          const instanceObjects: any[] = [];
          const segmentationObjects: any[] = [];
          
          validAnnotates.forEach(obj => {
            if (obj.toolType === ToolType.ISS) {
              segmentationObjects.push(obj);
            } else {
              instanceObjects.push(obj);
            }
          });
          
          if (instanceObjects.length > 0) {
            root_ins.addObjects(instanceObjects);
          }
          if (segmentationObjects.length > 0) {
            root_seg.addObjects(segmentationObjects);
          }
        }

        // set classifications
        const values = frameData.classificationValues || [];
        frame.classifications = utils.classificationAssign(
          this.editor.bsState.classifications,
          values,
        );

      } catch (error) {
        console.error('Error loading frame data:', error);
      }
    }

    this.editor.emit(Event.ANNOTATIONS_LOADED, dataIds);
  }
  /**
   * load result source
   */
  async loadResultSource(frames: IFrame[]) {
    frames.forEach(async (frame) => {
      const frameId = String(frame.id);
      let sources = await api.getResultSources(frameId);
      sources.unshift({
        name: 'Without Task',
        sourceId: this.editor.state.defaultSourceId,
        sourceType: SourceType.DATA_FLOW,
        frameId,
      });
      this.editor.dataManager.setSources(frame, sources);
    });
  }
  /**
   * request data resource
   * This is a virtual method that needs to be instantiated
   */
  async requestResource(frame: IFrame): Promise<IDataResource> {
    const { config, annotationStatus, validStatus } = await api.getDataFile(frame.id);
    frame.annotationStatus = annotationStatus;
    frame.validStatus = validStatus;
    const data: IDataResource = {
      ...config,
      time: Date.now(),
    };
    return data;
  }
}
