import { ToolName, Vector2 } from '../../types';
import ShapeTool from './ShapeTool';
import ImageView from '../index';
import { KeyPoint } from '../shape';
import Konva from 'konva';

export default class KeyPointTool extends ShapeTool {
  name = ToolName['key-point'];
  points: Vector2[] = [];
  declare object?: KeyPoint;

  constructor(view: ImageView) {
    super(view);
  }

  doing(): boolean {
    return this.points.length > 0;
  }

  // draw
  draw() {
    super.draw();
    this.clearEvent();
    this.initEvent();
    this.onDrawStart();
    
    // ✅ 新架构：开始绘制追踪
    this.startDrawTracking();
  }

  stopDraw() {
    this.clearEvent();
  }

  clearDraw() {
    this.points = [];
    this.onDrawClear();
  }

  stopCurrentDraw() {
    let keyPoint = undefined;
    if (this.points.length > 0) {
      keyPoint = new KeyPoint({ x: this.points[0].x, y: this.points[0].y });
      
      // ✅ 新架构：完成绘制追踪
      this.completeDrawTracking(this.points);
      
      // ✅ 新架构：发出详细的关键点完成事件
      const duration = Date.now() - this.eventMixin['drawStartTime'];
      this.emitAnnotationCompleted('keypoint', this.points, {
        duration,
        efficiency: this.calculateKeyPointEfficiency(duration)
      }, {
        position: this.points[0],
        isQuickAnnotation: duration < 1000, // 快速标注标记
        accuracy: this.calculatePositionAccuracy()
      });
    } else {
      // ✅ 新架构：取消绘制追踪
      this.cancelDrawTracking({ reason: 'no_point_placed' });
    }
    this.onDraw(keyPoint);
    this.clearDraw();
  }

  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {
    this.addPoint(point);
    this.stopCurrentDraw();
    
    // ✅ 新架构：追踪鼠标点击和点添加
    this.trackMouseDown(point);
    this.trackPointAdded(point, { isKeyPoint: true });
  }

  addPoint(point: Vector2) {
    this.points = [point]; // KeyPoint只有一个点
    this.onDrawChange();
  }

  // edit
  edit(keyPoint: KeyPoint) {
    this.object = keyPoint;
    this.editGroup.show();
    this.addChangEvent();
    
    // ✅ 新架构：开始编辑追踪
    this.startEditTracking(keyPoint.uuid);
  }

  stopEdit() {
    this.removeChangeEvent();
    this.object = undefined;
    this.editGroup.hide();
  }

  updateEditObject() {
    // KeyPoint编辑逻辑相对简单，主要是位置调整
    if (!this.object) return;
    
    // 可以添加编辑相关的UI元素
    // 例如拖拽handle等
  }

  drawInfo() {
    if (this.object) {
      return `KeyPoint at (${this.object.x().toFixed(0)}, ${this.object.y().toFixed(0)})`;
    } else if (this.points.length > 0) {
      return `KeyPoint at (${this.points[0].x.toFixed(0)}, ${this.points[0].y.toFixed(0)})`;
    }
    return '';
  }

  // 辅助方法
  private calculateKeyPointEfficiency(duration: number): number {
    // 关键点效率计算：主要基于标注速度
    // 快速标注（< 500ms）效率最高
    if (duration < 500) return 1.0;
    if (duration < 1000) return 0.8;
    if (duration < 2000) return 0.6;
    if (duration < 5000) return 0.4;
    return 0.2;
  }

  private calculatePositionAccuracy(): number {
    // 位置精度计算（简化版本）
    // 可以基于鼠标移动轨迹、停留时间等因素
    // 这里返回一个示例值
    return 0.95; // 95%精度
  }

  // Tool actions
  action(action: any): boolean {
    switch (action) {
      case 'clear':
        this.clearDraw();
        return true;
      case 'cancel':
        this.cancelDrawTracking({ reason: 'user_cancelled' });
        this.clearDraw();
        return true;
      default:
        return false;
    }
  }
}
