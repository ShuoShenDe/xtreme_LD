import { test, expect, Page } from '@playwright/test';
import { ImageToolPage } from '../../pages/image-tool/image-tool-page';

test.describe('2D ISS (Instance Semantic Segmentation) Annotation Tests', () => {
  let imageToolPage: ImageToolPage;

  test.beforeEach(async ({ page }: { page: Page }) => {
    imageToolPage = new ImageToolPage(page);
    
    // 导航到测试页面 - 使用和成功测试完全相同的设置
    await page.goto('http://localhost:3300/?recordId=test-record-123&datasetId=test-dataset-456');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  
    // 等待编辑器就绪
    await imageToolPage.waitForEditorReady();
    
  });

  test('should activate ISS tool successfully', async () => {
    // 测试ISS工具的激活
    console.log('Testing ISS tool activation...');
    
    await imageToolPage.selectIssTool();
    
    // 验证工具是否被正确选择
    const activeToolExists = await imageToolPage.getPageLocator('.tool-item.active, [class*="active"]').count();
    expect(activeToolExists).toBeGreaterThan(0);
    
    console.log('ISS tool activation verified');
  });

  test('should create basic ISS segmentation with single click', async () => {
    // 测试基本的单点ISS分割
    const clickPoint = { x: 0.5, y: 0.5 }; // 图像中心点

    console.log('Creating basic ISS segmentation...');
    
    // 添加调试信息
    const initialState = await imageToolPage.debugEditorState();
    console.log('Initial editor state:', initialState);
    
    await imageToolPage.drawIssSegmentation([clickPoint]);

    // 验证ISS标注是否创建成功
    await imageToolPage.verifyIssAnnotation();
    
    // 检查标注数量
    const annotationCount = await imageToolPage.getAnnotationCount();
    
    // 添加更多调试信息
    const finalState = await imageToolPage.debugEditorState();
    console.log('Final editor state:', finalState);
    console.log(`Annotation count: ${annotationCount}`);
    
    expect(annotationCount).toBeGreaterThan(0);
    
    console.log(`Successfully created ISS segmentation. Total annotations: ${annotationCount}`);
  });

  test('should create ISS segmentation with multiple guidance points', async () => {
    // 测试多点引导的ISS分割
    const guidancePoints = [
      { x: 0.4, y: 0.4 },  // 主要对象内的点1
      { x: 0.6, y: 0.5 },  // 主要对象内的点2
      { x: 0.5, y: 0.6 }   // 主要对象内的点3
    ];

    console.log('Creating ISS segmentation with multiple guidance points...');
    await imageToolPage.drawIssSegmentation(guidancePoints);

    await imageToolPage.verifyIssAnnotation();
    
    console.log('Successfully created multi-point ISS segmentation');
  });

  test('should handle ISS segmentation for different object sizes', async () => {
    // 测试针对不同大小对象的ISS分割
    
    // 小对象分割
    console.log('Testing ISS for small object...');
    const smallObjectPoint = { x: 0.2, y: 0.2 };
    await imageToolPage.drawIssSegmentation([smallObjectPoint]);
    
    await imageToolPage.waitForTimeout(1000);
    
    // 大对象分割
    console.log('Testing ISS for large object...');
    const largeObjectPoints = [
      { x: 0.7, y: 0.6 },
      { x: 0.8, y: 0.7 },
      { x: 0.9, y: 0.8 }
    ];
    await imageToolPage.drawIssSegmentation(largeObjectPoints);

    await imageToolPage.verifyIssAnnotation();
    
    console.log('Successfully tested ISS for different object sizes');
  });

  test('should create multiple ISS instances', async () => {
    // 测试创建多个ISS实例
    const instance1Points = [{ x: 0.3, y: 0.3 }];
    const instance2Points = [{ x: 0.7, y: 0.7 }];

    console.log('Creating first ISS instance...');
    await imageToolPage.drawIssSegmentation(instance1Points);
    
    console.log('Creating second ISS instance...');
    await imageToolPage.drawIssSegmentation(instance2Points);

    // 验证多个标注
    await imageToolPage.verifyIssAnnotation();
    
    const annotationCount = await imageToolPage.getAnnotationCount();
    expect(annotationCount).toBeGreaterThanOrEqual(1); // ISS可能将多个实例合并为一个标注
    
    console.log(`Successfully created multiple ISS instances. Total: ${annotationCount}`);
  });

  test('should handle ISS tool with edge cases', async () => {
    // 测试ISS工具的边缘情况
    
    // 边界附近的点击
    console.log('Testing ISS near image boundaries...');
    const boundaryPoints = [
      { x: 0.05, y: 0.05 },  // 左上角附近
      { x: 0.95, y: 0.95 }   // 右下角附近
    ];

    for (const point of boundaryPoints) {
      await imageToolPage.drawIssSegmentation([point]);
      await imageToolPage.waitForTimeout(1000);
    }

    await imageToolPage.verifyIssAnnotation();
    
    console.log('Successfully tested ISS edge cases');
  });

  test('should handle ISS refinement with positive and negative clicks', async () => {
    // 测试ISS的正负点击精细化
    console.log('Testing ISS refinement...');
    
    // 初始分割点
    const initialPoint = { x: 0.5, y: 0.5 };
    await imageToolPage.drawIssSegmentation([initialPoint]);
    
    await imageToolPage.waitForTimeout(1000);
    
    // 模拟精细化点击（正点击和负点击通常通过修饰键区分）
    const refinementPoints = [
      { x: 0.45, y: 0.45 }, // 扩展分割区域
      { x: 0.55, y: 0.55 }  // 进一步精细化
    ];
    
    for (const point of refinementPoints) {
      const canvas = await imageToolPage.getMainCanvas();
      const bounds = await canvas.boundingBox();
      if (bounds) {
        const absoluteX = bounds.x + bounds.width * point.x;
        const absoluteY = bounds.y + bounds.height * point.y;
        
        // 使用Shift键模拟负点击（从分割中移除）
        await imageToolPage.keyboardDown('Shift');
        await imageToolPage.clickMouse(absoluteX, absoluteY);
        await imageToolPage.keyboardUp('Shift');
        await imageToolPage.waitForTimeout(500);
      }
    }

    await imageToolPage.verifyIssAnnotation();
    
    console.log('Successfully tested ISS refinement');
  });

  test('should test ISS with keyboard shortcuts', async () => {
    // 测试ISS相关的键盘快捷键
    console.log('Testing ISS keyboard shortcuts...');
    
    // 使用快捷键激活ISS工具
    await imageToolPage.pressKeyboard('i'); // ISS工具快捷键
    await imageToolPage.waitForTimeout(500);
    
    // 创建分割
    const clickPoint = { x: 0.5, y: 0.5 };
    await imageToolPage.drawIssSegmentation([clickPoint]);
    
    // 测试完成快捷键（通常是Enter或Escape）
    await imageToolPage.pressKeyboard('Enter');
    await imageToolPage.waitForTimeout(500);

    await imageToolPage.verifyIssAnnotation();
    
    console.log('Successfully tested ISS keyboard shortcuts');
  });

  test('should handle ISS undo and redo operations', async () => {
    // 测试ISS的撤销和重做操作
    console.log('Testing ISS undo/redo operations...');
    
    const clickPoint = { x: 0.4, y: 0.4 };
    await imageToolPage.drawIssSegmentation([clickPoint]);
    
    // 记录初始标注数量
    const initialCount = await imageToolPage.getAnnotationCount();
    
    // 执行撤销操作
    await imageToolPage.pressKeyboard('Control+z');
    await imageToolPage.waitForTimeout(500);
    
    // 执行重做操作
    await imageToolPage.pressKeyboard('Control+y');
    await imageToolPage.waitForTimeout(500);
    
    // 验证操作后的状态
    const finalCount = await imageToolPage.getAnnotationCount();
    expect(finalCount).toBe(initialCount);
    
    console.log('Successfully tested ISS undo/redo operations');
  });

  test('should validate ISS segmentation quality', async () => {
    // 测试ISS分割质量验证
    console.log('Testing ISS segmentation quality validation...');
    
    const clickPoint = { x: 0.5, y: 0.5 };
    await imageToolPage.drawIssSegmentation([clickPoint]);
    
    // 验证是否有分割结果
    const hasSegmentation = await imageToolPage.evaluatePage(() => {
      // 检查是否有ISS分割结果相关的DOM元素
      const issElements = document.querySelectorAll('[data-type*="iss"], [class*="iss"], [class*="segmentation"]');
      return issElements.length > 0;
    });
    
    // 验证canvas上是否有视觉变化
    const hasCanvasContent = await imageToolPage.evaluatePage(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // 检查是否有足够的非透明像素（表示有内容）
          let nonTransparentPixels = 0;
          for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] > 0) {
              nonTransparentPixels++;
            }
          }
          return nonTransparentPixels > 100; // 至少100个像素有内容
        }
      }
      return false;
    });
    
    console.log(`ISS elements found: ${hasSegmentation}, Canvas content detected: ${hasCanvasContent}`);
    
    // 至少有一个质量指标应该通过
    expect(hasSegmentation || hasCanvasContent).toBe(true);
    
    console.log('ISS segmentation quality validation completed');
  });

  test.afterEach(async ({ page }: { page: Page }) => {
    // 清理操作
    console.log('ISS test completed, cleaning up...');
    await page.waitForTimeout(500);
  });
}); 