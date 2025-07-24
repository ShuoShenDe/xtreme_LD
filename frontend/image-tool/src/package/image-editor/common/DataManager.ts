import {
  IFrame,
  AnnotateModeEnum,
  AnnotateObject,
  Const,
  ITransform,
  IObjectSource,
  IShapeConfig,
  IUserData,
  ModelCodeEnum,
  MsgType,
  ToolType,
} from '../types';
import * as utils from '../utils';
import * as _utils from '../ImageView/utils';
import Editor from '../Editor';
import { Event } from '../configs';
import { ShapeRoot } from '../ImageView';
import { __UNSERIES__ } from '..';

export default class DataManager {
  editor: Editor;
  // Multi series frames; seriesFrame is named scene
  sceneMap: Map<string, IFrame[]> = new Map();
  sceneId: string = __UNSERIES__;
  // annotations container map
  dataMap: Map<string, ShapeRoot> = new Map();
  // annotations source map
  sourceMap: Record<string, IObjectSource[]> = {};

  constructor(editor: Editor) {
    this.editor = editor;
  }
  /**
   * Scene
   */
  setSceneDataByFrames(data: IFrame[]) {
    this.clearSceneMap();
    data.forEach((e) => {
      const key = e.sceneId ? String(e.sceneId) : __UNSERIES__;
      let arr = this.sceneMap.get(key);
      if (!arr) {
        arr = [];
        this.sceneMap.set(key, arr);
      }
      arr.push(e);
    });
  }
  getFramesBySceneIndex(index: number) {
    const arr = Array.from(this.sceneMap.values());
    return arr[index] || [];
  }
  getFramesBySceneId(id: string) {
    return this.sceneMap.get(id + '') || [];
  }
  clearSceneMap() {
    this.sceneMap.clear();
  }
  /**
   * source
   */
  setSources(frame: IFrame, data: IObjectSource[]) {
    this.sourceMap[String(frame.id)] = data;
  }
  getSources(frame: IFrame) {
    return this.sourceMap[String(frame.id)];
  }
  clearSource(frame?: IFrame) {
    if (frame) {
      delete this.sourceMap[String(frame.id)];
    } else {
      this.sourceMap = {};
    }
  }

  /**
   * annotations
   */
  // set roots
  setFrameRoot(frameId: string, roots: ShapeRoot | ShapeRoot[]) {
    if (!Array.isArray(roots)) roots = [roots];
    roots.forEach((root) => {
      const key = utils.formatId(frameId, root.type);
      this.dataMap.set(key, root);
    });
  }
  getFrameRoot(frameId?: string, type?: AnnotateModeEnum) {
    type = type || this.editor.state.annotateMode;
    frameId = frameId || this.editor.getCurrentFrame()?.id || '';
    const key = utils.formatId(frameId, type);
    return this.dataMap.get(key) as ShapeRoot;
  }
  hasObject(uuid: string, frame?: IFrame) {
    return !!this.getObject(uuid, frame);
  }
  // get specific annotation
  getObject(uuid: string, frame?: IFrame) {
    frame = frame || this.editor.getCurrentFrame();
    const root_ins = this.getFrameRoot(frame.id, AnnotateModeEnum.INSTANCE);
    const root_seg = this.getFrameRoot(frame.id, AnnotateModeEnum.SEGMENTATION);
    return root_ins?.hasMap.get(uuid) || root_seg?.hasMap.get(uuid);
  }
  // get frame annotations
  getFrameObject(frameId: string, type?: AnnotateModeEnum) {
    type = type || this.editor.state.annotateMode;
    const root = this.getFrameRoot(frameId, type);
    return root ? root.children : undefined;
  }
  
