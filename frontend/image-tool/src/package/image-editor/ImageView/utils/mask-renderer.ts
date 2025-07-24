export interface InstanceColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class MaskRenderer {
  // Generate consistent color for instance ID
  static getInstanceColor(instanceId: number): InstanceColor {
    // Use instance ID to generate consistent colors using golden angle
    const hue = (instanceId * 137.508) % 360; // Golden angle for good distribution
    const saturation = 70 + (instanceId % 30); // 70-100% saturation  
    const lightness = 50 + (instanceId % 20);  // 50-70% lightness
    
    // Convert HSL to RGB
    const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = lightness / 100 - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (hue >= 0 && hue < 60) {
      r = c; g = x; b = 0;
    } else if (hue >= 60 && hue < 120) {
      r = x; g = c; b = 0;
    } else if (hue >= 120 && hue < 180) {
      r = 0; g = c; b = x;
    } else if (hue >= 180 && hue < 240) {
      r = 0; g = x; b = c;
    } else if (hue >= 240 && hue < 300) {
      r = x; g = 0; b = c;
    } else if (hue >= 300 && hue < 360) {
      r = c; g = 0; b = x;
    }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255), 
      b: Math.round((b + m) * 255),
      a: 80 // High transparency (80/255 ≈ 31%)
    };
  }

  // Create mask overlay canvas
  static createMaskOverlay(multiChannelMask: any): HTMLCanvasElement {
    const { width, height, channels } = multiChannelMask;
    
    // Get data from channels
    const foregroundData = channels.foreground?.data || [];
    const instanceData = channels.instanceId?.data || [];
    
    if (foregroundData.length === 0) {
      console.warn('No foreground data in multi-channel mask');
      return document.createElement('canvas');
    }

    // Create canvas for mask overlay
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Cannot get 2D context for mask canvas');
      return canvas;
    }

    // Create image data
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    // Build instance ID to color mapping
    const instanceColors = new Map<number, InstanceColor>();
    
    // Fill pixels based on foreground mask with instance-specific colors
    for (let i = 0; i < foregroundData.length; i++) {
      if (foregroundData[i] > 0) { // This pixel belongs to an instance
        const instanceId = instanceData[i] || 1; // Use instance ID from data or default to 1
        
        // Get or create color for this instance
        if (!instanceColors.has(instanceId)) {
          instanceColors.set(instanceId, this.getInstanceColor(instanceId));
        }
        const color = instanceColors.get(instanceId)!;
        
        const pixelIndex = i * 4;
        data[pixelIndex] = color.r;     // Red
        data[pixelIndex + 1] = color.g; // Green  
        data[pixelIndex + 2] = color.b; // Blue
        data[pixelIndex + 3] = color.a; // Alpha (high transparency)
      }
    }
    
    // Draw the mask overlay
    ctx.putImageData(imageData, 0, 0);
    
    // Draw outline for better visibility
    this.drawMaskOutline(ctx, foregroundData, width, height);
    

    
    return canvas;
  }

  // Draw outline of mask for better visibility
  static drawMaskOutline(ctx: CanvasRenderingContext2D, maskData: number[], width: number, height: number) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    
    // Simple edge detection to draw outline
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        if (maskData[idx] > 0) {
          // Check if this pixel is on the edge
          const hasEmptyNeighbor = 
            maskData[idx - 1] === 0 ||     // left
            maskData[idx + 1] === 0 ||     // right  
            maskData[idx - width] === 0 || // top
            maskData[idx + width] === 0;   // bottom
            
          if (hasEmptyNeighbor) {
            ctx.strokeRect(x, y, 1, 1);
          }
        }
      }
    }
  }

  // Get statistics about instances in mask
  static getMaskStatistics(multiChannelMask: any): {
    totalPixels: number;
    instanceCount: number;
    instancePixelCounts: Map<number, number>;
  } {
    const { channels } = multiChannelMask;
    const foregroundData = channels.foreground?.data || [];
    const instanceData = channels.instanceId?.data || [];
    
    const instancePixelCounts = new Map<number, number>();
    let totalPixels = 0;
    
    for (let i = 0; i < foregroundData.length; i++) {
      if (foregroundData[i] > 0) {
        totalPixels++;
        const instanceId = instanceData[i] || 1;
        instancePixelCounts.set(instanceId, (instancePixelCounts.get(instanceId) || 0) + 1);
      }
    }
    
    return {
      totalPixels,
      instanceCount: instancePixelCounts.size,
      instancePixelCounts
    };
  }
} 