import { AnnotateObject, Anchor } from '../shape';
import Konva from 'konva';
import ImageView from '../index';
import EventEmitter from 'eventemitter3';
import { Cursor, Event } from '../../configs';
import { Vector2, ToolAction, AnnotateModeEnum, StatusType, ToolName } from '../../types';
import { isBoolean, isNumber } from 'lodash';
import { ToolEventMixin } from '../../mixins/ToolEventMixin';

export type ToolEvent =
  | 'object'
  | 'draw-start'
  | 'draw-clear'
  | 'draw-change'
  | 'draw-end'
  | 'edit-start'
  | 'edit-change'
  | 'edit-end';

interface IConfig {
  disableRenderLayer: boolean;
}

export default class ShapeTool extends EventEmitter {
  name: ToolName = ToolName.default;
  toolMode: AnnotateModeEnum = AnnotateModeEnum.INSTANCE;
  view: ImageView;
  enable: boolean = true;
  cursor: string = Cursor.crosshair;
  // config
  config: IConfig = {
    disableRenderLayer: true,
  };
  // draw
  drawGroup: Konva.Group;
  mouseDown: boolean = false;
  mouseDowning: boolean = false;
  holder!: AnnotateObject;
  currentAnchor!: Anchor;
  // edit
  editGroup: Konva.Group;
  _anchorIndex = -1;
  _anchorType = -1;
  _hoverIndex = -1;
  _hoverType = -1;
  // help
  helpGroup: Konva.Group;
  object?: AnnotateObject;
  changeEvent: string = '';
  roundMousePoint = false;

  // 事件混入 - 用于EFFM集成
  protected eventMixin: ToolEventMixin;
  constructor(view: ImageView) {
    super();
    this.view = view;
    this.drawGroup = new Konva.Group({ visible: false, sign: 'tool-draw-group' });
    this.editGroup = new Konva.Group({ visible: false, sign: 'tool-edit-group' });
    this.helpGroup = new Konva.Group({ visible: false, sign: 'tool-help-group' });
    this.drawGroup.listening(false);
    this.view.helpLayer.add(this.drawGroup);
    this.view.helpLayer.add(this.editGroup);
    this.view.helpLayer.add(this.helpGroup);

    // 初始化事件混入
    this.eventMixin = new ToolEventMixin(view.toolEventBus, this.name);

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onDocMouseUp = this._onDocMouseUp.bind(this);

    this._onObjectChange = this._onObjectChange.bind(this);
  }
  // === EFFM事件追踪便捷方法 ===
  
  /**
   * 开始绘制会话追踪
   */
  protected startDrawTracking(metadata?: Record<string, any>): void {
    this.eventMixin['startDrawSession'](metadata);
  }

  /**
   * 完成绘制会话追踪
   */
  protected completeDrawTracking(points: Vector2[], metadata?: Record<string, any>): void {
    this.eventMixin['completeDrawSession'](points, metadata);
  }

  /**
   * 取消绘制会话追踪
   */
  protected cancelDrawTracking(metadata?: Record<string, any>): void {
    this.eventMixin['cancelDrawSession'](metadata);
  }

  /**
   * 开始编辑会话追踪
   */
  protected startEditTracking(objectId: string, metadata?: Record<string, any>): void {
    this.eventMixin['startEditSession'](objectId, metadata);
  }

  /**
   * 完成编辑会话追踪
   */
  protected completeEditTracking(objectId: string, metadata?: Record<string, any>): void {
    this.eventMixin['completeEditSession'](objectId, metadata);
  }

  /**
   * 取消编辑会话追踪
   */
  protected cancelEditTracking(objectId: string, metadata?: Record<string, any>): void {
    this.eventMixin['cancelEditSession'](objectId, metadata);
  }

  /**
   * 追踪鼠标点击
   */
  protected trackMouseDown(position: Vector2, metadata?: Record<string, any>): void {
    this.eventMixin['trackMouseDown'](position, metadata);
  }