  // get all frame annotations from both INSTANCE and SEGMENTATION roots
  getAllFrameObjects(frameId: string): AnnotateObject[] {
    const root_ins = this.getFrameRoot(frameId, AnnotateModeEnum.INSTANCE);
    const root_seg = this.getFrameRoot(frameId, AnnotateModeEnum.SEGMENTATION);
    
    const allObjects: AnnotateObject[] = [];
    
    if (root_ins && root_ins.children) {
      allObjects.push(...root_ins.children);
    }
    
    if (root_seg && root_seg.children) {
      allObjects.push(...root_seg.children);
    }
    
    return allObjects;
  }
  addAnnotates(objects: AnnotateObject[] | AnnotateObject, frame?: IFrame) {
    if (!Array.isArray(objects)) objects = [objects];
    frame = frame || this.editor.getCurrentFrame();
    
    // 根据对象类型分配到不同的root中
    const instanceObjects: AnnotateObject[] = [];
    const segmentationObjects: AnnotateObject[] = [];
    
    objects.forEach(obj => {
      if (obj.toolType === ToolType.ISS) {
        segmentationObjects.push(obj);
      } else {
        instanceObjects.push(obj);
      }
    });
    
    // 添加到INSTANCE root
    if (instanceObjects.length > 0) {
      const root_ins = this.getFrameRoot(frame.id, AnnotateModeEnum.INSTANCE);
      if (root_ins) {
        root_ins.addObjects(instanceObjects);
      }
    }
    
    // 添加到SEGMENTATION root
    if (segmentationObjects.length > 0) {
      const root_seg = this.getFrameRoot(frame.id, AnnotateModeEnum.SEGMENTATION);
      if (root_seg) {
        root_seg.addObjects(segmentationObjects);
      }
    }
    
    // 🔧 关键修复：新添加的对象在edit工具下设置拖拽状态
    this.initializeNewObjectsDraggableState(objects);
    
    this.onAnnotatesAdd(objects, frame);
  }
  removeAnnotates(objects: AnnotateObject[] | AnnotateObject, frame?: IFrame) {
    if (!Array.isArray(objects)) objects = [objects];
    frame = frame || this.editor.getCurrentFrame();
    
    // 🔧 修复：需要从正确的root中删除对象，ISS对象在SEGMENTATION root中
    const removeMap = {} as Record<string, boolean>;
    const selectionMap = this.editor.selectionMap;
    let delFlag = false;
    
    _utils.traverse(objects, (e) => {
      removeMap[e.uuid] = true;
      if (selectionMap[e.uuid]) {
        delFlag = true;
        delete selectionMap[e.uuid];
      }
    });
    
    if (delFlag) this.editor.updateSelect();
    
    // 🔧 修复：根据对象类型从相应的root中删除
    const instanceObjects: AnnotateObject[] = [];
    const segmentationObjects: AnnotateObject[] = [];
    
    objects.forEach(obj => {
      if (obj.toolType === ToolType.ISS) {
        segmentationObjects.push(obj);
      } else {
        instanceObjects.push(obj);
      }
    });
    
    // 从INSTANCE root删除
    if (instanceObjects.length > 0) {
      const root_ins = this.getFrameRoot(frame.id, AnnotateModeEnum.INSTANCE);
      if (root_ins) {
        root_ins.removeObjects(instanceObjects);
      }
    }
    
    // 从SEGMENTATION root删除
    if (segmentationObjects.length > 0) {
      const root_seg = this.getFrameRoot(frame.id, AnnotateModeEnum.SEGMENTATION);
      if (root_seg) {
        root_seg.removeObjects(segmentationObjects);
        console.log(`🗑️ Removed ${segmentationObjects.length} ISS objects from SEGMENTATION root`);
      }
    }
    
    this.onAnnotatesRemove(objects, frame);
  }
  setAnnotatesTransform(
    objects: AnnotateObject[] | AnnotateObject,
    datas: ITransform | ITransform[],
  ) {
    if (!Array.isArray(objects)) objects = [objects];

    objects.forEach((obj, index) => {
      const data = Array.isArray(datas) ? datas[index] : datas;
      
      // 先更新 attrs
      obj.setAttrs(data);
      
      // 确保同步所有变换属性到 Konva 对象
      if (data.x !== undefined) {
        obj.x(data.x);
      }
      if (data.y !== undefined) {
        obj.y(data.y);
      }
      if (data.scaleX !== undefined) {
        obj.scaleX(data.scaleX);
      }
      if (data.scaleY !== undefined) {
        obj.scaleY(data.scaleY);
      }
      if (data.rotation !== undefined) {
        obj.rotation(data.rotation);
      }
      if (data.width !== undefined) {
        obj.width(data.width);
      }
      if (data.height !== undefined) {
        obj.height(data.height);
      }
    });

    this.editor.emit(Event.ANNOTATE_TRANSFORM, objects, datas);
    this.onAnnotatesChange(objects, 'transform', datas);
  }
  // 🔧 新增：初始化新对象的拖拽状态
  initializeNewObjectsDraggableState(objects: AnnotateObject[]) {
    const isEditTool = this.editor.state.activeTool === ''; // 空字符串表示默认edit工具
    
    if (!isEditTool) {
      return; // 非edit工具，保持默认拖拽状态
    }

    // edit工具下，新添加的对象默认不可拖拽（除非被选中）
    objects.forEach(obj => {
      const isSelected = !!this.editor.selectionMap[obj.uuid];
      obj.draggable(isSelected);
      
      if (!isSelected) {
        // 不可拖拽时设置pointer样式
        obj.setAttrs({ cursor: 'pointer' });
      } else {
        // 可拖拽时设置grab样式
        obj.setAttrs({ cursor: 'grab' });
      }
    });
  }

