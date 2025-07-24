import { ToolName, Vector2 } from '../../types';
import ShapeTool from './ShapeTool';
import ImageView from '../index';
import { CommentBubble } from '../shape';
import Konva from 'konva';
import { Event } from '../../configs';

export default class CommentBubbleTool extends ShapeTool {
  name = ToolName['comment-bubble'];
  points: Vector2[] = [];
  declare object?: CommentBubble;

  constructor(view: ImageView) {
    super(view);
  }

  // draw
  draw() {
    this.clearDraw();
    this.clearEvent();
    this.initEvent();
    this.onDrawStart();
  }
  
  stopDraw() {
    this.clearDraw();
    this.clearEvent();
    this.onDrawEnd();
  }
  
  stopCurrentDraw() {
    if (this.points.length === 1) {
      const bubbleConfig = {
        ...this.points[0],
        width: 60,
        height: 40,
        tailWidth: 16,
        tailHeight: 16
      };
      
      // 触发自定义事件，而不是通过标准流程创建对象
      this.view.editor.emit('COMMENT_BUBBLE_CREATE', bubbleConfig);
    }
    this.clearDraw();
  }
  
  clearDraw() {
    this.mouseDown = false;
    this.points = [];
    this.onDrawClear();
  }
  
  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, point: Vector2) {
    this.addPoint(point);
    this.stopCurrentDraw();
  }
  
  addPoint(point: Vector2) {
    this.points.push(point);
  }
  
  edit(object: CommentBubble) {
    this.object = object;
  }
  
  stopEdit() {
    this.removeChangeEvent();
    this.object = undefined;
  }
} 