import { IPolygonInnerConfig, MsgType, ToolName, Vector2 } from '../../types';
import { Event } from '../../configs';
import ImageView from '../index';
import { Anchor, Line, Polygon, Shape } from '../shape';
import PolylineTool from './PolylineTool';
import * as utils from '../../utils';
import Konva from 'konva';

export default class PolygonTool extends PolylineTool {
  name = ToolName.polygon;
  _minPointNum = 3;
  _innerPoints?: IPolygonInnerConfig[];

  holderFill: Polygon;

  constructor(view: ImageView) {
    super(view);

    this.holderFill = new Polygon({ fill: 'rgba(255,255,255,0.2)', stroke: '' });
    this.drawGroup.add(this.holderFill);
    this.holderFill.moveToBottom();
    this.changeEvent = 'absoluteTransformChange pointsChange innerPointsChange';
  }

  updateLastLineHolder() {
    const endPos = this.currentAnchor.position();
    this.holderFill.show();
    this.holderFill.setAttrs({ points: [...this.points, endPos] });
    super.updateLastLineHolder();
  }
  
  stopCurrentDraw() {
    let polygon = undefined;
    if (this.points.length >= this._minPointNum) {
      polygon = new Polygon({ points: this.points.slice(0) });
      
      this.completeDrawTracking(this.points);
      const duration = Date.now() - this.eventMixin['drawStartTime'];
      const area = this.calculatePolygonArea(this.points);
      const perimeter = this.calculatePolygonPerimeter(this.points);
      
      this.emitAnnotationCompleted('polygon', this.points, {
        duration,
        pointsPerSecond: this.points.length / (duration / 1000),
        areaPerSecond: area / (duration / 1000),
        efficiency: this.calculatePolygonEfficiency(area, this.points.length, duration)
      }, {
        area,
        perimeter,
        pointCount: this.points.length,
        averagePointSpacing: perimeter / Math.max(1, this.points.length),
        complexityRatio: this.calculateComplexityRatio(area, perimeter)
      });
    } else {
      this.cancelDrawTracking({ 
        reason: 'insufficient_points', 
        pointCount: this.points.length,
        minRequired: this._minPointNum 
      });
    }
    this.onDraw(polygon);
    this.clearDraw();
  }

  clearDraw() {
    super.clearDraw();
    this.holderFill.hide();
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

  private calculatePolygonPerimeter(points: Vector2[]): number {
    if (points.length < 2) return 0;
    
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }

  // edit
  edit(polygon: Polygon | Line) {
    this.object = polygon;
    this.updateEditObject();
    this.editGroup.show();
    this.addChangEvent();
    
    this.startEditTracking((polygon as any).uuid);
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
        
        // 检查点合并（对于多边形，还需要检查首尾点的连接）
        const mergedPoints = this.checkAndMergePointsPolygon(currentPoints, index);
        if (mergedPoints.length !== currentPoints.length) {
          // 发生了合并，更新锚点
          this.object!.setAttrs({ points: mergedPoints });
          this.updateEditObject(); // 重新创建锚点
          this.updatePolygonDisplay();
          this.onEditChange();
          return;
        }
        
        this.object!.setAttrs({ points: currentPoints });
        
        this.updatePolygonDisplay();
        this.onEditChange();
      });

      anchor.on('dragend', () => {
        this.onEditEnd();
      });
      
      this.editGroup.add(anchor);
    });
  }

  // 多边形特有的点合并检测（包括首尾点连接）
  checkAndMergePointsPolygon(points: Vector2[], dragIndex: number): Vector2[] {
    const mergeThreshold = 10; // 像素阈值
    const dragPoint = points[dragIndex];
    const pointCount = points.length;
    
    // 对于多边形，首点和尾点也是相邻的
    const prevIndex = dragIndex === 0 ? pointCount - 1 : dragIndex - 1;
    const nextIndex = dragIndex === pointCount - 1 ? 0 : dragIndex + 1;
    
    // 检查与前一个点的距离
    const prevPoint = points[prevIndex];
    const distToPrev = Math.sqrt(
      Math.pow(dragPoint.x - prevPoint.x, 2) + Math.pow(dragPoint.y - prevPoint.y, 2)
    );
    if (distToPrev < mergeThreshold) {
      // 与前一个点合并，删除当前点
      const mergedPoints = [...points];
      mergedPoints.splice(dragIndex, 1);
      return mergedPoints;
    }
    
    // 检查与后一个点的距离
    const nextPoint = points[nextIndex];
    const distToNext = Math.sqrt(
      Math.pow(dragPoint.x - nextPoint.x, 2) + Math.pow(dragPoint.y - nextPoint.y, 2)
    );
    if (distToNext < mergeThreshold) {
      // 与后一个点合并，删除当前点
      const mergedPoints = [...points];
      mergedPoints.splice(dragIndex, 1);
      return mergedPoints;
    }
    
    return points;
  }

  updatePolygonDisplay() {
    if (this.object) {
      this.view.draw();
    }
  }

  drawInfo() {
    if (this.object) {
      const points = this.object.attrs.points || [];
      const area = this.calculatePolygonArea(points);
      return `area:${area.toFixed(0)}px²; points:${points.length}`;
    } else if (this.holder.visible()) {
      const previewPoints = [...this.points, this.currentAnchor.position()];
      const area = this.calculatePolygonArea(previewPoints);
      return `area:${area.toFixed(0)}px²; points:${this.points.length}`;
    }
    return '';
  }

  private calculatePolygonEfficiency(area: number, pointCount: number, duration: number): number {
    const areaPerSecond = area / (duration / 1000);
    const pointsPerSecond = pointCount / (duration / 1000);
    
    const areaEfficiency = Math.min(areaPerSecond / 50000, 1);
    const speedEfficiency = Math.min(pointsPerSecond / 3, 1);
    
    return (areaEfficiency * 0.7 + speedEfficiency * 0.3);
  }

  private calculatePolygonArea(points: Vector2[]): number {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    
    return Math.abs(area) / 2;
  }

  private calculateComplexityRatio(area: number, perimeter: number): number {
    if (perimeter === 0) return 0;
    const circleArea = Math.pow(perimeter / (2 * Math.PI), 2) * Math.PI;
    return area / circleArea;
  }
}
