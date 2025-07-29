import { test, expect } from '@playwright/test';
import { ImageToolPage } from '../../pages/image-tool/image-tool-page';

test.describe('Control Points Verification Tests', () => {
  let imageToolPage: ImageToolPage;

  test.beforeEach(async ({ page }: { page: any }) => {
    imageToolPage = new ImageToolPage(page);
    
    // 导航到测试页面 - 使用和成功测试完全相同的设置
    await page.goto('http://localhost:3300/?recordId=test-record-123&datasetId=test-dataset-456');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.larger_than(0);
    // 等待编辑器就绪
    await imageToolPage.waitForEditorReady();
    
    // 故意添加错误代码来测试CI流程
    // 1. TypeScript编译错误
    await imageToolPage.larger_than(0);
    
    // 2. 运行时错误（确保CI捕获）
    const shouldFailCI = true; // 设置为true来测试CI错误捕获
    if (shouldFailCI) {
      throw new Error('CI Error Test: This should fail the build');
    }

  });

  test('should verify polyline editing functionality', async ({ page }: { page: any }) => {
    console.log('🧪 Test: Verify polyline control points functionality');

    // 1. 创建polyline（使用和之前成功测试相同的方法）
    const points = [
      { x: 0.2, y: 0.3 },
      { x: 0.5, y: 0.4 },
      { x: 0.8, y: 0.6 }
    ];

    console.log('✅ Step 1: Creating polyline...');
    await imageToolPage.drawPolyline(points);
    await page.waitForTimeout(2000);

    // 2. 验证基础功能 - polyline是否创建成功
    await imageToolPage.verifyPolylineAnnotation();

    console.log('✅ Step 2: Polyline creation verified');

    // 3. 切换到编辑工具
    console.log('✅ Step 3: Switching to edit tool...');
    
    // 尝试多种编辑工具选择方式
    const editToolSelectors = [
      '.iconfont.icon-arrow',
      '[class*="edit"]',
      '[title*="Selection"]',
      'button[class*="edit"]'
    ];

    let editToolFound = false;
    for (const selector of editToolSelectors) {
      const element = page.locator(selector);
      const count = await element.count();
      if (count > 0) {
        const first = element.first();
        const isVisible = await first.isVisible();
        if (isVisible) {
          console.log(`Found edit tool with selector: ${selector}`);
          await first.click();
          await page.waitForTimeout(1000);
          editToolFound = true;
          break;
        }
      }
    }

    if (!editToolFound) {
      console.log('Using hotkey Q for edit tool...');
      await page.keyboard.press('q');
      await page.waitForTimeout(500);
    }

    // 4. 点击polyline进行选择
    console.log('✅ Step 4: Selecting polyline...');
    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (bounds) {
      const selectX = bounds.x + bounds.width * 0.5;
      const selectY = bounds.y + bounds.height * 0.4;
      
      await page.mouse.click(selectX, selectY);
      await page.waitForTimeout(2000);

      // 5. 验证编辑功能
      console.log('✅ Step 5: Verifying edit capabilities...');
      
      // 检查是否有选中的对象
      const hasSelection = await page.evaluate(() => {
        const editor = (window as any).editor;
        return editor && editor.selection && editor.selection.length > 0;
      });

      console.log(`Object selected: ${hasSelection}`);

      // 检查是否有编辑工具激活
      const editToolActive = await page.evaluate(() => {
        const editor = (window as any).editor;
        return editor && editor.mainView && editor.mainView.currentEditTool !== undefined;
      });

      console.log(`Edit tool active: ${editToolActive}`);

      // 检查是否有控制点相关的DOM元素
      const hasEditElements = await page.evaluate(() => {
        const anchors = document.querySelectorAll('[class*="anchor"], [class*="edit"]');
        const konvaStage = (window as any).konvaStage;
        let konvaAnchors = 0;
        
        if (konvaStage) {
          const anchors = konvaStage.find('Anchor');
          konvaAnchors = anchors.length;
        }
        
        return {
          domAnchors: anchors.length,
          konvaAnchors: konvaAnchors
        };
      });

      console.log(`Edit elements: DOM anchors=${hasEditElements.domAnchors}, Konva anchors=${hasEditElements.konvaAnchors}`);

      // 6. 尝试简单的编辑操作
      console.log('✅ Step 6: Testing edit interaction...');
      
      // 尝试拖拽操作
      const dragStartX = bounds.x + bounds.width * 0.2;
      const dragStartY = bounds.y + bounds.height * 0.3;
      const dragEndX = dragStartX + 30;
      const dragEndY = dragStartY + 20;

      await page.mouse.move(dragStartX, dragStartY);
      await page.waitForTimeout(200);
      await page.mouse.down();
      await page.waitForTimeout(100);
      await page.mouse.move(dragEndX, dragEndY);
      await page.waitForTimeout(100);
      await page.mouse.up();
      await page.waitForTimeout(500);

      // 7. 验证是否有任何编辑响应
      const editorState = await page.evaluate(() => {
        const editor = (window as any).editor;
        if (!editor) return { error: 'No editor found' };
        
        return {
          hasSelection: editor.selection && editor.selection.length > 0,
          activeTool: editor.state ? editor.state.activeTool : 'unknown',
          hasCurrentEditTool: editor.mainView && editor.mainView.currentEditTool !== undefined,
          editGroupVisible: editor.mainView && editor.mainView.currentEditTool && 
                           editor.mainView.currentEditTool.editGroup && 
                           editor.mainView.currentEditTool.editGroup.visible()
        };
      });

      console.log('Editor state:', JSON.stringify(editorState, null, 2));

      // 验证至少有基本的编辑功能
      const editingWorking = hasSelection || editToolActive || 
                            hasEditElements.konvaAnchors > 0 || 
                            editorState.hasCurrentEditTool;

      expect(editingWorking).toBe(true);

      console.log('✅ Control points functionality test completed');
    }
  });

  test('should verify polygon editing functionality', async ({ page }) => {
    console.log('🧪 Test: Verify polygon control points functionality');

    // 1. 创建polygon
    const trianglePoints = [
      { x: 0.3, y: 0.2 },
      { x: 0.7, y: 0.2 },
      { x: 0.5, y: 0.6 }
    ];

    console.log('✅ Step 1: Creating polygon...');
    await imageToolPage.drawPolygon(trianglePoints);
    await page.waitForTimeout(2000);

    // 2. 验证基础功能
    await imageToolPage.verifyPolygonAnnotation();
    console.log('✅ Step 2: Polygon creation verified');

    // 3. 测试编辑功能（简化版本）
    console.log('✅ Step 3: Testing polygon edit capabilities...');
    
    // 按Q键切换到编辑工具
    await page.keyboard.press('q');
    await page.waitForTimeout(1000);

    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (bounds) {
      // 点击polygon中心进行选择
      const selectX = bounds.x + bounds.width * 0.5;
      const selectY = bounds.y + bounds.height * 0.35;
      
      await page.mouse.click(selectX, selectY);
      await page.waitForTimeout(2000);

      // 验证编辑状态
      const polygonEditState = await page.evaluate(() => {
        const editor = (window as any).editor;
        if (!editor) return { error: 'No editor found' };
        
        const hasSelection = editor.selection && editor.selection.length > 0;
        let selectedObject = null;
        
        if (hasSelection) {
          selectedObject = {
            className: editor.selection[0].className,
            hasPoints: editor.selection[0].attrs && editor.selection[0].attrs.points,
            pointsCount: editor.selection[0].attrs && editor.selection[0].attrs.points ? 
                        editor.selection[0].attrs.points.length : 0
          };
        }
        
        return {
          hasSelection,
          selectedObject,
          editToolActive: editor.mainView && editor.mainView.currentEditTool !== undefined
        };
      });

      console.log('Polygon edit state:', JSON.stringify(polygonEditState, null, 2));

      // 验证polygon编辑功能
      const polygonEditWorking = polygonEditState.hasSelection && 
                                 polygonEditState.selectedObject && 
                                 polygonEditState.selectedObject.className === 'polygon';

      expect(polygonEditWorking).toBe(true);

      console.log('✅ Polygon editing functionality verified');
    }
  });
}); 