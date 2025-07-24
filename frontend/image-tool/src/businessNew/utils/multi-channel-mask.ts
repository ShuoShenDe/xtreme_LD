/**
 * Multi-Channel Mask System for ISS Objects
 * Provides pixel-level segmentation and rendering capabilities
 */

import { Vector2 } from 'image-editor';

// Core multi-channel mask data structure
export interface MultiChannelMask {
  version: string;
  width: number;
  height: number;
  channels: {
    foreground?: ChannelData;
    instance_id?: ChannelData;
    visibility?: ChannelData;
    confidence?: ChannelData;
    semantic?: ChannelData;
    depth?: ChannelData;
  };
  metadata: {
    instanceId: number;
    confidence: number;
    isVisible: boolean;
    semanticLabel: number;
    createdAt: string;
  };
}

export interface ChannelData {
  data: number[];
  type: 'uint8' | 'uint16' | 'float32';
}

export interface ISSMetadata {
  instanceId: number;
  confidence: number;
  isVisible: boolean;
  semanticLabel: number;
}

// Multi-channel mask builder with chain API
export class MultiChannelMaskBuilder {
  private mask: MultiChannelMask;

  constructor(width: number, height: number, metadata: ISSMetadata) {
    this.mask = {
      version: '2.0',
      width,
      height,
      channels: {},
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString()
      }
    };
  }

  // Add foreground channel (binary mask)
  addForegroundChannel(polygonPoints: Vector2[]): this {
    const data = this.generateBinaryMask(polygonPoints);
    this.mask.channels.foreground = {
      data,
      type: 'uint8'
    };
    return this;
  }

  // Add instance ID channel
  addInstanceIdChannel(instanceId: number, polygonPoints: Vector2[]): this {
    const data = this.generateInstanceMask(polygonPoints, instanceId);
    this.mask.channels.instance_id = {
      data,
      type: 'uint16'
    };
    return this;
  }

  // Add visibility channel
  addVisibilityChannel(isVisible: boolean = true): this {
    const data = new Array(this.mask.width * this.mask.height).fill(isVisible ? 255 : 0);
    this.mask.channels.visibility = {
      data,
      type: 'uint8'
    };
    return this;
  }

  // Add confidence channel
  addConfidenceChannel(confidence: number): this {
    const data = new Array(this.mask.width * this.mask.height).fill(confidence);
    this.mask.channels.confidence = {
      data,
      type: 'float32'
    };
    return this;
  }

  // Add semantic label channel
  addSemanticChannel(semanticLabel: number): this {
    const data = new Array(this.mask.width * this.mask.height).fill(semanticLabel);
    this.mask.channels.semantic = {
      data,
      type: 'uint8'
    };
    return this;
  }

  // Add depth channel (placeholder)
  addDepthChannel(depth: number = 0): this {
    const data = new Array(this.mask.width * this.mask.height).fill(depth);
    this.mask.channels.depth = {
      data,
      type: 'float32'
    };
    return this;
  }

  // Build final mask
  build(): MultiChannelMask {
    return this.mask;
  }

  // Generate binary mask from polygon points
  private generateBinaryMask(polygonPoints: Vector2[]): number[] {
    const { width, height } = this.mask;
    const data = new Array(width * height).fill(0);

    // Simple polygon fill algorithm
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.isPointInPolygon({ x, y }, polygonPoints)) {
          data[y * width + x] = 255;
        }
      }
    }

    return data;
  }

  // Generate instance mask with specific instance ID
  private generateInstanceMask(polygonPoints: Vector2[], instanceId: number): number[] {
    const { width, height } = this.mask;
    const data = new Array(width * height).fill(0);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.isPointInPolygon({ x, y }, polygonPoints)) {
          data[y * width + x] = instanceId;
        }
      }
    }

    return data;
  }

  // Point-in-polygon test using ray casting algorithm
  private isPointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
    const { x, y } = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }
}

