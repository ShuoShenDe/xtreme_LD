import { Page, Locator } from '@playwright/test';
import { Point2D, Rect } from './base-page';

export interface CanvasDrawOptions {
  startPoint: Point2D;
  endPoint: Point2D;
  relative?: boolean; // 是否使用相对坐标 (0-1)
}

export interface CanvasInteractionOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
  modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift')[];
}

/**
 * Canvas 操作工具类
 * 提供针对Canvas元素的交互方法，特别适用于图像标注工具
 */
export class CanvasUtils {
  constructor(private page: Page) {}

  /**
   * 等待Canvas元素渲染完成
   */
  async waitForCanvasRender(selector = 'canvas', timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      (sel) => {
        const canvas = document.querySelector(sel) as HTMLCanvasElement;
        if (!canvas) return false;
        
        // 检查Canvas是否有内容
        const context = canvas.getContext('2d');
        if (context) {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          // 检查是否有非透明像素
          for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] > 0) return true;
          }
        }
        
        // 对于WebGL canvas，检查是否初始化
        const webglContext = canvas.getContext('webgl') || canvas.getContext('webgl2');
        return webglContext !== null;
      },
      selector,
      { timeout }
    );
  }

  /**
   * 获取Canvas的实际尺寸和位置
   */
  async getCanvasBounds(selector = 'canvas'): Promise<Rect> {
    const canvas = this.page.locator(selector);
    const bounds = await canvas.boundingBox();
    if (!bounds) {
      throw new Error(`Canvas element with selector "${selector}" not found`);
    }
    return bounds;
  }

  /**
   * 将相对坐标转换为绝对坐标
   */
  async relativeToAbsolute(
    point: Point2D, 
    canvasSelector = 'canvas'
  ): Promise<Point2D> {
    const bounds = await this.getCanvasBounds(canvasSelector);
    return {
      x: bounds.x + point.x * bounds.width,
      y: bounds.y + point.y * bounds.height
    };
  }

  /**
   * 在Canvas上点击指定位置
   */
  async clickCanvas(
    point: Point2D,
    canvasSelector = 'canvas',
    options: CanvasInteractionOptions = {}
  ): Promise<void> {
    const canvas = this.page.locator(canvasSelector);
    const bounds = await this.getCanvasBounds(canvasSelector);
    
    const absolutePoint = point.x <= 1 && point.y <= 1 
      ? await this.relativeToAbsolute(point, canvasSelector)
      : { x: bounds.x + point.x, y: bounds.y + point.y };

    await canvas.click({
      position: { x: absolutePoint.x - bounds.x, y: absolutePoint.y - bounds.y },
      button: options.button || 'left',
      clickCount: options.clickCount || 1,
      delay: options.delay || 0,
      modifiers: options.modifiers || []
    });
  }

  /**
   * 在Canvas上拖拽绘制矩形
   */
  async drawRect(
    options: CanvasDrawOptions,
    canvasSelector = 'canvas'
  ): Promise<void> {
    const canvas = this.page.locator(canvasSelector);
    const bounds = await this.getCanvasBounds(canvasSelector);
    
    let startPoint = options.startPoint;
    let endPoint = options.endPoint;
    
    // 如果使用相对坐标，转换为绝对坐标
    if (options.relative) {
      startPoint = await this.relativeToAbsolute(startPoint, canvasSelector);
      endPoint = await this.relativeToAbsolute(endPoint, canvasSelector);
    }

    // 转换为Canvas内部坐标
    const canvasStart = { 
      x: startPoint.x - bounds.x, 
      y: startPoint.y - bounds.y 
    };
    const canvasEnd = { 
      x: endPoint.x - bounds.x, 
      y: endPoint.y - bounds.y 
    };

    // 执行拖拽操作
    await canvas.hover({ position: canvasStart });
    await this.page.mouse.down();
    await canvas.hover({ position: canvasEnd });
    await this.page.mouse.up();
  }

  /**
   * 获取Canvas的图像数据（用于视觉对比）
   */
  async getCanvasImageData(selector = 'canvas'): Promise<string> {
    return await this.page.evaluate((sel) => {
      const canvas = document.querySelector(sel) as HTMLCanvasElement;
      if (!canvas) throw new Error(`Canvas with selector "${sel}" not found`);
      return canvas.toDataURL();
    }, selector);
  }

  /**
   * 等待Canvas内容变化
   */
  async waitForCanvasChange(
    selector = 'canvas',
    timeout = 5000
  ): Promise<void> {
    const initialData = await this.getCanvasImageData(selector);
    
    await this.page.waitForFunction(
      ({ sel, initial }) => {
        const canvas = document.querySelector(sel) as HTMLCanvasElement;
        if (!canvas) return false;
        const currentData = canvas.toDataURL();
        return currentData !== initial;
      },
      { sel: selector, initial: initialData },
      { timeout }
    );
  }

  /**
   * 模拟Canvas缩放操作
   */
  async zoomCanvas(
    zoomPoint: Point2D,
    delta: number,
    canvasSelector = 'canvas'
  ): Promise<void> {
    const canvas = this.page.locator(canvasSelector);
    const bounds = await this.getCanvasBounds(canvasSelector);
    
    const absolutePoint = zoomPoint.x <= 1 && zoomPoint.y <= 1 
      ? await this.relativeToAbsolute(zoomPoint, canvasSelector)
      : { x: bounds.x + zoomPoint.x, y: bounds.y + zoomPoint.y };

    await canvas.hover({ 
      position: { 
        x: absolutePoint.x - bounds.x, 
        y: absolutePoint.y - bounds.y 
      }
    });
    await this.page.mouse.wheel(0, delta);
  }

  /**
   * 模拟Canvas平移操作
   */
  async panCanvas(
    startPoint: Point2D,
    endPoint: Point2D,
    canvasSelector = 'canvas'
  ): Promise<void> {
    const canvas = this.page.locator(canvasSelector);
    const bounds = await this.getCanvasBounds(canvasSelector);

    const absoluteStart = startPoint.x <= 1 && startPoint.y <= 1 
      ? await this.relativeToAbsolute(startPoint, canvasSelector)
      : { x: bounds.x + startPoint.x, y: bounds.y + startPoint.y };

    const absoluteEnd = endPoint.x <= 1 && endPoint.y <= 1 
      ? await this.relativeToAbsolute(endPoint, canvasSelector)
      : { x: bounds.x + endPoint.x, y: bounds.y + endPoint.y };

    await canvas.dragTo(canvas, {
      sourcePosition: { 
        x: absoluteStart.x - bounds.x, 
        y: absoluteStart.y - bounds.y 
      },
      targetPosition: { 
        x: absoluteEnd.x - bounds.x, 
        y: absoluteEnd.y - bounds.y 
      }
    });
  }

  /**
   * 多点绘制方法 - 用于 polyline 和 polygon
   */
  async drawMultiPoint(
    points: Point2D[],
    options: {
      close?: boolean; // 是否闭合路径（polygon）
      doubleClickToFinish?: boolean; // 是否双击完成
      canvasSelector?: string;
    } = {}
  ): Promise<void> {
    const { 
      close = false, 
      doubleClickToFinish = true, 
      canvasSelector = 'canvas' 
    } = options;

    const canvas = this.page.locator(canvasSelector);
    const bounds = await this.getCanvasBounds(canvasSelector);

    // 确保至少有2个点
    if (points.length < 2) {
      throw new Error('Multi-point drawing requires at least 2 points');
    }

    // 依次点击各个点
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const absolutePoint = point.x <= 1 && point.y <= 1 
        ? await this.relativeToAbsolute(point, canvasSelector)
        : { x: bounds.x + point.x, y: bounds.y + point.y };

      await this.page.mouse.click(absolutePoint.x, absolutePoint.y);
      await this.page.waitForTimeout(200); // 等待点击响应
    }

    // 完成绘制
    if (doubleClickToFinish) {
      const lastPoint = points[points.length - 1];
      const absoluteLastPoint = lastPoint.x <= 1 && lastPoint.y <= 1 
        ? await this.relativeToAbsolute(lastPoint, canvasSelector)
        : { x: bounds.x + lastPoint.x, y: bounds.y + lastPoint.y };

      await this.page.mouse.dblclick(absoluteLastPoint.x, absoluteLastPoint.y);
    } else if (close) {
      // 对于polygon，点击第一个点闭合
      const firstPoint = points[0];
      const absoluteFirstPoint = firstPoint.x <= 1 && firstPoint.y <= 1 
        ? await this.relativeToAbsolute(firstPoint, canvasSelector)
        : { x: bounds.x + firstPoint.x, y: bounds.y + firstPoint.y };

      await this.page.mouse.click(absoluteFirstPoint.x, absoluteFirstPoint.y);
    }

    await this.page.waitForTimeout(500);
  }

  /**
   * 绘制多边形
   */
  async drawPolygon(points: Point2D[], canvasSelector = 'canvas'): Promise<void> {
    return this.drawMultiPoint(points, { 
      close: true, 
      doubleClickToFinish: true, 
      canvasSelector 
    });
  }

  /**
   * 绘制折线
   */
  async drawPolyline(points: Point2D[], canvasSelector = 'canvas'): Promise<void> {
    return this.drawMultiPoint(points, { 
      close: false, 
      doubleClickToFinish: true, 
      canvasSelector 
    });
  }

  /**
   * ISS 工具相关的点击序列
   */
  async performIssClicks(
    clickPoints: Point2D[],
    options: {
      waitBetweenClicks?: number;
      waitForProcessing?: number;
      canvasSelector?: string;
    } = {}
  ): Promise<void> {
    const { 
      waitBetweenClicks = 500, 
      waitForProcessing = 2000, 
      canvasSelector = 'canvas' 
    } = options;

    const bounds = await this.getCanvasBounds(canvasSelector);

    for (const point of clickPoints) {
      const absolutePoint = point.x <= 1 && point.y <= 1 
        ? await this.relativeToAbsolute(point, canvasSelector)
        : { x: bounds.x + point.x, y: bounds.y + point.y };

      await this.page.mouse.click(absolutePoint.x, absolutePoint.y);
      await this.page.waitForTimeout(waitBetweenClicks);
    }

    // 等待AI处理完成
    await this.page.waitForTimeout(waitForProcessing);
  }

  /**
   * 验证特定形状是否存在于canvas上
   */
  async verifyShapeExists(shapeType: 'rectangle' | 'polygon' | 'polyline' | 'iss'): Promise<boolean> {
    return await this.page.evaluate((type) => {
      // 检查Konva场景
      const stage = (window as any).konvaStage;
      if (stage) {
        switch (type) {
          case 'rectangle':
            return stage.find('Rect').length > 0;
          case 'polygon':
            return stage.find('Polygon').length > 0;
          case 'polyline':
            return stage.find('Line').length > 0;
          case 'iss':
            // ISS可能有特殊的标识
            return stage.find('.iss-shape').length > 0 || 
                   stage.find('[data-type="iss"]').length > 0;
          default:
            return false;
        }
      }

      // 备用检查：查找DOM中的相关元素
      const shapeElements = document.querySelectorAll(`[data-shape="${type}"], [class*="${type}"]`);
      return shapeElements.length > 0;
    }, shapeType);
  }

  /**
   * 获取形状的数量
   */
  async getShapeCount(shapeType?: 'rectangle' | 'polygon' | 'polyline' | 'iss'): Promise<number> {
    return await this.page.evaluate((type) => {
      const stage = (window as any).konvaStage;
      if (stage) {
        if (!type) {
          // 返回所有形状的总数
          const allShapes = stage.find('Shape');
          return allShapes.length;
        }

        switch (type) {
          case 'rectangle':
            return stage.find('Rect').length;
          case 'polygon':
            return stage.find('Polygon').length;
          case 'polyline':
            return stage.find('Line').length;
          case 'iss':
            return stage.find('.iss-shape').length + 
                   stage.find('[data-type="iss"]').length;
          default:
            return 0;
        }
      }
      return 0;
    }, shapeType);
  }
}