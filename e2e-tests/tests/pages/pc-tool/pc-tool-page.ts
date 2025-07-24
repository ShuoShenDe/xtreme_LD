import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../../utils/base-page';
import { CanvasUtils } from '../../utils/canvas-utils';

export class PcToolPage extends BasePage {
  private canvasUtils: CanvasUtils;

  constructor(page: Page) {
    super(page);
    this.canvasUtils = new CanvasUtils(page);
  }

  // 等待PC-Tool编辑器完全加载
  async waitForEditorReady(): Promise<void> {
    // 等待Vue应用挂载
    await this.page.waitForFunction(() => {
      return document.querySelector('#app') !== null;
    }, { timeout: 15000 });

    // 等待点云编辑器容器
    await this.page.waitForFunction(() => {
      const container = document.querySelector('.pc-editor, [class*="pc-editor"], [class*="point-cloud"]');
      return container !== null;
    }, { timeout: 20000 });

    // 等待WebGL canvas
    await this.page.waitForFunction(() => {
      const canvases = document.querySelectorAll('canvas');
      return canvases.length > 0;
    }, { timeout: 15000 });

    // 等待编辑器对象可用
    await this.page.waitForFunction(() => {
      return typeof (window as any).editor !== 'undefined' &&
             (window as any).editor !== null &&
             typeof (window as any).editor.pc !== 'undefined';
    }, { timeout: 20000 });

    // 等待工具栏加载
    await this.page.waitForFunction(() => {
      const toolElements = document.querySelectorAll('[class*="tool"], button');
      return toolElements.length > 5;
    }, { timeout: 15000 });

    // 等待额外时间确保所有初始化完成
    await this.page.waitForTimeout(2000);
  }

  // 获取主要的3D渲染canvas
  async getMainCanvas(): Promise<Locator> {
    // 尝试多种可能的canvas选择器
    const selectors = [
      'canvas:first-child',
      '.main-canvas',
      '[class*="main"] canvas',
      '[class*="render"] canvas',
      'canvas'
    ];

    for (const selector of selectors) {
      const canvas = this.page.locator(selector);
      if (await canvas.count() > 0) {
        return canvas.first();
      }
    }

    throw new Error('Main canvas not found');
  }

  // 选择3D polyline工具
  async select3DPolylineTool(): Promise<void> {
    await this.selectTool('polyline-3d');
  }

  // 选择3D polygon工具
  async select3DPolygonTool(): Promise<void> {
    await this.selectTool('polygon-3d');
  }

  // 通用工具选择方法
  private async selectTool(toolName: string): Promise<void> {
    // 等待工具栏可用
    await this.page.waitForTimeout(1000);

    // 尝试多种工具选择方式
    const toolSelectors = [
      `[data-tool="${toolName}"]`,
      `[data-action="create${toolName.replace('-', '')}"]`,
      `[class*="${toolName}"]`,
      `button[title*="Polyline"]`,
      `button[title*="Polygon"]`,
      `[aria-label*="${toolName}"]`
    ];

    let toolSelected = false;

    for (const selector of toolSelectors) {
      try {
        const element = this.page.locator(selector);
        const count = await element.count();
        if (count > 0) {
          const first = element.first();
          if (await first.isVisible() && await first.isEnabled()) {
            await first.click();
            toolSelected = true;
            console.log(`Tool selected with selector: ${selector}`);
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }

    if (!toolSelected) {
      // 尝试通过ActionManager选择工具
      await this.page.evaluate((tool) => {
        const editor = (window as any).editor;
        if (editor && editor.actionManager) {
          // 根据工具类型执行相应的动作
          if (tool === 'polyline-3d') {
            editor.actionManager.execute('createPolyline3D');
          } else if (tool === 'polygon-3d') {
            editor.actionManager.execute('createPolygon3D');
          }
        }
      }, toolName);
    }

    await this.page.waitForTimeout(500);
  }

  // 创建3D polyline
  async create3DPolyline(points: Array<{x: number, y: number}>): Promise<void> {
    const canvas = await this.getMainCanvas();
    await canvas.scrollIntoViewIfNeeded();
    
    const bounds = await canvas.boundingBox();
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    console.log(`Creating 3D polyline with ${points.length} points`);

    // 依次点击每个点
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const absoluteX = bounds.x + bounds.width * point.x;
      const absoluteY = bounds.y + bounds.height * point.y;
      
      console.log(`Clicking point ${i + 1}: (${absoluteX}, ${absoluteY})`);
      await this.page.mouse.click(absoluteX, absoluteY);
      await this.page.waitForTimeout(300);
    }

    // 完成polyline创建 - 双击或按Enter
    console.log('Finishing polyline creation...');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);

    // 选择默认类别
    await this.selectDefaultCategory();
  }

  // 创建3D polygon
  async create3DPolygon(points: Array<{x: number, y: number}>): Promise<void> {
    const canvas = await this.getMainCanvas();
    await canvas.scrollIntoViewIfNeeded();
    
    const bounds = await canvas.boundingBox();
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    console.log(`Creating 3D polygon with ${points.length} points`);

    // 依次点击每个点
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const absoluteX = bounds.x + bounds.width * point.x;
      const absoluteY = bounds.y + bounds.height * point.y;
      
      console.log(`Clicking point ${i + 1}: (${absoluteX}, ${absoluteY})`);
      await this.page.mouse.click(absoluteX, absoluteY);
      await this.page.waitForTimeout(300);
    }

    // 完成polygon创建 - Enter键或点击第一个点
    console.log('Finishing polygon creation...');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);

