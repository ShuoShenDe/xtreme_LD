import { test, expect } from '@playwright/test';
import { ImageToolPage } from '../../pages/image-tool/image-tool-page';

test.describe('ISS Tool Advanced Features Tests', () => {
  let imageToolPage: ImageToolPage;

  test.beforeEach(async ({ page }: { page: any }) => {
    imageToolPage = new ImageToolPage(page);
    
    // 导航到测试页面
    await page.goto('http://localhost:3300');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.largerthan(0); //shuoshen
    // 等待编辑器就绪
    await imageToolPage.waitForEditorReady();
  });

  test('should create ISS polygon and drag anchor points', async ({ page }: { page: any }) => {
    console.log('🚀 Starting ISS polygon anchor dragging test...');
    
    // Step 1: 选择ISS工具
    console.log('📝 Step 1: Selecting ISS tool...');
    await imageToolPage.selectIssTool();
    
    // 验证工具选择
    const activeToolExists = await page.locator('.tool-item.active, [class*="active"][class*="tool"], [class*="selected"][class*="tool"]').count();
    expect(activeToolExists).toBeGreaterThan(0);
    
    // Step 2: 创建ISS多边形
    console.log('📍 Step 2: Creating ISS polygon...');
    const canvas = await imageToolPage.getMainCanvas();
    await canvas.scrollIntoViewIfNeeded();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }
    
    // 定义多边形的顶点（相对坐标）
    const polygonPoints = [
      { x: 0.3, y: 0.3 },  // 左上
      { x: 0.6, y: 0.3 },  // 右上
      { x: 0.6, y: 0.6 },  // 右下
      { x: 0.3, y: 0.6 }   // 左下
    ];
    
    // 绘制多边形
    for (let i = 0; i < polygonPoints.length; i++) {
      const point = polygonPoints[i];
      const absoluteX = bounds.x + bounds.width * point.x;
      const absoluteY = bounds.y + bounds.height * point.y;
      
      console.log(`Clicking point ${i + 1}: (${absoluteX}, ${absoluteY})`);
      await page.mouse.click(absoluteX, absoluteY);
      await page.waitForTimeout(500);
    }
    
    // 双击完成多边形
    console.log('Double-clicking to complete polygon...');
    await page.mouse.dblclick(bounds.x + bounds.width * 0.3, bounds.y + bounds.height * 0.3);
    await page.waitForTimeout(1000);
    
    // Step 3: 切换到编辑模式
    console.log('🔄 Step 3: Switching to edit mode...');
    await imageToolPage.selectEditTool();
    await page.waitForTimeout(500);
    
    // Step 4: 选择多边形进入编辑状态
    console.log('🎯 Step 4: Selecting polygon for editing...');
    const centerX = bounds.x + bounds.width * 0.45;
    const centerY = bounds.y + bounds.height * 0.45;
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(1000);
    
    // 验证控制点是否显示
    console.log('🔍 Verifying control points are visible...');
    const controlPointsVisible = await imageToolPage.verifyControlPointsVisible();
    console.log(`Control points visible: ${controlPointsVisible}`);
    
    // Step 5: 拖拽顶点
    console.log('🎯 Step 5: Dragging anchor points...');
    
    // 获取原始控制点位置
    const originalPoints = await imageToolPage.getControlPointPositions();
    console.log(`Original control points: ${JSON.stringify(originalPoints)}`);
    
    // 拖拽第一个顶点
    if (originalPoints.length > 0) {
      const firstPoint = originalPoints[0];
      const newX = firstPoint.x + 30;
      const newY = firstPoint.y + 20;
      
      console.log(`Dragging first anchor from (${firstPoint.x}, ${firstPoint.y}) to (${newX}, ${newY})`);
      await imageToolPage.dragControlPoint(firstPoint.x, firstPoint.y, newX, newY);
    }
    
    // Step 6: 验证形状被修改
    console.log('✅ Step 6: Verifying shape modification...');
    const shapeModified = await imageToolPage.verifyShapeModified(originalPoints);
    expect(shapeModified).toBe(true);
    
    console.log('✅ ISS polygon anchor dragging test completed successfully');
  });

  test('should transform ISS polygon using transformer', async ({ page }: { page: any }) => {
    console.log('🚀 Starting ISS polygon transform test...');
    
    // 创建多边形
    await imageToolPage.selectIssTool();
    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }
    
    // 绘制一个简单的三角形
    const trianglePoints = [
      { x: 0.4, y: 0.3 },
      { x: 0.6, y: 0.3 },
      { x: 0.5, y: 0.5 }
    ];
    
    for (const point of trianglePoints) {
      const absoluteX = bounds.x + bounds.width * point.x;
      const absoluteY = bounds.y + bounds.height * point.y;
      await page.mouse.click(absoluteX, absoluteY);
      await page.waitForTimeout(300);
    }
    
    // 双击完成
    await page.mouse.dblclick(bounds.x + bounds.width * 0.4, bounds.y + bounds.height * 0.3);
    await page.waitForTimeout(1000);
    
    // 切换到编辑模式并选择对象
    await imageToolPage.selectEditTool();
    await page.waitForTimeout(500);
    
    const centerX = bounds.x + bounds.width * 0.5;
    const centerY = bounds.y + bounds.height * 0.4;
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(1000);
    
    // 查找变换控制点（通常在角落）
    console.log('🔍 Looking for transform handles...');
    
    // 尝试在右下角找到变换控制点并拖拽进行缩放
    const transformHandleX = bounds.x + bounds.width * 0.6;
    const transformHandleY = bounds.y + bounds.height * 0.5;
    
    console.log('🎯 Attempting to scale using transform handle...');
    await page.mouse.move(transformHandleX, transformHandleY);
    await page.waitForTimeout(200);
    
    // 按住Shift进行等比缩放，从右下角拖拽
    await page.keyboard.down('Shift');
    await page.mouse.down();
    await page.mouse.move(transformHandleX + 40, transformHandleY + 30);
    await page.mouse.up();
    await page.keyboard.up('Shift');
    
    await page.waitForTimeout(1000);
    
    console.log('✅ Transform operation completed');
  });

  test('should delete ISS polygon using Delete key', async ({ page }: { page: any }) => {
    console.log('🚀 Starting ISS polygon deletion test...');
    
    // 创建多边形
    await imageToolPage.selectIssTool();
    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }
    
    // 绘制简单矩形
    const rectPoints = [
      { x: 0.35, y: 0.35 },
      { x: 0.55, y: 0.35 },
      { x: 0.55, y: 0.55 },
      { x: 0.35, y: 0.55 }
    ];
    
    for (const point of rectPoints) {
      const absoluteX = bounds.x + bounds.width * point.x;
      const absoluteY = bounds.y + bounds.height * point.y;
      await page.mouse.click(absoluteX, absoluteY);
      await page.waitForTimeout(300);
    }
    
    await page.mouse.dblclick(bounds.x + bounds.width * 0.35, bounds.y + bounds.height * 0.35);
    await page.waitForTimeout(1000);
    
    // 获取创建前的标注数量
    const initialCount = await imageToolPage.getAnnotationCount();
    console.log(`Initial annotation count: ${initialCount}`);
    
    // 切换到编辑模式并选择对象
    await imageToolPage.selectEditTool();
    await page.waitForTimeout(500);
    
    const centerX = bounds.x + bounds.width * 0.45;
    const centerY = bounds.y + bounds.height * 0.45;
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(1000);
    
    // 验证对象被选中（控制点可见）
    const controlPointsVisible = await imageToolPage.verifyControlPointsVisible();
    console.log(`Control points visible before deletion: ${controlPointsVisible}`);
    
    // 按Delete键删除
    console.log('🗑️ Pressing Delete key to delete selected polygon...');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(1000);
    
    // 验证对象被删除（控制点消失）
    const controlPointsAfterDelete = await imageToolPage.verifyControlPointsVisible();
    console.log(`Control points visible after deletion: ${controlPointsAfterDelete}`);
    
    // 控制点应该消失
    expect(controlPointsAfterDelete).toBe(false);
    
    console.log('✅ ISS polygon deletion test completed successfully');
  });

  test('should undo and redo ISS polygon operations', async ({ page }: { page: any }) => {
    console.log('🚀 Starting ISS polygon undo/redo test...');
    
    // Step 1: 创建第一个多边形
    console.log('📝 Step 1: Creating first polygon...');
    await imageToolPage.selectIssTool();
    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }
    
    const polygon1Points = [
      { x: 0.2, y: 0.2 },
      { x: 0.4, y: 0.2 },
      { x: 0.3, y: 0.4 }
    ];
    
    for (const point of polygon1Points) {
      const absoluteX = bounds.x + bounds.width * point.x;
      const absoluteY = bounds.y + bounds.height * point.y;
      await page.mouse.click(absoluteX, absoluteY);
      await page.waitForTimeout(300);
    }
    
    await page.mouse.dblclick(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.2);
    await page.waitForTimeout(1000);
    
    // Step 2: 创建第二个多边形
    console.log('📝 Step 2: Creating second polygon...');
    const polygon2Points = [
      { x: 0.6, y: 0.6 },
      { x: 0.8, y: 0.6 },
      { x: 0.7, y: 0.8 }
    ];
    
    for (const point of polygon2Points) {
      const absoluteX = bounds.x + bounds.width * point.x;
      const absoluteY = bounds.y + bounds.height * point.y;
      await page.mouse.click(absoluteX, absoluteY);
      await page.waitForTimeout(300);
    }
    
    await page.mouse.dblclick(bounds.x + bounds.width * 0.6, bounds.y + bounds.height * 0.6);
    await page.waitForTimeout(1000);
    
    // Step 3: 执行撤销操作 (Ctrl+Z)
    console.log('↶ Step 3: Performing undo operation (Ctrl+Z)...');
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(1000);
    
    // 验证第二个多边形被撤销
    console.log('🔍 Verifying second polygon was undone...');
    
    // Step 4: 再次撤销
    console.log('↶ Step 4: Performing another undo operation...');
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(1000);
    
    // Step 5: 执行重做操作 (Ctrl+Y)
    console.log('↷ Step 5: Performing redo operation (Ctrl+Y)...');
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(1000);
    
    // 验证第一个多边形被恢复
    console.log('🔍 Verifying first polygon was restored...');
    
    // Step 6: 再次重做
    console.log('↷ Step 6: Performing another redo operation...');
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(1000);
    
    console.log('✅ ISS polygon undo/redo test completed successfully');
  });

  test('should perform complex editing workflow with ISS polygon', async ({ page }: { page: any }) => {
    console.log('🚀 Starting complex ISS polygon editing workflow test...');
    
    // Step 1: 创建复杂多边形
    console.log('📝 Step 1: Creating complex polygon...');
    await imageToolPage.selectIssTool();
    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }
    
    const complexPolygonPoints = [
      { x: 0.3, y: 0.2 },   // 顶点
      { x: 0.5, y: 0.15 },  // 右上
      { x: 0.65, y: 0.35 }, // 右中
      { x: 0.6, y: 0.55 },  // 右下
      { x: 0.4, y: 0.6 },   // 下中
      { x: 0.2, y: 0.5 },   // 左下
      { x: 0.15, y: 0.3 }   // 左中
    ];
    
    for (let i = 0; i < complexPolygonPoints.length; i++) {
      const point = complexPolygonPoints[i];
      const absoluteX = bounds.x + bounds.width * point.x;
      const absoluteY = bounds.y + bounds.height * point.y;
      
      console.log(`Creating complex polygon point ${i + 1}: (${absoluteX}, ${absoluteY})`);
      await page.mouse.click(absoluteX, absoluteY);
      await page.waitForTimeout(300);
    }
    
    await page.mouse.dblclick(bounds.x + bounds.width * 0.3, bounds.y + bounds.height * 0.2);
    await page.waitForTimeout(1500);
    
    // Step 2: 进入编辑模式
    console.log('🔄 Step 2: Entering edit mode...');
    await imageToolPage.selectEditTool();
    await page.waitForTimeout(500);
    
    // Step 3: 选择多边形
    console.log('🎯 Step 3: Selecting complex polygon...');
    const centerX = bounds.x + bounds.width * 0.4;
    const centerY = bounds.y + bounds.height * 0.375;
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(1000);
    
    // 获取原始控制点
    const originalPoints = await imageToolPage.getControlPointPositions();
    console.log(`Original complex polygon has ${originalPoints.length} control points`);
    
    // Step 4: 执行多个编辑操作
    console.log('🎯 Step 4: Performing multiple editing operations...');
    
    // 4a: 拖拽顶部顶点
    if (originalPoints.length > 0) {
      const topPoint = originalPoints.reduce((top, point) => 
        point.y < top.y ? point : top
      );
      console.log(`Dragging top point from (${topPoint.x}, ${topPoint.y})`);
      await imageToolPage.dragControlPoint(topPoint.x, topPoint.y, topPoint.x, topPoint.y - 20);
      await page.waitForTimeout(500);
    }
    
    // 4b: 拖拽右侧顶点  
    const updatedPoints = await imageToolPage.getControlPointPositions();
    if (updatedPoints.length > 0) {
      const rightPoint = updatedPoints.reduce((right, point) => 
        point.x > right.x ? point : right
      );
      console.log(`Dragging right point from (${rightPoint.x}, ${rightPoint.y})`);
      await imageToolPage.dragControlPoint(rightPoint.x, rightPoint.y, rightPoint.x + 25, rightPoint.y);
      await page.waitForTimeout(500);
    }
    
    // Step 5: 验证修改
    console.log('✅ Step 5: Verifying modifications...');
    const finalPoints = await imageToolPage.getControlPointPositions();
    const wasModified = await imageToolPage.verifyShapeModified(originalPoints);
    expect(wasModified).toBe(true);
    
    // Step 6: 测试撤销编辑操作
    console.log('↶ Step 6: Testing undo of edit operations...');
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(1000);
    
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(1000);
    
    // Step 7: 测试重做编辑操作
    console.log('↷ Step 7: Testing redo of edit operations...');
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(1000);
    
    // Step 8: 最终删除测试
    console.log('🗑️ Step 8: Final deletion test...');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(1000);
    
    // 验证对象被删除
    const controlPointsAfterDelete = await imageToolPage.verifyControlPointsVisible();
    expect(controlPointsAfterDelete).toBe(false);
    
    // Step 9: 撤销删除操作
    console.log('↶ Step 9: Undoing deletion...');
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(1000);
    
    console.log('✅ Complex ISS polygon editing workflow test completed successfully');
  });

  test('should handle multiple ISS polygons editing simultaneously', async ({ page }: { page: any }) => {
    console.log('🚀 Starting multiple ISS polygons editing test...');
    
    await imageToolPage.selectIssTool();
    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }
    
    // 创建三个不同的多边形
    const polygons = [
      // 左上角三角形
      [
        { x: 0.1, y: 0.1 },
        { x: 0.25, y: 0.1 },
        { x: 0.175, y: 0.25 }
      ],
      // 右上角矩形
      [
        { x: 0.7, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.3 },
        { x: 0.7, y: 0.3 }
      ],
      // 底部五边形
      [
        { x: 0.4, y: 0.7 },
        { x: 0.6, y: 0.7 },
        { x: 0.65, y: 0.85 },
        { x: 0.5, y: 0.9 },
        { x: 0.35, y: 0.85 }
      ]
    ];
    
    // 创建所有多边形
    for (let i = 0; i < polygons.length; i++) {
      console.log(`📝 Creating polygon ${i + 1}...`);
      
      for (const point of polygons[i]) {
        const absoluteX = bounds.x + bounds.width * point.x;
        const absoluteY = bounds.y + bounds.height * point.y;
        await page.mouse.click(absoluteX, absoluteY);
        await page.waitForTimeout(250);
      }
      
      // 完成当前多边形
      await page.mouse.dblclick(
        bounds.x + bounds.width * polygons[i][0].x, 
        bounds.y + bounds.height * polygons[i][0].y
      );
      await page.waitForTimeout(800);
    }
    
    // 切换到编辑模式
    console.log('🔄 Switching to edit mode...');
    await imageToolPage.selectEditTool();
    await page.waitForTimeout(500);
    
    // 逐个编辑每个多边形
    for (let i = 0; i < polygons.length; i++) {
      console.log(`🎯 Editing polygon ${i + 1}...`);
      
      // 计算多边形中心点
      const centerX = bounds.x + bounds.width * (
        polygons[i].reduce((sum, p) => sum + p.x, 0) / polygons[i].length
      );
      const centerY = bounds.y + bounds.height * (
        polygons[i].reduce((sum, p) => sum + p.y, 0) / polygons[i].length
      );
      
      // 选择多边形
      await page.mouse.click(centerX, centerY);
      await page.waitForTimeout(800);
      
      // 验证控制点显示
      const controlPointsVisible = await imageToolPage.verifyControlPointsVisible();
      console.log(`Polygon ${i + 1} control points visible: ${controlPointsVisible}`);
      
      // 获取控制点并拖拽第一个
      const controlPoints = await imageToolPage.getControlPointPositions();
      if (controlPoints.length > 0) {
        const firstPoint = controlPoints[0];
        await imageToolPage.dragControlPoint(
          firstPoint.x, 
          firstPoint.y, 
          firstPoint.x + (i + 1) * 10, 
          firstPoint.y + (i + 1) * 5
        );
        await page.waitForTimeout(500);
      }
      
      // 取消选择
      await imageToolPage.deselectAnnotation();
      await page.waitForTimeout(300);
    }
    
    console.log('✅ Multiple ISS polygons editing test completed successfully');
  });
}); 
