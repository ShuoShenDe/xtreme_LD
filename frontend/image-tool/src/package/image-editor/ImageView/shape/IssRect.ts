import Konva from 'konva';
import { AnnotateClassName, IShapeConfig } from '../type';
import { ToolType, Vector2 } from '../../types';
import Shape from './Shape';
import { MaskRenderer } from '../../../../businessNew/utils/multi-channel-mask';

/**
 * ISS Rect (Instance Semantic Segmentation Rectangle) Shape Class
 * Used for annotating semantic segmentation regions of individual objects in rectangular form
 */
export default class IssRect extends Shape {
  className = 'iss-rect' as AnnotateClassName;

  constructor(config?: IShapeConfig) {
    const cfg = Object.assign({ width: 1, height: 1, points: [] }, config);
    super(cfg);

    this.on('xChange yChange widthChange heightChange', () => {
      this.onPointChange();
    });
  }

  _sceneFunc(context: Konva.Context, shape: Konva.Shape) {
    const { width, height } = this.attrs;
    
    // Check rendering data in priority order
    const userData = this.userData;
    
    // 🚀 Priority 1: Multi-channel mask data
    if (userData && userData.hasMultiChannelMask && userData.multiChannelMask) {
      this._renderWithMultiChannelMask(context, shape, userData.multiChannelMask, userData.instanceId);
      return;
    }
    
    // 🔄 Priority 2: Basic ISS metadata
    if (userData && userData.hasIssMetadata && userData.issMetadata) {
      this._renderWithInstanceColor(context, shape, userData.issMetadata);
      return;
    }

    // Default rectangle rendering
    this._renderRectFallback(context, shape);
  }

  // 🔧 Override hitFunc to ensure proper click detection
  _hitFunc(context: Konva.Context) {
    const { width, height } = this.attrs;
    if (width <= 0 || height <= 0) return;

    // Draw the hit area as a filled rectangle
    context.beginPath();
    context.rect(0, 0, width, height);
    context.closePath();
    context.fillStrokeShape(this);
  }

  get rotationCenter() {
    const { x, y, width, height } = this.attrs;
    return { 
      x: x + width / 2, 
      y: y + height / 2 
    };
  }

  getSelfRect(onlySelf?: boolean) {
    const { width, height } = this.attrs;
    if (onlySelf) return { x: 0, y: 0, width, height };
    const w = width - 2;
    const h = height - 2;
    return {
      x: 1,
      y: 1,
      width: Math.abs(w) < 1 ? 1 : w,
      height: Math.abs(h) < 1 ? 1 : h,
    };
  }

  getArea() {
    const { width, height } = this.attrs;
    return width * height;
  }

  clonePointsData() {
    const { width, height, x, y } = this.attrs;
    return { width, height, x, y };
  }

  newShape() {
    return new IssRect();
  }

  get toolType() {
    return ToolType.ISS_RECT;
  }

  // ISS specific methods
  getPointsAsVectors(): Vector2[] {
    const { x, y, width, height } = this.attrs;
    return [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ];
  }

  setPointsFromVectors(vectors: Vector2[]) {
    if (vectors.length < 2) return;
    
    const x = Math.min(vectors[0].x, vectors[2].x);
    const y = Math.min(vectors[0].y, vectors[2].y);
    const width = Math.abs(vectors[2].x - vectors[0].x);
    const height = Math.abs(vectors[2].y - vectors[0].y);
    
    this.setAttrs({ x, y, width, height });
  }

  // 🚀 Render ISS Rect with multi-channel mask data
  _renderWithMultiChannelMask(context: Konva.Context, shape: Konva.Shape, multiChannelMask: any, instanceId: number) {
    const { width, height } = this.attrs;
    if (width <= 0 || height <= 0) return;

    // Get instance color based on instanceId from multi-channel mask metadata
    const instanceColor = MaskRenderer.getInstanceColor(instanceId);
    
    // Extract additional rendering information from multi-channel mask
    const confidence = multiChannelMask.metadata?.confidence || 1.0;
    const isVisible = multiChannelMask.metadata?.isVisible !== false;
    
    if (!isVisible) {
      return;
    }

    // Adjust alpha based on confidence
    const adjustedAlpha = Math.floor(instanceColor.a * confidence);
    const fillStyle = `rgba(${instanceColor.r}, ${instanceColor.g}, ${instanceColor.b}, ${adjustedAlpha / 255})`;
    context.fillStyle = fillStyle;
    
    // Draw the rectangle with instance color
    context.beginPath();
    context.rect(0, 0, width, height);
    context.closePath();
    context.fill();
    
    // Draw outline for better visibility
    context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    context.lineWidth = 3;
    context.stroke();
  }

  // Render ISS Rect with instance-specific color based on metadata
  _renderWithInstanceColor(context: Konva.Context, shape: Konva.Shape, issMetadata: any) {
    const { width, height } = this.attrs;
    
    if (width <= 0 || height <= 0) return;

    // Get instance color from metadata
    const instanceColor = issMetadata.instanceColor || { r: 255, g: 0, b: 0, a: 128 };
    const confidence = issMetadata.confidence || 1.0;
    
    // Adjust alpha based on confidence
    const adjustedAlpha = Math.floor(instanceColor.a * confidence);
    const fillStyle = `rgba(${instanceColor.r}, ${instanceColor.g}, ${instanceColor.b}, ${adjustedAlpha / 255})`;
    context.fillStyle = fillStyle;
    
    // Draw the rectangle
    context.beginPath();
    context.rect(0, 0, width, height);
    context.closePath();
    context.fill();
    
    // Draw outline
    context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    context.lineWidth = 2;
    context.stroke();
  }

  // Default ISS rect mask rendering - always render as mask even without metadata
  _renderRectFallback(context: Konva.Context, shape: Konva.Shape) {
    const { width, height } = this.attrs;
    if (width <= 0 || height <= 0) return;

    // Generate a default instance ID based on object UUID or dimensions
    const defaultInstanceId = this.uuid ? this._generateInstanceIdFromUUID(this.uuid) : this._generateInstanceIdFromDimensions(width, height);
    
    // Get instance color using default ID
    const instanceColor = MaskRenderer.getInstanceColor(defaultInstanceId);
    
    // Set fill style with mask-like transparency
    const fillStyle = `rgba(${instanceColor.r}, ${instanceColor.g}, ${instanceColor.b}, ${instanceColor.a / 255})`;
    context.fillStyle = fillStyle;
    
    // Draw the rectangle with instance color
    context.beginPath();
    context.rect(0, 0, width, height);
    context.closePath();
    context.fill();
    
    // Draw outline for better visibility
    context.strokeStyle = this.stroke() || 'rgba(255, 255, 255, 0.6)';
    context.lineWidth = 1.5;
    context.stroke();
  }

  // Generate instance ID from UUID string
  private _generateInstanceIdFromUUID(uuid: string): number {
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      const char = uuid.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 65535 + 1; // Ensure positive ID from 1 to 65535
  }

  // Generate instance ID from dimensions
  private _generateInstanceIdFromDimensions(width: number, height: number): number {
    const hash = ((width * 1000) << 16) | (height * 1000);
    return Math.abs(hash) % 65535 + 1; // Ensure positive ID from 1 to 65535
  }
} 