    // 选择默认类别
    await this.selectDefaultCategory();
  }

  // 选择默认类别
  private async selectDefaultCategory(): Promise<void> {
    const categorySelectors = [
      '.category-list li:first-child',
      '.class-list li:first-child',
      '[class*="category"] button:first-child',
      '[class*="class"] button:first-child',
      '.annotation-category:first-child'
    ];

    for (const selector of categorySelectors) {
      const count = await this.page.locator(selector).count();
      if (count > 0) {
        console.log(`Selecting category with: ${selector}`);
        await this.page.locator(selector).first().click();
        await this.page.waitForTimeout(500);
        break;
      }
    }
  }

  // 通过点击选择polyline
  async selectPolylineByClick(point: {x: number, y: number}): Promise<boolean> {
    return await this.selectObjectByClick(point, 'polyline');
  }

  // 通过点击选择polygon
  async selectPolygonByClick(point: {x: number, y: number}): Promise<boolean> {
    return await this.selectObjectByClick(point, 'polygon');
  }

  // 通过点击选择任意对象
  async selectAnyObjectByClick(point: {x: number, y: number}): Promise<boolean> {
    return await this.selectObjectByClick(point, 'any');
  }

  // 通用对象选择方法
  private async selectObjectByClick(point: {x: number, y: number}, objectType: string): Promise<boolean> {
    // 首先切换到选择模式
    await this.switchToSelectMode();

    const canvas = await this.getMainCanvas();
    const bounds = await canvas.boundingBox();
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    const absoluteX = bounds.x + bounds.width * point.x;
    const absoluteY = bounds.y + bounds.height * point.y;

    console.log(`Attempting to select ${objectType} at (${absoluteX}, ${absoluteY})`);

    // 点击目标位置
    await this.page.mouse.click(absoluteX, absoluteY);
    await this.page.waitForTimeout(500);

    // 检查是否选中了对象
    const isSelected = await this.page.evaluate(() => {
      const editor = (window as any).editor;
      if (editor && editor.pc && editor.pc.selection) {
        return editor.pc.selection.length > 0;
      }
      return false;
    });

    return isSelected;
  }

  // 切换到选择模式
  private async switchToSelectMode(): Promise<void> {
    // 尝试多种方式切换到选择模式
    const selectSelectors = [
      '[data-tool="select"]',
      '[data-action="select"]',
      '.select-tool',
      'button[title*="Select"]',
      '[aria-label*="select"]'
    ];

    let switched = false;

    for (const selector of selectSelectors) {
      try {
        const element = this.page.locator(selector);
        if (await element.count() > 0 && await element.first().isVisible()) {
          await element.first().click();
          switched = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!switched) {
      // 使用ESC键或直接调用editor方法
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(300);
    }
  }

  // 获取polyline数量
  async getPolylineCount(): Promise<number> {
    return await this.page.evaluate(() => {
      const editor = (window as any).editor;
      if (editor && editor.pc && editor.pc.annotate3D && editor.pc.annotate3D.children) {
        return editor.pc.annotate3D.children.filter((obj: any) => 
          obj.constructor.name === 'Polyline3D'
        ).length;
      }
      return 0;
    });
  }

  // 获取polygon数量
  async getPolygonCount(): Promise<number> {
    return await this.page.evaluate(() => {
      const editor = (window as any).editor;
      if (editor && editor.pc && editor.pc.annotate3D && editor.pc.annotate3D.children) {
        return editor.pc.annotate3D.children.filter((obj: any) => 
          obj.constructor.name === 'Polygon3D'
        ).length;
      }
      return 0;
    });
  }

  // 验证选中状态
  async verifySelectionState(expectedType: 'polyline' | 'polygon' | 'any'): Promise<{
    isSelected: boolean;
    selectedType: string | null;
    selectedCount: number;
  }> {
    return await this.page.evaluate(() => {
      const editor = (window as any).editor;
      if (editor && editor.pc && editor.pc.selection) {
        const selection = editor.pc.selection;
        const isSelected = selection.length > 0;
        const selectedType = isSelected ? selection[0].constructor.name : null;
        const selectedCount = selection.length;

        return {
          isSelected,
          selectedType,
          selectedCount
        };
      }
      
      return {
        isSelected: false,
        selectedType: null,
        selectedCount: 0
      };
    });
  }

  // 获取当前选中的对象信息
  async getSelectedObjectInfo(): Promise<any> {
    return await this.page.evaluate(() => {
      const editor = (window as any).editor;
      if (editor && editor.pc && editor.pc.selection && editor.pc.selection.length > 0) {
        const selected = editor.pc.selection[0];
        return {
          type: selected.constructor.name,
          visible: selected.visible,
          points: selected.points ? selected.points.length : 0,
          position: selected.position ? {
            x: selected.position.x,
            y: selected.position.y,
            z: selected.position.z
          } : null
        };
      }
      return null;
    });
  }

  // 清除所有选中
  async clearSelection(): Promise<void> {
    await this.page.evaluate(() => {
      const editor = (window as any).editor;
      if (editor && editor.pc) {
        editor.pc.selectObject(null);
      }
    });
    await this.page.waitForTimeout(300);
  }
}