  /**
   * 追踪点添加
   */
  protected trackPointAdded(position: Vector2, metadata?: Record<string, any>): void {
    this.eventMixin['trackPointAdded'](position, metadata);
  }

  /**
   * 追踪工具切换
   */
  protected trackToolSwitch(metadata?: Record<string, any>): void {
    this.eventMixin['trackToolSwitch'](metadata);
  }

  /**
   * 发出性能指标事件
   */
  protected emitPerformanceMetric(metricName: string, value: number, unit: string, metadata?: Record<string, any>): void {
    this.eventMixin.emitPerformance({
      toolType: this.name,
      sessionId: this.eventMixin['currentDrawSessionId'] || this.eventMixin['currentEditSessionId'],
      metricName,
      value,
      unit,
      metadata
    });
  }

  /**
   * 发出注释完成事件（包含详细几何和性能数据）
   */
  protected emitAnnotationCompleted(
    annotationType: 'rect' | 'polygon' | 'polyline' | 'keypoint' | 'comment-bubble',
    points: Vector2[],
    performance: {
      duration: number;
      pointsPerSecond?: number;
      areaPerSecond?: number;
      efficiency?: number;
    },
    metadata?: Record<string, any>
  ): void {
    // 计算几何数据
    const geometry = {
      points,
      area: annotationType === 'polygon' || annotationType === 'rect' ? 
        this.eventMixin['calculatePolygonArea'](points) : undefined,
      perimeter: annotationType === 'polygon' || annotationType === 'polyline' ? 
        this.eventMixin['calculatePolygonPerimeter'](points) : undefined,
      dimensions: annotationType === 'rect' ? 
        this.eventMixin['calculateRectDimensions'](points) : undefined
    };

    this.eventMixin.emitAnnotationCompleted({
      toolType: this.name,
      sessionId: this.eventMixin['currentDrawSessionId'] || this.eventMixin['currentEditSessionId'],
      annotationType,
      geometry,
      performance,
      metadata
    });
  }

  // hooks
  /**
   * start
   */
  draw() {}
  /**
   * stop
   */
  stopDraw() {}
  /**
   * clear
   */
  clearDraw() {}
  /**
   * complete
   */
  stopCurrentDraw() {}
  /**
   * undo
   */
  undoDraw() {}
  /**
   * delete
   */
  onToolDelete() {}
  /**
   * update
   */
  updateTool() {}
  updateHolder() {}
  /**
   * complete handler
   */
  onDraw(object: AnnotateObject | AnnotateObject[] | undefined) {
    this.emit('object' as ToolEvent, object);
  }
  onDrawStart() {
    this.emit('draw-start' as ToolEvent);
  }
  onDrawChange() {
    this.emit('draw-change' as ToolEvent);
    this.updateStatus();
  }
  onDrawClear() {
    this.emit('draw-clear' as ToolEvent);
    this.updateStatus(false);
  }
  onDrawEnd() {
    this.emit('draw-end' as ToolEvent);
    this.updateStatus(false);
  }
  drawInfo() {
    return '';
  }

  doing(): boolean {
    return false;
  }

  updateStatus(doing?: boolean) {
    const state = this.view.editor.state;
    doing = isBoolean(doing) ? doing : this.doing();
    const toStatus = doing ? StatusType.Create : StatusType.Default;
    const curStatus = state.status;
    if (toStatus === curStatus) return;
    state.status = toStatus;
  }

  // edit
  edit(object: AnnotateObject) {}
  updateEditObject() {}
  stopEdit() {}
  clearEdit() {}

  onEditStart() {
    this.emit('edit-start' as ToolEvent);
  }
  onEditChange() {
    this.object?.onPointChange();
    this.emit('edit-change' as ToolEvent);
  }
  onEditEnd() {
    this.emit('edit-end' as ToolEvent);
  }
  selectAnchorIndex(val?: number, type?: number) {
    if (isNumber(val)) {
      this.anchorType(isNumber(type) ? type : -1);
      this._anchorIndex = val;
      this.view.editor.emit(Event.ANNOTATE_OBJECT_POINT);
    }
    return this._anchorIndex;
  }
  anchorType(val?: number) {
    if (isNumber(val)) this._anchorType = val;
    return this._anchorType;
  }
  hoverIndex(index?: number, type?: number) {
    if (isNumber(index)) {
      this.hoverType(isNumber(type) ? type : -1);
      this._hoverIndex = index;
    }
    return this._hoverIndex;
  }
  hoverType(val?: number) {
    if (isNumber(val)) this._hoverType = val;
    return this._hoverType;
  }

