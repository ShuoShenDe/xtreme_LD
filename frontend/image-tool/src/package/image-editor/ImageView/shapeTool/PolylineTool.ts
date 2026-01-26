import { ITransform, LineDrawMode, MsgType, ToolAction, ToolName, Vector2 } from '../../types';
import { Event } from '../../configs';
import ShapeTool from './ShapeTool';
import ImageView from '../index';
import { Anchor, Line, Shape } from '../shape';
import Konva from 'konva';
import * as utils from '../../utils';

export default class PolylineTool extends ShapeTool {
  name = ToolName.polyline;
  _points?: Vector2[];
  points: Vector2[] = [];
  _minPointNum = 2;
  intervalTm: number = 0;
  selectedAnchorIndex: number = -1; // 添加选中锚点索引

  holder: Line;
  holderLastLine: Line;
  anchors: Konva.Group;
  currentAnchor: Anchor;

  constructor(view: ImageView) {
    super(view);

    this.holder = new Line();
    this.holderLastLine = new Line({ dash: [5, 5], strokeWidth: 2 });
    this.anchors = new Konva.Group();
    this.currentAnchor = new Anchor();
    this.drawGroup.add(this.holder, this.holderLastLine, this.anchors, this.currentAnchor);

    this.initEditEvent();
    this.changeEvent = 'absoluteTransformChange pointsChange';
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
    
    this.startDrawTracking();
  }

  stopDraw() {
    this.clearDraw();
    this.clearEvent();
    this.drawGroup.hide();
  }

  clearDraw() {
    this.intervalTm = 0;
    this.mouseDown = false;
    this.points = [];
    this.anchors.removeChildren();
    this.holder.hide();
    this.holderLastLine.hide();
    this.currentAnchor.hide();
    this.onDrawClear();
  }

  stopCurrentDraw() {
    let polyline = undefined;
    if (this.points.length >= this._minPointNum) {
      polyline = new Line({ points: this.points.slice(0) });
      
      this.completeDrawTracking(this.points);
      const duration = Date.now() - this.eventMixin['drawStartTime'];
      const perimeter = this.calculatePerimeter();
      this.emitAnnotationCompleted('polyline', this.points, {
        duration,
        pointsPerSecond: this.points.length / (duration / 1000),
        efficiency: this.calculateEfficiency(this.points.length, duration)
      }, {
        perimeter,
        pointCount: this.points.length,
        averageSegmentLength: perimeter / Math.max(1, this.points.length - 1)
      });
    } else {
      this.cancelDrawTracking({ 
        reason: 'insufficient_points', 
        pointCount: this.points.length,
        minRequired: this._minPointNum 
      });
    }
    this.onDraw(polyline);
    this.clearDraw();
  }

  undoDraw() {
    if (this.points.length > 1) {
      this.points.splice(-1, 1);
      this.updateAnchors();
      this.updateHolder();
      this.onDrawChange();
    } else {
      this.clearDraw();
    }
  }

  drawInfo() {
    if (!this.holder.visible()) return '';
    return `points: ${this.points.length}`;
  }

  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {
    this.intervalTm = Date.now();
    this.addPoint(point);
    
    this.trackMouseDown(point, { 
      pointCount: this.points.length,
      isNewPoint: true 
    });
  }

