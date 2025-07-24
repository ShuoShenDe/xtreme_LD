import Konva from 'konva';
import { ToolAction, ToolName, Vector2 } from '../../types';
import { Cursor, Event, defaultCircleConfig } from '../../configs';
import ShapeTool from './ShapeTool';
import ImageView from '../index';
import { Anchor, Line, Rect, Shape } from '../shape';
import * as utils from '../../utils';
import { handleRotateToCmd } from '../utils';

// rect lines
enum Lines {
  TOP = 'line-top',
  BOTTOM = 'line-bottom',
  LEFT = 'line-left',
  RIGHT = 'line-right',
  TRANS = 'line-trans',
}
// rect anchors
enum Anchors {
  TOPLEFT = 'top-left',
  TOPRIGHTT = 'top-right',
  BOTTOMLEFT = 'bottom-left',
  BOTTOMRIGHT = 'bottom-right',
  TRANS = 'rotater',
}
// clockwise
const AnchorsOrder = [Anchors.TOPLEFT, Anchors.TOPRIGHTT, Anchors.BOTTOMRIGHT, Anchors.BOTTOMLEFT];

export default class RectTool extends ShapeTool {
  name = ToolName.rect;
  points: Vector2[] = [];
  // draw
  holder: Rect;
  currentAnchor: Anchor;
  anchors: Konva.Group;
  // edit
  declare object?: Rect;
  editObjectMap = {} as Record<Anchors | Lines, Shape>;
  transform: Konva.Transformer = new Konva.Transformer({
    resizeEnabled: true,
    // rotationSnaps: [0, 90, 180, 270],
    // rotationSnapTolerance: 5,
    borderEnabled: true,
    enabledAnchors: [
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ],
  });
  transforming = false;
  transformAnchor = '';
  objectMap: Record<string, any> = {};
  dragObject!: any;
  dragLastPos: Vector2 | undefined;

  constructor(view: ImageView) {
    super(view);
    this.holder = new Rect({ dash: [5, 5], strokeWidth: 2 });
    this.currentAnchor = new Anchor();
    this.anchors = new Konva.Group();
    this.drawGroup.add(this.holder, this.anchors, this.currentAnchor);

    // edit
    this.initEditObject();
    this.initEditEvent();
    this.changeEvent = 'absoluteTransformChange widthChange heightChange transform';
    handleRotateToCmd(this.view, this.transform);
  }
  
  doing(): boolean {
    return this.points.length > 0;
  }
  
  draw() {
    super.draw();
    this.clearEvent();
    this.initEvent();
    this.drawGroup.show();
    this.onDrawStart();
    
    // ✅ 新架构：开始绘制追踪
    this.startDrawTracking();
  }
  
  stopDraw() {
    this.clearDraw();
    this.clearEvent();
    this.drawGroup.hide();
  }
  
  clearDraw() {
    this.mouseDown = false;
    this.points = [];
    this.holder.hide();
    this.currentAnchor.hide();
    this.anchors.removeChildren();
    this.onDrawClear();
  }
  
  stopCurrentDraw() {
    let rect = undefined;
    if (this.points.length === 2) {
      const rectOption = utils.getRectFromPoints(this.points as any);
      rect = new Rect(rectOption);
      
      // ✅ 新架构：完成绘制追踪
      this.completeDrawTracking(this.points);
      
      // ✅ 新架构：发出详细的注释完成事件
      const area = rect.width() * rect.height();
      const duration = Date.now() - this.eventMixin['drawStartTime'];
      this.emitAnnotationCompleted('rect', this.points, {
        duration,
        areaPerSecond: area / (duration / 1000),
        efficiency: Math.min(area / 10000, 1) // 简单效率计算
      }, {
        area,
        width: rect.width(),
        height: rect.height(),
        aspectRatio: rect.height() > 0 ? rect.width() / rect.height() : 0
      });
    } else {
      // ✅ 新架构：取消绘制追踪
      this.cancelDrawTracking({ reason: 'insufficient_points', pointCount: this.points.length });
    }
    this.onDraw(rect);
    this.clearDraw();
  }
  
  undoDraw() {
    this.clearDraw();
  }
  