  onAction(action: ToolAction) {
    switch (action) {
      case ToolAction.undo:
        this.undoDraw();
        this.updateStatus();
        break;
      case ToolAction.esc:
        if (this.drawGroup.visible()) {
          this.clearDraw();
          this.onDrawClear();
        } else if (this.editGroup.visible()) {
          this.clearEdit();
        }
        break;
      case ToolAction.stop:
        this.stopCurrentDraw();
        this.updateStatus();
        break;
      case ToolAction.del:
        this.onToolDelete();
        break;
    }
  }

  checkAction(action: ToolAction): boolean {
    // draw
    if (this.drawGroup.visible()) {
      return this.checkDrawAction(action);
    } else if (this.editGroup.visible()) {
      // edit
      return this.checkEditAction(action);
    }
    return false;
  }
  checkDrawAction(action: ToolAction) {
    return [ToolAction.esc, ToolAction.stop, ToolAction.undo].includes(action);
  }
  checkEditAction(action: ToolAction) {
    return false;
  }

  // default draw event handle
  clearEvent() {
    this.mouseDown = false;
    this.view.stage.off('mousedown', this._onMouseDown);
    this.view.stage.off('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onDocMouseUp);
  }
  initEvent() {
    this.view.stage.on('mousedown', this._onMouseDown);
    this.view.stage.on('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onDocMouseUp);
  }
  _onDocMouseUp(e: MouseEvent) {
    this.mouseDowning = false;
    this._onMouseUp({ evt: e } as Konva.KonvaEventObject<MouseEvent>);
  }
  _onMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    const point = this.intPoint(this.view.stage.getRelativePointerPosition());
    this.mouseUpInevitable(e, point);
    if (e.evt.button !== 0) return;
    this.onMouseUp(e, point);
  }
  _onMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    let point = this.intPoint(this.view.stage.getRelativePointerPosition());
    this.mouseDownInevitable(e, point);
    if (e.evt.button !== 0) return;

    // valid position
    if (!this.isValid(point)) {
      point = this.validPosition(point);
    }

    this.mouseDown = true;
    this.onMouseDown(e, point);
    this.mouseDowning = true;
  }
  _onMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    let point = this.intPoint(this.view.stage.getRelativePointerPosition());
    this.mouseMoveInevitable(e, point);
    if (!this.mouseDown) return;

    // valid position
    if (!this.isValid(point)) {
      point = this.validPosition(point);
    }

    this.onMouseMove(e, point);
  }
  _onMouseOut() {
    this.onMouseOut();
  }

  updateAttrHtml() {
    this.view.emit(Event.UPDATE_ATTR);
  }

  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {}
  onMouseUp(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {}
  onMouseMove(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {}
  onMouseOut() {}
  mouseMoveInevitable(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {}
  mouseDownInevitable(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {}
  mouseUpInevitable(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {}

  // edit
  addChangEvent() {
    if (!this.object || !this.changeEvent) return;
    this.object.on(this.changeEvent, this._onObjectChange);
  }
  removeChangeEvent() {
    if (!this.object || !this.changeEvent) return;
    this.object.off(this.changeEvent, this._onObjectChange);
  }

  _onObjectChange(e: any) {
    this.onObjectChange();
  }

  onObjectChange() {}

  // valid
  validPosition(position: Vector2) {
    return position;
  }

  isValid(position: Vector2) {
    return true;
  }

  intPoint(point?: Vector2 | null) {
    if (this.roundMousePoint && point) {
      point.x = Math.floor(point.x);
      point.y = Math.floor(point.y);
    }
    return point || { x: 0, y: 0 };
  }
}
