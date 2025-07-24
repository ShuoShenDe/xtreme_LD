import EventEmitter from 'eventemitter3';
import ImageView from './ImageView';
import { Event } from './configs';
import { IImageViewOption } from './ImageView';
import { getDefaultState } from './state';
import {
  Const,
  IState,
  AnnotateModeEnum,
  ToolType,
  RegisterFn,
  ModalFn,
  MsgFn,
  ConfirmFn,
  LoadingFn,
  I18n,
  AnnotateObject,
  IFrame,
  IClassType,
  IModeConfig,
  OPType,
  IAttr,
  IUserData,
  StatusType,
  AttrType,
  SourceType,
} from './types';
import userAgent, { IUserAgent } from './lib/ua';
import * as utils from './utils';
import BSError from './common/BSError';
import DataResource from './common/ResourceManager';
import CmdManager from './common/CmdManager';
import ActionManager from './common/ActionManager';
import DataManager from './common/DataManager';
import HotkeyManager from './common/HotkeyManager';
import LoadManager from './common/LoadManager';
import TrackManager from './common/TrackManager';
import Stats from 'three/examples/jsm/libs/stats.module.js';

export default class Editor extends EventEmitter {
  idCount: number = 1;
  state: IState;
  mainView!: ImageView;
  userAgent: IUserAgent = userAgent;
  editable: boolean = true;
  eventSource = '';
  // frame
  frameMap: Map<string, IFrame> = new Map();
  frameIndexMap: Map<string, number> = new Map();
  // class
  classMap: Map<string, IClassType> = new Map();
  classToolMap: Map<ToolType, IClassType[]> = new Map();
  allAttrMap: Map<string, any> = new Map();
  // select
  selection: AnnotateObject[] = [];
  selectionMap: Record<string, AnnotateObject> = {};
  // manager
  actionManager: ActionManager;
  cmdManager: CmdManager;
  loadManager: LoadManager;
  dataManager: DataManager;
  dataResource: DataResource;
  hotkeyManager: HotkeyManager;
  trackManager: TrackManager;

  i18n!: I18n;
  registerModal: RegisterFn = () => {};
  showModal: ModalFn = () => Promise.resolve();
  showMsg: MsgFn = () => {};
  showConfirm: ConfirmFn = () => Promise.resolve();
  showLoading: LoadingFn = () => {};

  constructor() {
    super();
    this.state = getDefaultState();
    this.actionManager = new ActionManager(this);
    this.cmdManager = new CmdManager(this);
    this.loadManager = new LoadManager(this);
    this.dataManager = new DataManager(this);
    this.dataResource = new DataResource(this);
    this.hotkeyManager = new HotkeyManager(this);
    this.trackManager = new TrackManager(this);

    this.lang = this.lang.bind(this);
    utils.initI18n(this);

    if (import.meta.env.DEV) {
      this.initStats();
    }
  }
  // Stats
  initStats() {
    const stats = Stats();
    stats.dom.style.position = 'fixed';
    stats.dom.style.left = 'auto';
    stats.dom.style.right = '2px';
    stats.dom.style.top = '55px';
    stats.dom.style.cursor = 'move';
    stats.dom.style.userSelect = 'none';
    stats.dom.style.zIndex = '9999';
    
    // 添加拖拽功能
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = stats.dom.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      
      stats.dom.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newLeft = startLeft + deltaX;
      const newTop = startTop + deltaY;
      
      // 确保不会拖出屏幕
      const maxLeft = window.innerWidth - stats.dom.offsetWidth;
      const maxTop = window.innerHeight - stats.dom.offsetHeight;
      
      stats.dom.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
      stats.dom.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
      stats.dom.style.right = 'auto';
    };

    const handleMouseUp = () => {
      isDragging = false;
      stats.dom.style.cursor = 'move';
    };