// Mask rendering utilities
export class MaskRenderer {
  // Generate consistent color for instance ID
  static getInstanceColor(instanceId: number): { r: number; g: number; b: number; a: number } {
    // Use golden ratio for better color distribution
    const golden_ratio = 0.618033988749895;
    const hue = (instanceId * golden_ratio) % 1.0;
    
    // Convert HSV to RGB
    const saturation = 0.7;
    const value = 0.9;
    
    const c = value * saturation;
    const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
    const m = value - c;
    
    let r = 0, g = 0, b = 0;
    
    if (hue < 1/6) {
      r = c; g = x; b = 0;
    } else if (hue < 2/6) {
      r = x; g = c; b = 0;
    } else if (hue < 3/6) {
      r = 0; g = c; b = x;
    } else if (hue < 4/6) {
      r = 0; g = x; b = c;
    } else if (hue < 5/6) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
      a: 128 // Semi-transparent
    };
  }

  // Generate color map from multi-channel mask
  static generateColorMap(mask: MultiChannelMask): ImageData | null {
    if (!mask.channels.instance_id || !mask.channels.foreground) {
      return null;
    }

    const { width, height } = mask;
    const instanceData = mask.channels.instance_id.data;
    const foregroundData = mask.channels.foreground.data;
    
    const imageData = new ImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < instanceData.length; i++) {
      const instanceId = instanceData[i];
      const isForeground = foregroundData[i] > 0;
      
      const pixelIndex = i * 4;
      
      if (isForeground && instanceId > 0) {
        const color = this.getInstanceColor(instanceId);
        data[pixelIndex] = color.r;     // Red
        data[pixelIndex + 1] = color.g; // Green
        data[pixelIndex + 2] = color.b; // Blue
        data[pixelIndex + 3] = color.a; // Alpha
      } else {
        // Transparent background
        data[pixelIndex] = 0;
        data[pixelIndex + 1] = 0;
        data[pixelIndex + 2] = 0;
        data[pixelIndex + 3] = 0;
      }
    }

    return imageData;
  }
}

// Main factory function for creating ISS multi-channel masks
export function createISSMultiChannelMask(
  polygonPoints: Vector2[],
  imageWidth: number,
  imageHeight: number,
  metadata: ISSMetadata
): MultiChannelMask {
  return new MultiChannelMaskBuilder(imageWidth, imageHeight, metadata)
    .addForegroundChannel(polygonPoints)
    .addInstanceIdChannel(metadata.instanceId, polygonPoints)
    .addVisibilityChannel(metadata.isVisible)
    .addConfidenceChannel(metadata.confidence)
    .addSemanticChannel(metadata.semanticLabel)
    .addDepthChannel(0)
    .build();
}

// Utility functions for data conversion and optimization
export class MaskUtils {
  // Convert multi-channel mask to optimized format for storage
  static optimizeForStorage(mask: MultiChannelMask): any {
    return {
      version: mask.version,
      instanceId: mask.metadata.instanceId,
      dimensions: { width: mask.width, height: mask.height },
      channels: {
        foreground: mask.channels.foreground ? {
          data: this.compressChannel(mask.channels.foreground.data),
          type: mask.channels.foreground.type
        } : null,
        instanceId: mask.channels.instance_id ? {
          data: this.compressChannel(mask.channels.instance_id.data),
          type: mask.channels.instance_id.type
        } : null
      },
      metadata: mask.metadata
    };
  }

  // Simple run-length encoding for data compression
  static compressChannel(data: number[]): number[] {
    if (data.length === 0) return [];
    
    const compressed: number[] = [];
    let current = data[0];
    let count = 1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i] === current && count < 65535) {
        count++;
      } else {
        compressed.push(current, count);
        current = data[i];
        count = 1;
      }
    }
    
    compressed.push(current, count);
    return compressed;
  }

  // Decompress run-length encoded data
  static decompressChannel(compressed: number[]): number[] {
    const data: number[] = [];
    
    for (let i = 0; i < compressed.length; i += 2) {
      const value = compressed[i];
      const count = compressed[i + 1];
      
      for (let j = 0; j < count; j++) {
        data.push(value);
      }
    }
    
    return data;
  }
} 