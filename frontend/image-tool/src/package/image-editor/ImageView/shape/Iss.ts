import Konva from 'konva';
import { AnnotateClassName, IShapeConfig } from '../type';
import { ToolType, Vector2 } from '../../types';
import Shape from './Shape';
import { MaskRenderer } from '../../../../businessNew/utils/multi-channel-mask';

/**
 * ISS (Instance Semantic Segmentation) Shape Class
 * Used for annotating semantic segmentation regions of individual objects
 */
export default class Iss extends Shape {
  className = 'iss' as AnnotateClassName;

  constructor(config?: IShapeConfig) {
    const cfg = Object.assign({ points: [], closed: true }, config);
    super(cfg);

    this.on('pointsChange', () => {
      this.onPointChange();
    });
  }

  _sceneFunc(context: Konva.Context, shape: Konva.Shape) {
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

    // Default polygon rendering
    this._renderPolygonFallback(context, shape);
  }

  // 🔧 Override hitFunc to ensure proper click detection
  _hitFunc(context: Konva.Context) {
    const { points } = this.attrs;
    if (!points || points.length < 6) return;

    // Draw the hit area as a filled polygon
    context.beginPath();
    context.moveTo(points[0], points[1]);
    
    for (let i = 2; i < points.length; i += 2) {
      context.lineTo(points[i], points[i + 1]);
    }
    
    context.closePath();
    context.fillStrokeShape(this);
  }

  get rotationCenter() {
    const points = this.attrs.points || [];
    if (points.length < 2) return { x: 0, y: 0 };
    
    // Calculate centroid
    let sumX = 0, sumY = 0;
    const numPoints = points.length / 2;
    
    for (let i = 0; i < points.length; i += 2) {
      sumX += points[i];
      sumY += points[i + 1];
    }
    
    return {
      x: sumX / numPoints,
      y: sumY / numPoints,
    };
  }

  getSelfRect(onlySelf?: boolean) {
    const points = this.attrs.points || [];
    if (points.length < 2) return { x: 0, y: 0, width: 1, height: 1 };

    let minX = points[0], maxX = points[0];
    let minY = points[1], maxY = points[1];

    for (let i = 2; i < points.length; i += 2) {
      minX = Math.min(minX, points[i]);
      maxX = Math.max(maxX, points[i]);
      minY = Math.min(minY, points[i + 1]);
      maxY = Math.max(maxY, points[i + 1]);
    }

    const width = maxX - minX;
    const height = maxY - minY;

    if (onlySelf) return { x: minX, y: minY, width, height };
    
    return {
      x: minX + 1,
      y: minY + 1,
      width: Math.max(1, width - 2),
      height: Math.max(1, height - 2),
    };
  }

  getArea() {
    const points = this.attrs.points || [];
    if (points.length < 6) return 0; // at least 3 points

    let area = 0;
    const numPoints = points.length / 2;
    
    for (let i = 0; i < numPoints; i++) {
      const j = (i + 1) % numPoints;
      const xi = points[i * 2];
      const yi = points[i * 2 + 1];
      const xj = points[j * 2];
      const yj = points[j * 2 + 1];
      area += xi * yj - xj * yi;
    }
    
    return Math.abs(area) / 2;
  }

  clonePointsData() {
    return { 
      points: [...(this.attrs.points || [])],
      x: this.x(),
      y: this.y(),
      scaleX: this.scaleX(),
      scaleY: this.scaleY(),
      rotation: this.rotation() || 0
    };
  }

  newShape() {
    return new Iss();
  }

  get toolType() {
    return ToolType.ISS;
  }

  // ISS specific methods
  getPointsAsVectors(): Vector2[] {
    const points = this.attrs.points || [];
    const vectors: Vector2[] = [];
    
    for (let i = 0; i < points.length; i += 2) {
      vectors.push({ x: points[i], y: points[i + 1] });
    }
    
    return vectors;
  }

  setPointsFromVectors(vectors: Vector2[]) {
    const points: number[] = [];
    vectors.forEach(v => {
      points.push(v.x, v.y);
    });
    this.points(points);
  }

  // 🚀 Render ISS with multi-channel mask data
  _renderWithMultiChannelMask(context: Konva.Context, shape: Konva.Shape, multiChannelMask: any, instanceId: number) {
    const { points } = this.attrs;
    if (!points || points.length < 6) return;

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
    
    // Draw the polygon with instance color
    context.beginPath();
    context.moveTo(points[0], points[1]);
    
    for (let i = 2; i < points.length; i += 2) {
      context.lineTo(points[i], points[i + 1]);
    }
    
    context.closePath();
    context.fill();
    
    // Draw outline for better visibility
    context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    context.lineWidth = 3;
    context.stroke();
    
  }

  // Render ISS with instance-specific color based on metadata
  _renderWithInstanceColor(context: Konva.Context, shape: Konva.Shape, issMetadata: any) {
    const { points } = this.attrs;
    
    if (!points || points.length < 6) {
      return;
    }

    try {
      // Get instance color based on instanceId
      const instanceColor = MaskRenderer.getInstanceColor(issMetadata.instanceId);

      // Set fill style with transparency
      const fillStyle = `rgba(${instanceColor.r}, ${instanceColor.g}, ${instanceColor.b}, ${instanceColor.a / 255})`;
      context.fillStyle = fillStyle;
      
    } catch (error) {
      console.warn('Failed to get instance color, using default:', error);
      // Fallback to stroke color
      context.fillStyle = this.stroke() || '#ff0000';
    }
    
    // Draw the polygon with instance color
    context.beginPath();
    context.moveTo(points[0], points[1]);
    
    for (let i = 2; i < points.length; i += 2) {
      context.lineTo(points[i], points[i + 1]);
    }
    
    context.closePath();
    context.fill();
    
    // Draw outline for better visibility
    context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    context.lineWidth = 2;
    context.stroke();
  }
  
  // Default ISS mask rendering - always render as mask even without metadata
  _renderPolygonFallback(context: Konva.Context, shape: Konva.Shape) {
    const { points } = this.attrs;
    if (!points || points.length < 6) return;

    // Generate a default instance ID based on object UUID or a hash of points
    const defaultInstanceId = this.uuid ? this._generateInstanceIdFromUUID(this.uuid) : this._generateInstanceIdFromPoints(points);
    
    // Get instance color using default ID
    const instanceColor = MaskRenderer.getInstanceColor(defaultInstanceId);
    
    // Set fill style with mask-like transparency
    const fillStyle = `rgba(${instanceColor.r}, ${instanceColor.g}, ${instanceColor.b}, ${instanceColor.a / 255})`;
    context.fillStyle = fillStyle;
    
    // Draw the polygon with instance color
    context.beginPath();
    context.moveTo(points[0], points[1]);
    
    for (let i = 2; i < points.length; i += 2) {
      context.lineTo(points[i], points[i + 1]);
    }
    
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

  // Generate instance ID from points array
  private _generateInstanceIdFromPoints(points: number[]): number {
    let hash = 0;
    for (let i = 0; i < points.length; i++) {
      hash = ((hash << 5) - hash) + Math.round(points[i] * 100);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 65535 + 1; // Ensure positive ID from 1 to 65535
  }
} 