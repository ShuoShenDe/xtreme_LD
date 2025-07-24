/**
 * 统一掩码构建器 - 多实例统一存储系统
 * 将多个ISS实例转换为单一的多通道掩码格式
 */

import { Vector2 } from 'image-editor';

// 统一掩码数据结构
export interface UnifiedMaskData {
  imageId: string;
  imageDimensions: {
    width: number;
    height: number;
  };
  compressedMask: string; // base64编码的压缩掩码
  instances: Record<string, InstanceData>;
  classes: Record<string, ClassData>;
  // 🔧 新增：保存原始的tracking信息，确保加载后trackingid不变化
  trackingInfo?: Record<string, OriginalTrackingInfo>;
  metadata: {
    totalInstances: number;
    totalPixels: number;
    annotatedPixels: number;
    createdAt: string;
    updatedAt: string;
  };
}

// 原始tracking信息结构
export interface OriginalTrackingInfo {
  trackId: string;
  trackName: string;
  originalUuid: string; // 原始对象的UUID
}

export interface InstanceData {
  id: number;
  classId: number;
  className: string;
  confidence: number;
  area: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  polygonPoints: Vector2[];
  isVisible: boolean;
  createdAt: string;
}

export interface ClassData {
  id: number;
  name: string;
  color: string;
}

// 原始掩码数据（压缩前）
export interface RawMaskData {
  instanceIdMask: Uint16Array;  // 实例ID掩码
  classIdMask: Uint8Array;      // 类别ID掩码
  confidenceMask: Uint8Array;   // 置信度掩码
}

// 分割区域数据
export interface SegmentationRegion {
  id: string;
  instanceId: number;
  classId: number;
  className: string;
  confidence: number;
  polygonPoints: Vector2[];
  isVisible: boolean;
  createdAt: string;
}

/**
 * 统一掩码构建器
 */
export class UnifiedMaskBuilder {
  private imageWidth: number;
  private imageHeight: number;
  private imageId: string;
  private instances: Map<number, InstanceData> = new Map();
  private classes: Map<number, ClassData> = new Map();
  private regions: Map<string, SegmentationRegion> = new Map();
  private nextInstanceId: number = 1;

  constructor(imageId: string, width: number, height: number) {
    this.imageId = imageId;
    this.imageWidth = width;
    this.imageHeight = height;
  }

  /**
   * 添加分割区域
   */
  addSegmentationRegion(region: SegmentationRegion): this {
    try {
      this.ensureUniqueInstanceId(region);
      this.regions.set(region.id, region);
      
      const instanceData = this.createInstanceData(region);
      this.instances.set(region.instanceId, instanceData);
      console.log('instanceData', region.instanceId);
      this.addClassIfNotExists(region);
      
      return this;
    } catch (error) {
      console.error('Failed to add segmentation region:', error);
      throw error;
    }
  }

  /**
   * 确保实例ID唯一
   */
  private ensureUniqueInstanceId(region: SegmentationRegion): void {
    if (region.instanceId === 0) {
      region.instanceId = this.nextInstanceId++;
    } else {
      this.nextInstanceId = Math.max(this.nextInstanceId, region.instanceId + 1);
    }
  }

  /**
   * 创建实例数据
   */
  private createInstanceData(region: SegmentationRegion): InstanceData {
    const boundingBox = this.calculateBoundingBox(region.polygonPoints);
    const area = this.calculatePolygonArea(region.polygonPoints);
    
    return {
      id: region.instanceId,
      classId: region.classId,
      className: region.className,
      confidence: region.confidence,
      area,
      boundingBox,
      polygonPoints: region.polygonPoints,
      isVisible: region.isVisible,
      createdAt: region.createdAt
    };
  }

  /**
   * 添加类别信息（如果不存在）
   */
  private addClassIfNotExists(region: SegmentationRegion): void {
    if (!this.classes.has(region.classId)) {
      this.classes.set(region.classId, {
        id: region.classId,
        name: region.className,
        color: this.generateClassColor(region.classId)
      });
    }
  }



  /**
   * 移除分割区域
   */
  removeSegmentationRegion(regionId: string): this {
    const region = this.regions.get(regionId);
    if (region) {
      this.regions.delete(regionId);
      this.instances.delete(region.instanceId);
    }
    return this;
  }

  /**
   * 构建统一掩码数据
   */
  build(): UnifiedMaskData {
    try {
      const rawMasks = this.buildRawMasks();
      const compressedMask = this.compressMasks(rawMasks);
      
      const unifiedMaskData: UnifiedMaskData = {
        imageId: this.imageId,
        imageDimensions: {
          width: this.imageWidth,
          height: this.imageHeight
        },
        compressedMask,
        instances: this.convertInstancesToRecord(),
        classes: this.convertClassesToRecord(),
        metadata: this.buildMetadata(rawMasks)
      };
      
      return unifiedMaskData;
    } catch (error) {
      console.error('Failed to build unified mask data:', error);
      throw error;
    }
  }

