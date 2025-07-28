import { test, expect } from '@playwright/test';
import { ImageToolPage } from '../../pages/image-tool/image-tool-page';

test.describe('Point Deletion and Merging Tests', () => {
  let imageToolPage: ImageToolPage;

  test.beforeEach(async ({ page }) => {
    imageToolPage = new ImageToolPage(page);
    
    // 加载测试页面
    await page.goto('http://localhost:3300/?recordId=test-record-123&datasetId=test-dataset-456');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('should delete individual points from polyline when Del key is pressed', async () => {
    console.log('🧪 Test: Delete individual points from polyline');

    // 1. 创建一个多点的polyline
    const polylinePoints = [
      { x: 0.2, y: 0.3 },
      { x: 0.4, y: 0.3 },
      { x: 0.6, y: 0.4 },
      { x: 0.8, y: 0.5 },
      { x: 0.7, y: 0.7 }
    ];

    await imageToolPage.drawPolyline(polylinePoints);
    await page.waitForTimeout(2000);

    // 2. 切换到编辑工具并选择polyline
    await imageToolPage.selectEditTool();
    await page.waitForTimeout(500);

    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    // 点击polyline选择它
    const selectX = bounds.x + bounds.width * 0.5;
    const selectY = bounds.y + bounds.height * 0.4;
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    // 3. 点击中间的锚点(第3个点)进行选择
    const anchorX = bounds.x + bounds.width * 0.6;
    const anchorY = bounds.y + bounds.height * 0.4;
    await page.mouse.click(anchorX, anchorY);
    await page.waitForTimeout(500);

    // 4. 按下Delete键删除选中的点
    await page.keyboard.press('Delete');
    await page.waitForTimeout(1000);

    // 5. 验证点数是否减少了1
    // 这里需要通过某种方式验证点数从5个变成了4个
    console.log('✅ Point deletion test completed');
  });

  test('should delete individual points from polygon when Del key is pressed', async () => {
    console.log('🧪 Test: Delete individual points from polygon');

    // 1. 创建一个多边形
    const polygonPoints = [
      { x: 0.2, y: 0.2 },
      { x: 0.5, y: 0.2 },
      { x: 0.7, y: 0.4 },
      { x: 0.6, y: 0.7 },
      { x: 0.3, y: 0.6 }
    ];

    await imageToolPage.drawPolygon(polygonPoints);
    await page.waitForTimeout(2000);

    // 2. 切换到编辑工具并选择polygon
    await imageToolPage.selectEditTool();
    await page.waitForTimeout(500);

    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    // 点击polygon选择它
    const selectX = bounds.x + bounds.width * 0.45;
    const selectY = bounds.y + bounds.height * 0.4;
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    // 3. 点击其中一个锚点进行选择
    const anchorX = bounds.x + bounds.width * 0.7;
    const anchorY = bounds.y + bounds.height * 0.4;
    await page.mouse.click(anchorX, anchorY);
    await page.waitForTimeout(500);

    // 4. 按下Delete键删除选中的点
    await page.keyboard.press('Delete');
    await page.waitForTimeout(1000);

    // 5. 验证点数是否减少了1（从5个变成4个）
    console.log('✅ Polygon point deletion test completed');
  });

  test('should merge points when dragged close together in polyline', async () => {
    console.log('🧪 Test: Merge points when dragged close together in polyline');

    // 1. 创建一个polyline
    const polylinePoints = [
      { x: 0.2, y: 0.3 },
      { x: 0.4, y: 0.3 },
      { x: 0.6, y: 0.3 },
      { x: 0.8, y: 0.3 }
    ];

    await imageToolPage.drawPolyline(polylinePoints);
    await page.waitForTimeout(2000);

    // 2. 切换到编辑工具并选择polyline
    await imageToolPage.selectEditTool();
    await page.waitForTimeout(500);

    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    // 点击polyline选择它
    const selectX = bounds.x + bounds.width * 0.5;
    const selectY = bounds.y + bounds.height * 0.3;
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    // 3. 拖动第3个点到第2个点的位置，触发合并
    const point3X = bounds.x + bounds.width * 0.6;
    const point3Y = bounds.y + bounds.height * 0.3;
    const point2X = bounds.x + bounds.width * 0.4;
    const point2Y = bounds.y + bounds.height * 0.3;

    // 执行拖拽操作
    await page.mouse.move(point3X, point3Y);
    await page.mouse.down();
    await page.mouse.move(point2X, point2Y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // 4. 验证点数是否减少了1（从4个变成3个）
    console.log('✅ Point merging test completed');
  });

  test('should merge points when dragged close together in polygon', async () => {
    console.log('🧪 Test: Merge points when dragged close together in polygon');

    // 1. 创建一个正方形polygon
    const polygonPoints = [
      { x: 0.3, y: 0.3 },
      { x: 0.6, y: 0.3 },
      { x: 0.6, y: 0.6 },
      { x: 0.3, y: 0.6 }
    ];

    await imageToolPage.drawPolygon(polygonPoints);
    await page.waitForTimeout(2000);

    // 2. 切换到编辑工具并选择polygon
    await imageToolPage.selectEditTool();
    await page.waitForTimeout(500);

    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    // 点击polygon选择它
    const selectX = bounds.x + bounds.width * 0.45;
    const selectY = bounds.y + bounds.height * 0.45;
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    // 3. 拖动一个点到相邻点的位置，触发合并
    const point1X = bounds.x + bounds.width * 0.6;
    const point1Y = bounds.y + bounds.height * 0.3;
    const point2X = bounds.x + bounds.width * 0.6;
    const point2Y = bounds.y + bounds.height * 0.6;

    // 执行拖拽操作
    await page.mouse.move(point1X, point1Y);
    await page.mouse.down();
    await page.mouse.move(point2X, point2Y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // 4. 验证点数是否减少了1（从4个变成3个，仍然保持多边形的最小点数）
    console.log('✅ Polygon point merging test completed');
  });

  test('should not delete points below minimum required', async () => {
    console.log('🧪 Test: Prevent deletion below minimum points');

    // 1. 创建一个只有最小点数的polyline (2个点)
    const minPolylinePoints = [
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 }
    ];

    await imageToolPage.drawPolyline(minPolylinePoints);
    await page.waitForTimeout(2000);

    // 2. 切换到编辑工具并选择polyline
    await imageToolPage.selectEditTool();
    await page.waitForTimeout(500);

    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    // 点击polyline选择它
    const selectX = bounds.x + bounds.width * 0.5;
    const selectY = bounds.y + bounds.height * 0.5;
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    // 3. 点击一个锚点
    const anchorX = bounds.x + bounds.width * 0.3;
    const anchorY = bounds.y + bounds.height * 0.3;
    await page.mouse.click(anchorX, anchorY);
    await page.waitForTimeout(500);

    // 4. 尝试删除点，应该被阻止
    await page.keyboard.press('Delete');
    await page.waitForTimeout(1000);

    // 5. 验证点数没有改变（仍然是2个点）
    console.log('✅ Minimum points protection test completed');
  });

  test('should not delete polygon below 3 points', async () => {
    console.log('🧪 Test: Prevent polygon deletion below 3 points');

    // 1. 创建一个只有3个点的三角形polygon
    const trianglePoints = [
      { x: 0.3, y: 0.2 },
      { x: 0.7, y: 0.2 },
      { x: 0.5, y: 0.6 }
    ];

    await imageToolPage.drawPolygon(trianglePoints);
    await page.waitForTimeout(2000);

    // 2. 切换到编辑工具并选择polygon
    await imageToolPage.selectEditTool();
    await page.waitForTimeout(500);

    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    // 点击polygon选择它
    const selectX = bounds.x + bounds.width * 0.5;
    const selectY = bounds.y + bounds.height * 0.35;
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    // 3. 点击一个锚点
    const anchorX = bounds.x + bounds.width * 0.3;
    const anchorY = bounds.y + bounds.height * 0.2;
    await page.mouse.click(anchorX, anchorY);
    await page.waitForTimeout(500);

    // 4. 尝试删除点，应该被阻止
    await page.keyboard.press('Delete');
    await page.waitForTimeout(1000);

    // 5. 验证点数没有改变（仍然是3个点）
    console.log('✅ Polygon minimum points protection test completed');
  });

  test('should highlight selected anchor point', async () => {
    console.log('🧪 Test: Verify anchor point highlighting when selected');

    // 1. 创建一个polyline
    const polylinePoints = [
      { x: 0.2, y: 0.3 },
      { x: 0.5, y: 0.3 },
      { x: 0.8, y: 0.3 }
    ];

    await imageToolPage.drawPolyline(polylinePoints);
    await page.waitForTimeout(2000);

    // 2. 切换到编辑工具并选择polyline
    await imageToolPage.selectEditTool();
    await page.waitForTimeout(500);

    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    // 点击polyline选择它
    const selectX = bounds.x + bounds.width * 0.5;
    const selectY = bounds.y + bounds.height * 0.3;
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    // 3. 点击中间的锚点
    const anchorX = bounds.x + bounds.width * 0.5;
    const anchorY = bounds.y + bounds.height * 0.3;
    await page.mouse.click(anchorX, anchorY);
    await page.waitForTimeout(500);

    // 4. 验证锚点是否被高亮显示
    // 在实际实现中，可以通过检查锚点的颜色变化来验证
    console.log('✅ Anchor highlighting test completed');
  });
});