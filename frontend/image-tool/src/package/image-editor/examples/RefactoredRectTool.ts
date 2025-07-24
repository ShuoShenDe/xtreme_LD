import Konva from 'konva';
import { Event } from '../../configs';
import { AnnotateModeEnum, Vector2 } from '../../types';
import { Rect } from '../shape';
import ImageView from '../index';
import ShapeTool from '../shapeTool/ShapeTool';

/**
 * 重构后的 RectTool 示例
 * 展示如何使用新的事件架构实现完全解耦的EFFM集成
 * 
 * 对比原来的实现：
 * - 移除了所有直接的EFFM API调用
 * - 移除了复杂的会话管理代码
 * - 只需要在关键时刻调用基类的便捷方法
 * - 代码更简洁，职责更清晰
 */
export default class RefactoredRectTool extends ShapeTool {
  name = 'rect' as any; // ToolName.rect
  toolMode: AnnotateModeEnum = AnnotateModeEnum.INSTANCE;
  points: Vector2[] = [];
  declare object?: Rect;

  constructor(view: ImageView) {
    super(view);
  }

  draw() {
    super.draw();
    this.initEvent();
    this.onDrawStart();
    
    // ✅ 简单的事件追踪 - 完全解耦
    this.startDrawTracking();
  }

  onMouseDown(point: Vector2) {
    this.addPoint(point);
    
    // ✅ 追踪鼠标事件 - 一行代码搞定
    this.trackMouseDown(point);
  }

  onMouseMove(point: Vector2) {
    if (this.points.length === 1) {
      this.addPoint(point);
      this.updateRender();
    } else if (this.points.length === 2) {
      this.points[1] = point;
      this.updateRender();
    }
  }

  onMouseUp() {
    if (this.points.length >= 2) {
      this.stopCurrentDraw();
    }
  }

  stopCurrentDraw() {
    if (this.points.length < 2) {
      // ✅ 追踪取消 - 简单明了
      this.cancelDrawTracking({ reason: 'insufficient_points' });
      this.clearDraw();
      return;
    }

    const rect = this.createRect();
    this.view.editor.emit(Event.ANNOTATION_CREATE, rect);
    
    // ✅ 追踪完成 - 自动包含性能计算
    this.completeDrawTracking(this.points);
    
    // ✅ 发出详细的注释完成事件 - 包含几何和性能数据
    const duration = Date.now() - this.eventMixin['drawStartTime'];
    const area = this.calculateArea();
    this.emitAnnotationCompleted('rect', this.points, {
      duration,
      areaPerSecond: area / (duration / 1000),
      efficiency: this.calculateEfficiency(area, duration)
    }, {
      rectArea: area,
      aspectRatio: this.calculateAspectRatio()
    });
    
    this.clearDraw();
  }

  addPoint(point: Vector2) {
    this.points.push(point);
    this.updateRender();
    
    // ✅ 追踪点添加 - 统一接口
    this.trackPointAdded(point);
  }

  edit(object: Rect) {
    this.object = object;
    
    // ✅ 开始编辑追踪 - 简单调用
    this.startEditTracking(object.uuid);
  }

  updateRender() {
    if (this.points.length < 2) return;
    
    // 渲染逻辑保持不变...
    this.drawGroup.removeChildren();
    
    const rect = new Konva.Rect({
      x: Math.min(this.points[0].x, this.points[1].x),
      y: Math.min(this.points[0].y, this.points[1].y),
      width: Math.abs(this.points[1].x - this.points[0].x),
      height: Math.abs(this.points[1].y - this.points[0].y),
      stroke: '#ff0000',
      strokeWidth: 2,
      fill: 'transparent'
    });
    
    this.drawGroup.add(rect);
    this.view.draw();
  }

  clearDraw() {
    this.points = [];
    this.drawGroup.removeChildren();
    this.drawGroup.visible(false);
    this.view.draw();
  }

  // === 辅助方法 ===
  
  private createRect(): Rect {
    // 创建矩形对象的逻辑...
    return new Rect({
      points: this.points,
      // ... 其他属性
    } as any);
  }

  private calculateArea(): number {
    if (this.points.length < 2) return 0;
    const width = Math.abs(this.points[1].x - this.points[0].x);
    const height = Math.abs(this.points[1].y - this.points[0].y);
    return width * height;
  }

  private calculateAspectRatio(): number {
    if (this.points.length < 2) return 0;
    const width = Math.abs(this.points[1].x - this.points[0].x);
    const height = Math.abs(this.points[1].y - this.points[0].y);
    return height === 0 ? 0 : width / height;
  }

  private calculateEfficiency(area: number, duration: number): number {
    // 简单的效率计算公式：面积/时间的标准化值
    const baseEfficiency = area / (duration / 1000); // px²/s
    return Math.min(baseEfficiency / 10000, 1); // 标准化到0-1
  }
}

/**
 * 重构前后对比：
 * 
 * 🔴 原来的实现：
 * - 50+ 行 EFFM 相关代码
 * - 复杂的会话管理
 * - 手动时间戳计算
 * - 重复的事件发射逻辑
 * - 代码耦合度高
 * 
 * ✅ 重构后的实现：
 * - 5-10 行 EFFM 相关代码
 * - 自动会话管理
 * - 自动时间戳处理
 * - 统一的事件发射接口
 * - 完全解耦
 * 
 * 关键改进：
 * 1. 工具类只需关注自己的核心逻辑
 * 2. EFFM 集成变成了几个简单的方法调用
 * 3. 所有 EFFM 逻辑都集中在事件监听器中
 * 4. 易于测试和维护
 * 5. 可以轻松禁用/启用效率监控
 */ 