  /**
   * 转换实例为记录格式
   */
  private convertInstancesToRecord(): Record<string, InstanceData> {
    const instancesRecord: Record<string, InstanceData> = {};
    this.instances.forEach((instance, id) => {
      instancesRecord[id.toString()] = instance;
    });
    return instancesRecord;
  }

  /**
   * 转换类别为记录格式
   */
  private convertClassesToRecord(): Record<string, ClassData> {
    const classesRecord: Record<string, ClassData> = {};
    this.classes.forEach((classData, id) => {
      classesRecord[id.toString()] = classData;
    });
    return classesRecord;
  }

  /**
   * 构建元数据
   */
  private buildMetadata(rawMasks: RawMaskData): UnifiedMaskData['metadata'] {
    const totalPixels = this.imageWidth * this.imageHeight;
    const annotatedPixels = this.calculateAnnotatedPixels(rawMasks.instanceIdMask);
    
    return {
      totalInstances: this.instances.size,
      totalPixels,
      annotatedPixels,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }



  /**
   * 构建原始掩码数据
   */
  private buildRawMasks(): RawMaskData {
    const totalPixels = this.imageWidth * this.imageHeight;
    
    const instanceIdMask = new Uint16Array(totalPixels);
    const classIdMask = new Uint8Array(totalPixels);
    const confidenceMask = new Uint8Array(totalPixels);
    
    // 为每个实例生成掩码
    this.instances.forEach((instance) => {
      const pixels = this.polygonToPixels(instance.polygonPoints);
      
      pixels.forEach(({ x, y }) => {
        if (x >= 0 && x < this.imageWidth && y >= 0 && y < this.imageHeight) {
          const index = y * this.imageWidth + x;
          instanceIdMask[index] = instance.id;
          classIdMask[index] = instance.classId;
          confidenceMask[index] = Math.floor(instance.confidence * 255);
        }
      });
    });
    
    return {
      instanceIdMask,
      classIdMask,
      confidenceMask
    };
  }

  /**
   * 压缩掩码数据
   */
  private compressMasks(rawMasks: RawMaskData): string {
    try {
      const { instanceIdMask, classIdMask, confidenceMask } = rawMasks;
      
      // 使用RLE压缩算法
      const compressedData = {
        instanceId: this.compressUint16Array(instanceIdMask),
        classId: this.compressUint8Array(classIdMask),
        confidence: this.compressUint8Array(confidenceMask)
      };
      
      return this.encodeToBase64(compressedData);
    } catch (error) {
      console.error('Failed to compress masks:', error);
      throw new Error('Mask compression failed');
    }
  }

  /**
   * 编码为Base64
   */
  private encodeToBase64(data: object): string {
    try {
      const jsonString = JSON.stringify(data);
      return btoa(jsonString);
    } catch (error) {
      console.error('Failed to encode to base64:', error);
      throw new Error('Base64 encoding failed');
    }
  }

  /**
   * 多边形转像素 - 使用扫描线算法
   */
  private polygonToPixels(polygonPoints: Vector2[]): Vector2[] {
    if (polygonPoints.length < 3) return [];
    
    const pixels: Vector2[] = [];
    const boundingBox = this.calculateBoundingBox(polygonPoints);
    
    // 只处理边界框内的区域，优化性能
    const startY = Math.max(0, Math.floor(boundingBox.y));
    const endY = Math.min(this.imageHeight - 1, Math.ceil(boundingBox.y + boundingBox.height));
    
    for (let y = startY; y <= endY; y++) {
      const intersections = this.findScanlineIntersections(polygonPoints, y);
      
      if (intersections.length >= 2) {
        this.fillScanlinePixels(intersections, y, pixels);
      }
    }
    
    return pixels;
  }

  /**
   * 找到扫描线与多边形的交点
   */
  private findScanlineIntersections(polygonPoints: Vector2[], y: number): number[] {
    const intersections: number[] = [];
    
    for (let i = 0; i < polygonPoints.length; i++) {
      const p1 = polygonPoints[i];
      const p2 = polygonPoints[(i + 1) % polygonPoints.length];
      
      if (this.isLineIntersectingScanline(p1, p2, y)) {
        const x = this.calculateIntersectionX(p1, p2, y);
        intersections.push(x);
      }
    }
    
    return intersections.sort((a, b) => a - b);
  }

  /**
   * 判断线段是否与扫描线相交
   */
  private isLineIntersectingScanline(p1: Vector2, p2: Vector2, y: number): boolean {
    return (p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y);
  }

  /**
   * 计算交点的x坐标
   */
  private calculateIntersectionX(p1: Vector2, p2: Vector2, y: number): number {
    return p1.x + (y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y);
  }

  /**
   * 填充扫描线上的像素
   */
  private fillScanlinePixels(intersections: number[], y: number, pixels: Vector2[]): void {
    for (let i = 0; i < intersections.length; i += 2) {
      if (i + 1 < intersections.length) {
        const startX = Math.max(0, Math.floor(intersections[i]));
        const endX = Math.min(this.imageWidth - 1, Math.floor(intersections[i + 1]));
        
        for (let x = startX; x <= endX; x++) {
          pixels.push({ x, y });
        }
      }
    }
  }

  /**
   * 计算多边形面积
   */
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

  /**
   * 计算边界框
   */
  private calculateBoundingBox(points: Vector2[]): { x: number; y: number; width: number; height: number } {
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    
    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;
    
    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * 生成类别颜色
   */
  private generateClassColor(classId: number): string {
    const colors = [
      '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
      '#FF8000', '#8000FF', '#00FF80', '#FF0080', '#80FF00', '#0080FF'
    ];
    return colors[classId % colors.length];
  }

  /**
   * 计算标注像素数
   */
  private calculateAnnotatedPixels(instanceIdMask: Uint16Array): number {
    let count = 0;
    for (let i = 0; i < instanceIdMask.length; i++) {
      if (instanceIdMask[i] > 0) count++;
    }
    return count;
  }

  /**
   * 压缩Uint16Array
   */
  private compressUint16Array(data: Uint16Array): number[] {
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

  /**
   * 压缩Uint8Array
   */
  private compressUint8Array(data: Uint8Array): number[] {
    const compressed: number[] = [];
    let current = data[0];
    let count = 1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i] === current && count < 255) {
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

  /**
   * 设置下一个实例ID
   */
  setNextInstanceId(nextId: number): void {
    this.nextInstanceId = nextId;
  }

  /**
   * 获取调试信息
   */
  getDebugInfo() {
    return {
      imageId: this.imageId,
      dimensions: `${this.imageWidth}x${this.imageHeight}`,
      totalRegions: this.regions.size,
      totalInstances: this.instances.size,
      totalClasses: this.classes.size,
      nextInstanceId: this.nextInstanceId,
      regions: Array.from(this.regions.entries()),
      instances: Array.from(this.instances.entries()),
      classes: Array.from(this.classes.entries())
    };
  }
}

/**
 * 统一掩码查询器
 */
export class UnifiedMaskQuery {
  private unifiedMaskData: UnifiedMaskData;
  private rawMasks: RawMaskData | null = null;

  constructor(unifiedMaskData: UnifiedMaskData) {
    this.unifiedMaskData = unifiedMaskData;
  }

  /**
   * 解压掩码数据
   */
  async decompress(): Promise<void> {
    if (this.rawMasks) return;
    
    try {
      const jsonString = atob(this.unifiedMaskData.compressedMask);
      const compressedData = JSON.parse(jsonString);
      
      const { width, height } = this.unifiedMaskData.imageDimensions;
      const totalPixels = width * height;
      
      this.rawMasks = {
        instanceIdMask: this.decompressToUint16Array(compressedData.instanceId, totalPixels),
        classIdMask: this.decompressToUint8Array(compressedData.classId, totalPixels),
        confidenceMask: this.decompressToUint8Array(compressedData.confidence, totalPixels)
      };
      
      // Mask data decompressed successfully
    } catch (error) {
      console.error('Failed to decompress mask data:', error);
      throw error;
    }
  }

  /**
   * 获取像素信息
   */
  async getPixelInfo(x: number, y: number): Promise<{ instanceId: number; classId: number; confidence: number } | null> {
    await this.decompress();
    if (!this.rawMasks) return null;
    
    const { width } = this.unifiedMaskData.imageDimensions;
    const index = y * width + x;
    
    if (index < 0 || index >= this.rawMasks.instanceIdMask.length) return null;
    
    return {
      instanceId: this.rawMasks.instanceIdMask[index],
      classId: this.rawMasks.classIdMask[index],
      confidence: this.rawMasks.confidenceMask[index] / 255
    };
  }

  /**
   * 获取实例的所有像素
   */
  async getInstancePixels(instanceId: number): Promise<Vector2[]> {
    await this.decompress();
    if (!this.rawMasks) return [];
    
    const pixels: Vector2[] = [];
    const { width } = this.unifiedMaskData.imageDimensions;
    
    for (let i = 0; i < this.rawMasks.instanceIdMask.length; i++) {
      if (this.rawMasks.instanceIdMask[i] === instanceId) {
        const x = i % width;
        const y = Math.floor(i / width);
        pixels.push({ x, y });
      }
    }
    
    return pixels;
  }

  /**
   * 解压缩到Uint16Array
   */
  private decompressToUint16Array(compressed: number[], totalPixels: number): Uint16Array {
    const data = new Uint16Array(totalPixels);
    let dataIndex = 0;
    
    for (let i = 0; i < compressed.length; i += 2) {
      const value = compressed[i];
      const count = compressed[i + 1];
      
      for (let j = 0; j < count; j++) {
        data[dataIndex++] = value;
      }
    }
    
    return data;
  }

  /**
   * 解压缩到Uint8Array
   */
  private decompressToUint8Array(compressed: number[], totalPixels: number): Uint8Array {
    const data = new Uint8Array(totalPixels);
    let dataIndex = 0;
    
    for (let i = 0; i < compressed.length; i += 2) {
      const value = compressed[i];
      const count = compressed[i + 1];
      
      for (let j = 0; j < count; j++) {
        data[dataIndex++] = value;
      }
    }
    
    return data;
  }
} 