    stats.dom.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    document.body.appendChild(stats.dom);
    const frame = () => {
      stats.update();
      requestAnimationFrame(frame);
    };
    frame();
  }

  init(container: HTMLDivElement, option?: IImageViewOption) {
    this.mainView = new ImageView(this, container, option);
    this.initEvent();
    this.emit(Event.INIT);
  }
  initEvent() {
    this.on(Event.SELECT, () => {
      if (
        this.editable &&
        this.selection.length === 1 &&
        this.selection[0].editable &&
        this.mainView.getShapeTool(this.selection[0].className as any)
      ) {
        this.mainView.enableEdit(this.selection[0] as any);
      } else {
        this.mainView.disableEdit();
      }
      this.updateCurrentTrack();
    });
    this.cmdManager.on(Event.UNDO, () => {
      this.updateCurrentTrack();
    });

    this.cmdManager.on(Event.REDO, () => {
      this.updateCurrentTrack();
    });
  }
  createTrackObj(objects: AnnotateObject | AnnotateObject[]) {
    if (!this.state.isSeriesFrame) return;
    if (!Array.isArray(objects)) objects = [objects];
    const trackObjects = [] as IUserData[];
    objects.forEach((e) => {
      const userData = e.userData as IUserData;
      const classObj = this.getClassType(userData.classId || '');
      trackObjects.push({
        trackId: userData.trackId,
        trackName: userData.trackName,
        classId: userData.classId,
        classType: userData.classType || classObj?.name || '',
        annotationType: AnnotateModeEnum.INSTANCE,
      });
    });
    return trackObjects;
  }
  initIDInfo(objects: AnnotateObject | AnnotateObject[]) {
    if (!Array.isArray(objects)) objects = [objects];
    
    // 🔧 修复：确保每个对象在当前帧内都有唯一的trackName
    objects.forEach((object) => {
      const userData = object.userData;
      userData.id = object.uuid;

      if (!userData.trackId) {
        userData.trackId = utils.createTrackId();
      }
      if (!userData.trackName) {
        // 🔧 关键修复：使用帧内唯一ID生成器
        userData.trackName = this.getUniqueIdInCurrentFrame();
      }
      this.initOtherInfo(object);
    });
  }
  initOtherInfo(object: AnnotateObject) {
    object.userData.sourceId = '-1';
    !object.userData.resultStatus && (object.userData.resultStatus = Const.True_Value);
  }
  // trackName
  getId() {
    return this.idCount++ + '';
  }
  
  // 🔧 新增：确保在当前帧内获取唯一的trackName
  getUniqueIdInCurrentFrame(): string {
    const currentFrame = this.getCurrentFrame();
    if (!currentFrame) {
      return this.getId();
    }
    
    // 获取当前帧内所有已存在的trackName
    const existingTrackNames = new Set<string>();
    const instanceObjects = this.dataManager.getFrameObject(currentFrame.id, AnnotateModeEnum.INSTANCE) || [];
    const segmentationObjects = this.dataManager.getFrameObject(currentFrame.id, AnnotateModeEnum.SEGMENTATION) || [];
    const allObjects = [...instanceObjects, ...segmentationObjects];
    
    allObjects.forEach(obj => {
      const userData = this.getUserData(obj);
      if (userData.trackName) {
        existingTrackNames.add(userData.trackName);
      }
    });
    
    // 生成唯一的trackName
    let candidateId = this.idCount;
    let uniqueTrackName = candidateId.toString();
    
    while (existingTrackNames.has(uniqueTrackName)) {
      candidateId++;
      uniqueTrackName = candidateId.toString();
    }
    
    // 更新idCount以确保下次生成的ID不会冲突
    this.idCount = candidateId + 1;
    
    return uniqueTrackName;
  }
  updateTrack() {
    const { frameIndex, frames, isSeriesFrame, defaultSourceId } = this.state;
    let countFrames: IFrame[] = [];
    if (isSeriesFrame) countFrames = frames;
    else countFrames = [frames[frameIndex]];

    const objects: AnnotateObject[] = [];
    countFrames.forEach((f) => {
      const objs_ins = this.dataManager.getFrameObject(f.id, AnnotateModeEnum.INSTANCE) || [];
      const objs_seg = this.dataManager.getFrameObject(f.id, AnnotateModeEnum.SEGMENTATION) || [];
      const objs = objs_ins.concat(objs_seg);
      objects.push(...objs.filter((e) => e.userData.sourceId == defaultSourceId));
    });
    let maxId = 0;
    objects.forEach((e) => {
      if (!e.userData.trackName) return;
      const id = parseInt(e.userData.trackName);
      if (id > maxId) maxId = id;
    });
    this.idCount = maxId + 1;
  }
  updateCurrentTrack() {
    const selection = this.selection;
    const userData = selection.length == 1 ? selection[0].userData : undefined;
    this.setCurrentTrack(userData?.trackId);
  }
  setCurrentTrack(trackId: string = '') {
    if (this.state.currentTrack !== trackId) {
      this.state.currentTrack = trackId;
      this.emit(Event.CURRENT_TRACK_CHANGE, this.state.currentTrack);
    }
  }
  withEventSource(source: string, fn: () => void) {
    this.eventSource = source;
    try {
      fn();
    } catch (e: any) {}
    this.eventSource = '';
  }
  showNameOrAlias(obj: { name: string; alias?: string; label?: string }, showAll: boolean = false) {
    return obj.name;
  }
  // locale common
  lang(name: string, args?: Record<string, any>) {
    return name;
  }
  selectByTrackId(trackId: string) {
    if (!trackId || !this.state.isSeriesFrame) return;
    const objs = this.trackManager.getObjectByTrackId(trackId);
    this.selectObject(objs);
  }
  selectObject(object?: AnnotateObject | AnnotateObject[], force?: boolean) {
    const preSelection = this.selection;
    let selection: AnnotateObject[] = [];
    if (object) {
      selection = Array.isArray(object) ? object : [object];
    }
    

    
    if (
      !force &&
      selection.length === 1 &&
      this.selection.length === 1 &&
      this.selection[0] === selection[0]
    ) {
      return;
    }

    preSelection.forEach((e) => {
      this.mainView.setState(e, { select: false });
      // 🔧 关键修复：编辑工具下，取消选中时禁用拖拽
      if (this.state.activeTool === '') {
        e.draggable(false);
        // 🔧 修复：恢复默认鼠标样式
        e.setAttrs({ cursor: 'pointer' });
      }
    });

    this.selection = selection;
    this.selectionMap = {};
    selection.forEach((e) => {
      this.mainView.setState(e, { select: true });
      this.selectionMap[e.uuid] = e;
      if (this.state.activeTool === '') {
        e.draggable(true);
        e.setAttrs({ cursor: 'grab' });
      }
    });
    this.emit(Event.SELECT, preSelection, this.selection);
  }
  updateSelect() {
    const { selection, selectionMap } = this;
    const filterSelection = selection.filter((e) => selectionMap[e.uuid]);
    this.selectObject(filterSelection);
  }
  getUserData(object: AnnotateObject) {
    const { isSeriesFrame } = this.state;

    // Safe access to userData with fallback for ISS objects
    if (!object.userData) {
      console.warn('Object has no userData, initializing with defaults:', object.toolType);
      object.userData = {
        classId: '',
        classType: '',
        sourceType: SourceType.DATA_FLOW,
        attrs: {}
      };
    }

    const userData = object.userData as Required<IUserData>;
    const trackId = userData.trackId as string;
    
    if (isSeriesFrame && trackId) {
      const globalTrack = this.trackManager.getTrackObject(trackId) || {};
      Object.assign(userData, globalTrack);
    }
    return userData;
  }
  setMode(modeConfig: IModeConfig) {
    this.state.modeConfig = modeConfig;

    const editable = modeConfig.op === OPType.EDIT;
    (this.mainView.stage as any).globalDisableDrag = !editable;
    this.editable = editable;

    this.hotkeyManager.setHotKeyFromAction(this.state.modeConfig.actions);
    this.actionManager.stopCurrentAction();
    this.mainView.disableEdit();
    this.mainView.disableDraw();
    this.selectObject();
    this.emit(Event.UPDATE_VIEW_MODE);
  }

  // frame
  setFrames(frames: IFrame[]) {
    this.state.frames = frames;
    this.updateFrameIndex();
    this.emit(Event.FRAMES);
  }
  updateFrameIndex() {
    const frames = this.state.frames;
    this.frameMap.clear();
    frames.forEach((e, index) => {
      this.frameMap.set(e.id + '', e);
      this.frameIndexMap.set(e.id + '', index);
    });
  }
  getFrameIndex(frameId: string) {
    return this.frameIndexMap.get(frameId + '') as number;
  }
  getFrame(frameId: string) {
    return this.frameMap.get(frameId + '') as IFrame;
  }
  getCurrentFrame() {
    return this.state.frames[this.state.frameIndex];
  }
  async switchFrame(index: number) {
    if (index === this.state.frameIndex) return;
    const beforeIndex = this.state.frameIndex;
    await this.loadFrame(index);
    this.emit(Event.FRAME_SWITCH, { from: beforeIndex, to: index });
  }
  async loadFrame(index: number, showLoading: boolean = true, force: boolean = false) {
    const currentTrack = this.state.currentTrack;
    await this.loadManager.loadFrame(index, showLoading, force);
    await this.mainView.renderFrame();
    this.selectByTrackId(this.state.currentTrack);
    this.setCurrentTrack(currentTrack);
    this.emit(Event.FRAME_CHANGE, this.state.frameIndex);
  }

  setClassTypes(classTypes: IClassType[]) {
    this.classMap.clear();
    this.classToolMap.clear();
    this.allAttrMap.clear();

    this.state.classTypes = classTypes;
    classTypes.forEach((e) => {
      this.classMap.set(e.name + '', e);
      this.classMap.set(e.id + '', e);

      let classes = this.classToolMap.get(e.toolType);
      if (!classes) {
        classes = [];
        this.classToolMap.set(e.toolType, classes);
      }
      classes.push(e);
    });
    this.emit(Event.CLASS_INITDATA);
  }
  /** get class details by id or name */
  getClassType(name: string | number) {
    return this.classMap.get(name + '');
  }
  getClassTypesByToolType(tooltype: ToolType) {
    let list = this.classToolMap.get(tooltype) || [];
    return list;
  }
  getClassList(tooltype: ToolType) {
    let list = this.classToolMap.get(tooltype) || ([] as IClassType[]);
    return list;
  }
  // all classTypes [key: uuid]: [value: attr/attributes/options] map
  get attrMap() {
    if (this.allAttrMap.size === 0) {
      this.state.classTypes.forEach((classType) => {
        this.setAttrsMap(classType.attrs);
      });
    }
    return this.allAttrMap;
  }
  setAttrsMap(attrs: any[], parent?: any) {
    if (!attrs || attrs.length === 0) return;
    attrs.forEach((attr) => {
      if (parent) {
        attr.parent = parent.id;
        attr.parentValue = parent.name;
      }
      this.allAttrMap.set(attr.id, attr);
      if (attr.options) this.setAttrsMap(attr.options);
      if (attr.attributes) this.setAttrsMap(attr.attributes, attr);
    });
  }
  getValidAttrs(userData: IUserData) {
    const classId = userData.classId || '';
    const classConfig = this.getClassType(classId);
    const rAttrs: Record<string, any> = {};
    if (!classConfig) return rAttrs;
    const data = userData.attrs || {};
    const validAttribute = (attr: IAttr) => {
      const attrId = attr.id;
      const item = data[attrId];
      if (!item) return;
      const isMulti = [AttrType.MULTI_SELECTION, AttrType.RANK].includes(attr.type);
      const hasValue = isMulti ? item.value.length > 0 : item.value;
      if (hasValue) {
        rAttrs[attrId] = item;
        const options = attr.options.filter((e) => {
          if (isMulti) {
            return item.value.includes(e.name);
          } else {
            return item.value === e.name;
          }
        });
        options.forEach((o) => {
          if (o.attributes) {
            o.attributes.forEach(validAttribute);
          }
        });
      }
    };
    classConfig.attrs.forEach(validAttribute);
    return rAttrs;
  }

  isDefaultStatus() {
    return this.state.status === StatusType.Default;
  }
  clearResource(config?: { resetBgRotation?: boolean }) {
    this.mainView.clearBackground();
    this.mainView.clearAllShape();
    if (config?.resetBgRotation) this.mainView.stage.rotation(0);
  }
  getRenderFilter() {
    return (e: any) => Boolean(e);
  }

  handleErr(err: BSError | Error | any, message: string = '') {
    console.error(err);
  }
  // Run model function
  async runModel() {
    throw 'runModel implement error';
  }
}