  onAnnotatesAdd(objects: AnnotateObject[], frame?: IFrame) {
    frame = frame || this.editor.getCurrentFrame();
    frame.needSave = true;

    this.editor.emit(Event.ANNOTATE_ADD, objects, frame);
  }
  onAnnotatesChange(
    objects: AnnotateObject[],
    type?: 'userData' | 'transform' | 'attrs' | 'group' | 'positionIndex' | 'other',
    data?: any,
  ) {
    objects.forEach((obj) => {
      const frame = obj.frame;
      if (frame) frame.needSave = true;
      obj.userData.resultStatus = Const.True_Value;
    });
    this.editor.emit(Event.ANNOTATE_CHANGE, objects, type, data);
  }
  onAnnotatesRemove(objects: AnnotateObject[], frame?: IFrame) {
    frame = frame || this.editor.getCurrentFrame();
    frame.needSave = true;

    this.editor.emit(Event.ANNOTATE_REMOVE, objects, frame);
  }
  setAnnotatesUserData(objects: AnnotateObject[] | AnnotateObject, datas: IUserData | IUserData[]) {
    if (!Array.isArray(objects)) objects = [objects];

    objects.forEach((obj, index) => {
      const data = Array.isArray(datas) ? datas[index] : datas;
      Object.assign(obj.userData, data);
    });
    this.editor.mainView.updateObjectByUserData(objects);
    this.editor.mainView.updateToolStyleByClass();

    this.editor.emit(Event.ANNOTATE_USER_DATA, objects, datas);
    this.onAnnotatesChange(objects, 'userData', datas);
  }
  setAnnotatesVisible(objects: AnnotateObject | AnnotateObject[], data: boolean | boolean[]) {
    let visibleObjs = Array.isArray(objects) ? objects : [objects];
    if (visibleObjs.length === 0) return;
    const attrs: IShapeConfig[] = [];
    visibleObjs.forEach((obj, index) => {
      let visible = typeof data === 'boolean' ? data : data[index];
      if (typeof visible !== 'boolean') visible = (data as boolean[])[0];
      obj.showVisible = visible;
      attrs.push({ visible });
    });

    this.editor.emit(Event.ANNOTATE_VISIBLE, visibleObjs);
  }

  /**
   * scene
   */
  copyForward() {
    return this.track({
      direction: 'FORWARD',
      object: this.editor.selection.length > 0 ? 'select' : 'all',
      method: 'copy',
      frameN: 1,
    });
  }
  copyBackWard() {
    return this.track({
      direction: 'BACKWARD',
      object: this.editor.selection.length > 0 ? 'select' : 'all',
      method: 'copy',
      frameN: 1,
    });
  }
  async track(option: {
    method: 'copy' | ModelCodeEnum;
    object: 'select' | 'all';
    direction: 'BACKWARD' | 'FORWARD';
    frameN: number;
  }) {
    const editor = this.editor;
    const { frameIndex, frames } = editor.state;
    const curId = frames[frameIndex].id;

    const getToDataId = () => {
      const ids = [] as string[];
      const forward = option.direction === 'FORWARD' ? 1 : -1;
      const frameN = option.frameN;
      if (frameN <= 0) return ids;
      for (let i = 1; i <= frameN; i++) {
        const frame = frames[frameIndex + forward * i];
        if (frame) ids.push(frame.id);
      }
      return ids;
    };
    const ids = getToDataId();
    if (ids.length === 0) return;

    const getObjects = () => {
      let objects: AnnotateObject[] = [];
      if (option.object === 'all') {
        const root = this.getFrameRoot(curId);
        objects = root.allObjects.filter((e) => root.renderFilter(e));
      } else {
        editor.selection.forEach((e) => {
          objects.push(e);
        });
      }
      return objects;
    };

    let objects = getObjects();

    if (objects.length === 0) {
      editor.showMsg(MsgType.warning, editor.lang('track-no-source'));
      return;
    }
    const data = { ...option };
    // this.editor.emit(Event.MODEL_RUN_TRACK, data); // 事件类型不存在，暂时注释
    const startTm = Date.now();
    utils.copyData(editor, curId, ids, objects);
    editor.showMsg(MsgType.success, editor.lang('copy-ok'));
    this.gotoNext(ids[0]);
    const modelTm = Date.now() - startTm;
    // this.editor.emit(Event.MODEL_RUN_TRACK_SUCCESS, { time: modelTm }); // 事件类型不存在，暂时注释
  }
  gotoNext(dataId: string) {
    const { frames } = this.editor.state;
    const index = frames.findIndex((e) => e.id === dataId);
    if (index < 0) return;
    this.editor.loadFrame(index);
  }

  /**
   * clear
   */
  clear(frame?: IFrame) {
    if (frame) {
      this.dataMap.delete(utils.formatId(frame.id, AnnotateModeEnum.INSTANCE));
      delete this.sourceMap[frame.id];
    } else {
      this.dataMap.clear();
      this.clearSource();
    }
  }
}