  onMouseMove(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {
    this.currentAnchor.position(point);
    this.updateLastLineHolder();
    this.onDrawChange();
  }

  onKeyDown(e: KeyboardEvent) {
    const isDoubleClick = e.code === 'Space' || e.code === 'Enter';
    if (isDoubleClick) {
      this.intervalTm = 0;
      this.stopCurrentDraw();
    }
  }

  onDoubleClick() {
    this.intervalTm = 0;
    this.stopCurrentDraw();
  }

  addPoint(point: Vector2) {
    if (this.validPoint(point)) {
      this.points.push(point);
      this.updateAnchors();
      this.updateHolder();
      this.onDrawChange();
      
      this.trackPointAdded(point, { 
        totalPoints: this.points.length,
        segmentLength: this.getLastSegmentLength() 
      });
    }
  }

  validPoint(point: Vector2): boolean {
    if (this.points.length === 0) return true;
    const lastPoint = this.points[this.points.length - 1];
    const distance = Math.sqrt(
      Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
    );
    return distance > 5;
  }

  updateAnchors() {
    this.anchors.removeChildren();
    this.points.forEach((point) => {
      const anchor = new Anchor({ x: point.x, y: point.y });
      this.anchors.add(anchor);
    });
  }

  updateHolder() {
    if (this.points.length >= 2) {
      this.holder.setAttrs({ points: this.points });
      this.holder.show();
      this.currentAnchor.show();
    }
  }

  updateLastLineHolder() {
    if (this.points.length >= 1) {
      const lastPoint = this.points[this.points.length - 1];
      const currentPos = this.currentAnchor.position();
      this.holderLastLine.setAttrs({ points: [lastPoint, currentPos] });
      this.holderLastLine.show();
    }
  }

  // edit
  edit(line: Line) {
    this.object = line;
    this.updateEditObject();
    this.editGroup.show();
    this.addChangEvent();
    
    this.startEditTracking(line.uuid);
  }

  stopEdit() {
    if (this.object) {
      this.completeEditTracking(this.object.uuid);
    }
    this.removeChangeEvent();
    this.object = undefined;
    this.editGroup.hide();
  }

  initEditEvent() {
    this.editGroup.on('dragstart', (e: Konva.KonvaEventObject<DragEvent>) => {
      this.view.editor.emit('edit-start', this.object);
    });

    this.editGroup.on('dragend', (e: Konva.KonvaEventObject<DragEvent>) => {
      this.view.editor.emit('edit-end', this.object);
    });
  }

  updateEditObject() {
    if (!this.object) return;
    
    this.editGroup.removeChildren();
    const points = this.object.attrs.points || [];
    const objectX = this.object.x();
    const objectY = this.object.y();
    
    points.forEach((point: Vector2, index: number) => {
      const anchor = new Anchor({
        x: point.x + objectX,  // 转换为绝对坐标
        y: point.y + objectY,  // 转换为绝对坐标
        draggable: true,
        pointIndex: index,
      });
      
      // 添加点击事件来选中锚点
      anchor.on('click', (e: Konva.KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        this.selectAnchor(anchor, index);
      });
      
      anchor.on('dragstart', () => {
        this.onEditStart();
      });

      anchor.on('dragmove', () => {
        const currentPoints = [...(this.object!.attrs.points || [])];
        const anchorPos = anchor.position();
        const objX = this.object!.x();
        const objY = this.object!.y();
        // 转换为相对坐标
        const newPoint = {
          x: anchorPos.x - objX,
          y: anchorPos.y - objY
        };
        currentPoints[index] = newPoint;
        
        // 检查点合并
        const mergedPoints = this.checkAndMergePoints(currentPoints, index);
        if (mergedPoints.length !== currentPoints.length) {
          // 发生了合并，更新锚点
          this.object!.setAttrs({ points: mergedPoints });
          this.updateEditObject(); // 重新创建锚点
          this.view.draw();
          this.onEditChange();
          return;
        }
        
        this.object!.setAttrs({ points: currentPoints });
        this.view.draw();
        this.onEditChange();
      });

      anchor.on('dragend', () => {
        this.onEditEnd();
      });
      
      this.editGroup.add(anchor);
    });
  }

  // 检查并合并重合的点
  checkAndMergePoints(points: Vector2[], dragIndex: number): Vector2[] {
    const mergeThreshold = 10; // 像素阈值
    const dragPoint = points[dragIndex];
    
    // 检查与前一个点的距离
    if (dragIndex > 0) {
      const prevPoint = points[dragIndex - 1];
      const distToPrev = Math.sqrt(
        Math.pow(dragPoint.x - prevPoint.x, 2) + Math.pow(dragPoint.y - prevPoint.y, 2)
      );
      if (distToPrev < mergeThreshold) {
        // 与前一个点合并，删除当前点
        const mergedPoints = [...points];
        mergedPoints.splice(dragIndex, 1);
        return mergedPoints;
      }
    }
    
    // 检查与后一个点的距离
    if (dragIndex < points.length - 1) {
      const nextPoint = points[dragIndex + 1];
      const distToNext = Math.sqrt(
        Math.pow(dragPoint.x - nextPoint.x, 2) + Math.pow(dragPoint.y - nextPoint.y, 2)
      );
      if (distToNext < mergeThreshold) {
        // 与后一个点合并，删除当前点
        const mergedPoints = [...points];
        mergedPoints.splice(dragIndex, 1);
        return mergedPoints;
      }
    }
    
    return points;
  }

  // 选中锚点
  selectAnchor(anchor: Anchor, index: number) {
    this.selectedAnchorIndex = index;
    
    // 更新所有锚点的选中状态
    const anchors = this.editGroup.children?.filter(child => child instanceof Anchor) as Anchor[];
    anchors.forEach((a, i) => {
      a.state = a.state || {};
      a.state.select = i === index;
    });
    
    this.view.updateStateStyle(anchors);
  }

  // 支持编辑模式下的删除动作
  checkEditAction(action: ToolAction) {
    return action === ToolAction.del;
  }

  // 删除选中的锚点
  onToolDelete() {
    if (!this.object || this.selectedAnchorIndex === -1) return;
    
    const currentPoints = [...(this.object.attrs.points || [])];
    
    // 检查最小点数限制
    if (currentPoints.length <= this._minPointNum) {
      console.warn(`Cannot delete point: minimum ${this._minPointNum} points required`);
      return;
    }
    
    // 删除选中的点
    currentPoints.splice(this.selectedAnchorIndex, 1);
    
    // 更新对象
    this.object.setAttrs({ points: currentPoints });
    
    // 重置选中状态
    this.selectedAnchorIndex = -1;
    
    // 重新创建编辑锚点
    this.updateEditObject();
    this.view.draw();
    this.onEditChange();
    
    console.log(`Point deleted. Remaining points: ${currentPoints.length}`);
  }

  onObjectChange() {
    if (this.object) {
      // 🔧 关键修复：只在非拖拽状态下更新编辑锚点位置
      // 避免拖拽过程中重新创建锚点导致拖拽中断
      if (!this.isDraggingAnchor()) {
        this.updateEditObject();
      }
      this.view.editor.dataManager.onAnnotatesChange([this.object], 'transform');
    }
  }

  // 🔧 新增：检查是否正在拖拽锚点
  protected isDraggingAnchor(): boolean {
    // 检查editGroup中是否有锚点正在被拖拽
    const anchors = this.editGroup.children?.filter(child => child instanceof Anchor) || [];
    return anchors.some((anchor: any) => anchor.isDragging && anchor.isDragging());
  }

  private calculatePerimeter(): number {
    if (this.points.length < 2) return 0;
    
    let perimeter = 0;
    for (let i = 1; i < this.points.length; i++) {
      const dx = this.points[i].x - this.points[i - 1].x;
      const dy = this.points[i].y - this.points[i - 1].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }

  private getLastSegmentLength(): number {
    if (this.points.length < 2) return 0;
    const lastIdx = this.points.length - 1;
    const dx = this.points[lastIdx].x - this.points[lastIdx - 1].x;
    const dy = this.points[lastIdx].y - this.points[lastIdx - 1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateEfficiency(pointCount: number, duration: number): number {
    const pointsPerSecond = pointCount / (duration / 1000);
    return Math.min(pointsPerSecond / 5, 1);
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
      case 'undo' as any:
        this.undoDraw();
        return true;
      default:
        return false;
    }
  }
}