  drawInfo() {
    if (!this.holder.visible()) return '';
    const { width, height } = this.holder.attrs;
    return `width:${Math.abs(width).toFixed(0)}px;
      height:${Math.abs(height).toFixed(0)}px;
      area:${Math.abs(width * height).toFixed(0)};
      W/H:${Math.abs(width / height).toFixed(2)};`;
  }
  
  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {
    this.addPoint(point);
    
    // ✅ 新架构：追踪鼠标点击
    this.trackMouseDown(point, { pointCount: this.points.length });
    
    // 显示pending状态
    if (this.points.length === 1) {
      this.currentAnchor.position(point);
      this.updateHolder();
      this.onDrawChange();
    }
    
    if (this.points.length >= 2) {
      this.stopCurrentDraw();
    }
  }
  
  onMouseMove(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {
    this.currentAnchor.position(point);
    this.updateHolder();
    this.onDrawChange();
  }
  
  addPoint(point: Vector2) {
    if (this.validPoint(point, this.points[0])) {
      this.points.push(point);
      this.updateAnchors();
      this.updateHolder();
      this.onDrawChange();
      
      // ✅ 新架构：追踪点添加
      this.trackPointAdded(point, { totalPoints: this.points.length });
    }
  }

  // edit
  edit(object: Rect) {
    this.removeChangeEvent();
    this._hoverIndex = -1;
    this.object = object;
    this.updateAnchors(-1);
    this.updateEditObject();
    this.updateTransformer();
    this.editGroup.show();
    
    // ✅ 新架构：开始编辑追踪
    this.startEditTracking(object.uuid);
  }

  addChangEvent() {
    this.object?.on(this.changeEvent, this._onObjectChange);
  }
  
  stopEdit() {
    this.removeChangeEvent();
    this.transform.detach();
    this.object = undefined;
    this.editGroup.hide();
  }
  
  initEditObject() {
    this.editGroup.add(this.transform);
    
    const createLine = (name: string): Line => {
      const line = new Line({ lineCap: 'square', fill: '', sign: name });
      line.visible(false);
      line.listening(false);
      this.editGroup.add(line);
      return line;
    };
    
    const createAnchor = (name: string): Anchor => {
      const anchor = new Anchor({ ...defaultCircleConfig, sign: name });
      anchor.visible(false);
      this.editGroup.add(anchor);
      return anchor;
    };
    
    this.editObjectMap[Lines.TOP] = createLine(Lines.TOP);
    this.editObjectMap[Lines.BOTTOM] = createLine(Lines.BOTTOM);
    this.editObjectMap[Lines.LEFT] = createLine(Lines.LEFT);
    this.editObjectMap[Lines.RIGHT] = createLine(Lines.RIGHT);
    this.editObjectMap[Lines.TRANS] = createLine(Lines.TRANS);
    
    this.editObjectMap[Anchors.TOPLEFT] = createAnchor(Anchors.TOPLEFT);
    this.editObjectMap[Anchors.TOPRIGHTT] = createAnchor(Anchors.TOPRIGHTT);
    this.editObjectMap[Anchors.BOTTOMLEFT] = createAnchor(Anchors.BOTTOMLEFT);
    this.editObjectMap[Anchors.BOTTOMRIGHT] = createAnchor(Anchors.BOTTOMRIGHT);
    this.editObjectMap[Anchors.TRANS] = createAnchor(Anchors.TRANS);
  }
  
  initEditEvent() {
         const startTransform = (anchorName: string) => {
       this.transforming = true;
       this.transformAnchor = anchorName;
       this.view.editor.emit('annotate-edit-start', this.object);
     };
     
     const stopTransform = () => {
       this.transforming = false;
       this.transformAnchor = '';
       this.view.editor.emit('annotate-edit-end', this.object);
     };
    
    // Transform events - 只使用 Konva.Transformer，移除冲突的自定义锚点事件
    this.transform.on('transformstart', () => startTransform('transformer'));
    this.transform.on('transform', () => {
      // 在变换过程中更新编辑对象显示
      this.updateEditObject();
    });
    this.transform.on('transformend', stopTransform);
    
    // 移除自定义锚点的拖拽事件，避免与 Transformer 冲突
    // AnchorsOrder.forEach((anchorName) => {
    //   const anchor = this.editObjectMap[anchorName] as Anchor;
    //   anchor.on('dragstart', () => startTransform(anchorName));
    //   anchor.on('dragend', stopTransform);
    // });
  }
  
  updateAnchors(dragIndex = -1) {
    if (this.points.length < 1) return;
    
    this.anchors.removeChildren();
    this.points.forEach((point, index) => {
      if (index === dragIndex) return;
      const anchor = new Anchor({ x: point.x, y: point.y });
      this.anchors.add(anchor);
    });
  }
  
  updateHolder() {
    if (this.points.length >= 1) {
      let rectPoints: [Vector2, Vector2];
      
      if (this.points.length === 1) {
        // 在拖动过程中，使用第一个点和当前鼠标位置创建pending矩形
        const currentPos = this.currentAnchor.position();
        rectPoints = [this.points[0], currentPos];
      } else {
        // 有两个或更多点时，使用前两个点
        rectPoints = [this.points[0], this.points[1]];
      }
      
      const rectOption = utils.getRectFromPoints(rectPoints);
      this.holder.setAttrs(rectOption);
      this.holder.show();
      this.currentAnchor.show();
    }
  }
  
     updateEditObject() {
     if (!this.object) return;
     
     // ✅ 修复：使用正确的方法从Rect对象获取四个角点
     const points = utils.getRotatedRectPoints(this.object);
     const center = this.object.rotationCenter;
     
     // Validate points array has required structure
     if (!points || points.length < 4 || !points.every((p: any) => p && typeof p.x === 'number' && typeof p.y === 'number')) {
       console.warn('RectTool: Invalid points array for edit object update', points);
       return;
     }
    
    // Update lines
    const topLine = this.editObjectMap[Lines.TOP] as Line;
    const bottomLine = this.editObjectMap[Lines.BOTTOM] as Line;
    const leftLine = this.editObjectMap[Lines.LEFT] as Line;
    const rightLine = this.editObjectMap[Lines.RIGHT] as Line;
    const transLine = this.editObjectMap[Lines.TRANS] as Line;
    
    topLine.setAttrs({ points: [points[0].x, points[0].y, points[1].x, points[1].y] });
    rightLine.setAttrs({ points: [points[1].x, points[1].y, points[2].x, points[2].y] });
    bottomLine.setAttrs({ points: [points[2].x, points[2].y, points[3].x, points[3].y] });
    leftLine.setAttrs({ points: [points[3].x, points[3].y, points[0].x, points[0].y] });
    transLine.setAttrs({ points: [center.x, center.y, center.x, center.y - 40] });
    
    // Update anchors
    const topLeftAnchor = this.editObjectMap[Anchors.TOPLEFT] as Anchor;
    const topRightAnchor = this.editObjectMap[Anchors.TOPRIGHTT] as Anchor;
    const bottomLeftAnchor = this.editObjectMap[Anchors.BOTTOMLEFT] as Anchor;
    const bottomRightAnchor = this.editObjectMap[Anchors.BOTTOMRIGHT] as Anchor;
    const transAnchor = this.editObjectMap[Anchors.TRANS] as Anchor;
    
    topLeftAnchor.position(points[0]);
    topRightAnchor.position(points[1]);
    bottomRightAnchor.position(points[2]);
    bottomLeftAnchor.position(points[3]);
    transAnchor.position({ x: center.x, y: center.y - 40 });
    
    // 只显示线条，隐藏自定义锚点以避免与 Transformer 锚点冲突
    this.editObjectMap[Lines.TOP].visible(true);
    this.editObjectMap[Lines.BOTTOM].visible(true);
    this.editObjectMap[Lines.LEFT].visible(true);
    this.editObjectMap[Lines.RIGHT].visible(true);
    this.editObjectMap[Lines.TRANS].visible(true);
    
    // 隐藏自定义锚点，使用 Transformer 的内置锚点
    this.editObjectMap[Anchors.TOPLEFT].visible(false);
    this.editObjectMap[Anchors.TOPRIGHTT].visible(false);
    this.editObjectMap[Anchors.BOTTOMLEFT].visible(false);
    this.editObjectMap[Anchors.BOTTOMRIGHT].visible(false);
    this.editObjectMap[Anchors.TRANS].visible(false);
  }
  
  updateTransformer() {
    if (!this.object) return;
    this.transform.nodes([this.object as any]);
  }
  
  validPoint(point: Vector2, firstPoint?: Vector2): boolean {
    if (!firstPoint) return true;
    const dx = Math.abs(point.x - firstPoint.x);
    const dy = Math.abs(point.y - firstPoint.y);
    return dx > 5 || dy > 5;
  }
  
     // Tool actions
   action(action: ToolAction): boolean {
     switch (action) {
       case 'clear' as any:
         this.clearDraw();
         return true;
       case 'cancel' as any:
         this.cancelDrawTracking({ reason: 'user_cancelled' });
         this.clearDraw();
         return true;
       default:
         return false;
     }
   }
}
