import Konva from 'konva';
import { cloneDeep } from 'lodash';
import { AnnotateClassName, IShapeConfig } from '../type';
import { ToolType } from '../../types';
import { CommentBubbleStateStyle, defaultCommentBubbleConfig } from '../../configs';
import Shape from './Shape';

export interface ICommentBubbleConfig extends IShapeConfig {
  width?: number;
  height?: number;
  tailWidth?: number;
  tailHeight?: number;
}

export default class CommentBubble extends Shape {
  className = 'comment-bubble' as AnnotateClassName;
  _stateStyles = cloneDeep(CommentBubbleStateStyle);

  constructor(config?: ICommentBubbleConfig) {
    const defaultConfig = {
      width: 60,
      height: 40,
      tailWidth: 16,
      tailHeight: 16,
    };
    super({ ...defaultCommentBubbleConfig, ...defaultConfig, ...config });
  }

  get stateStyles() {
    return this._stateStyles;
  }

  _sceneFunc(context: Konva.Context, shape: Konva.Shape) {
    const { width, height, tailWidth, tailHeight } = this.attrs;

    // 绘制矩形
    context.beginPath();
    context.rect(0, 0, width, height);
    context.closePath();
    context.fillStrokeShape(shape);

    // 绘制右下方钝角三角形（尖角在底边中心偏右）
    const tailBaseY = height;
    const tailBaseX1 = width / 2 - tailWidth / 2;
    const tailBaseX2 = width / 2 + tailWidth / 2;
    const tailTipX = width / 2 + 4; // 尖角略微偏右
    const tailTipY = height + tailHeight;

    context.beginPath();
    context.moveTo(tailBaseX1, tailBaseY); // 左底点
    context.lineTo(tailTipX, tailTipY);    // 尖角
    context.lineTo(tailBaseX2, tailBaseY); // 右底点
    context.closePath();
    context.fillStrokeShape(shape);
  }

  newShape() {
    return new CommentBubble();
  }

  get toolType() {
    return ToolType.COMMENT_BUBBLE;
  }
}