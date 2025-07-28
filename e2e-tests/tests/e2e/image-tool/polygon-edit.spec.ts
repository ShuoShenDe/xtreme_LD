import { test, expect } from '@playwright/test';
import { ImageToolPage } from '../../pages/image-tool/image-tool-page';

test.describe('Polygon Editing Tests', () => {
  let imageToolPage: ImageToolPage;

  test.beforeEach(async ({ page }) => {
    imageToolPage = new ImageToolPage(page);

    // 使用和成功测试相同的URL模式
    await page.goto('http://localhost:3300/?recordId=test-record-123&datasetId=test-dataset-456');
    
    // 使用和核心测试相同的简单等待方式
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('should display control points when polygon is selected', async () => {
    console.log('🧪 Test: Display control points for selected polygon');

    // 1. 先创建一个polygon（三角形）
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

    // 获取canvas以计算绝对坐标
    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    // 点击polygon的中心区域进行选择
    const selectX = bounds.x + bounds.width * 0.5;
    const selectY = bounds.y + bounds.height * 0.35;
    
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    // 3. 验证控制点是否显示
    const controlPointsVisible = await imageToolPage.verifyControlPointsVisible();
    expect(controlPointsVisible).toBe(true);

    console.log('✅ Control points are visible after polygon selection');
  });

  test('should allow dragging control points to modify polygon shape', async () => {
    console.log('🧪 Test: Drag control points to modify polygon');

    // 1. 创建polygon（四边形）
    const squarePoints = [
      { x: 0.2, y: 0.2 },
      { x: 0.6, y: 0.2 },
      { x: 0.6, y: 0.6 },
      { x: 0.2, y: 0.6 }
    ];

    await imageToolPage.drawPolygon(squarePoints);
    await page.waitForTimeout(2000);

    // 2. 选择polygon以显示控制点
    await imageToolPage.selectEditTool();
    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    const selectX = bounds.x + bounds.width * 0.4;
    const selectY = bounds.y + bounds.height * 0.4;
    
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    // 3. 获取原始控制点位置
    const originalPoints = await imageToolPage.getControlPointPositions();
    expect(originalPoints.length).toBeGreaterThan(0);

    console.log(`Original control points: ${originalPoints.length} points`);

    // 4. 拖拽右上角控制点使形状变形
    if (originalPoints.length >= 2) {
      const topRightPoint = originalPoints[1]; // 假设第二个点是右上角
      const newX = topRightPoint.x + 60; // 向右扩展
      const newY = topRightPoint.y - 40; // 向上拉伸

      await imageToolPage.dragControlPoint(
        topRightPoint.x, 
        topRightPoint.y, 
        newX, 
        newY
      );

      await page.waitForTimeout(1000);

      // 5. 验证形状是否被修改
      const shapeModified = await imageToolPage.verifyShapeModified(originalPoints);
      expect(shapeModified).toBe(true);

      console.log('✅ Polygon shape successfully modified by dragging control point');
    }
  });

  test('should maintain control points after polygon editing and reselection', async () => {
    console.log('🧪 Test: Control points persist after polygon editing and reselection');

    // 1. 创建polygon（五边形）
    const pentagonPoints = [
      { x: 0.5, y: 0.1 },   // 顶点
      { x: 0.8, y: 0.3 },   // 右上
      { x: 0.7, y: 0.7 },   // 右下
      { x: 0.3, y: 0.7 },   // 左下
      { x: 0.2, y: 0.3 }    // 左上
    ];

    await imageToolPage.drawPolygon(pentagonPoints);
    await page.waitForTimeout(2000);

    // 2. 第一次选择并编辑
    await imageToolPage.selectEditTool();
    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    const selectX = bounds.x + bounds.width * 0.5;
    const selectY = bounds.y + bounds.height * 0.4;
    
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    // 获取初始控制点
    const initialPoints = await imageToolPage.getControlPointPositions();
    expect(initialPoints.length).toBeGreaterThan(0);

    // 拖拽编辑顶点
    if (initialPoints.length > 0) {
      const topPoint = initialPoints[0]; // 顶点
      await imageToolPage.dragControlPoint(
        topPoint.x,
        topPoint.y,
        topPoint.x - 30,
        topPoint.y + 20
      );
      await page.waitForTimeout(1000);
    }

    // 3. 取消选择
    await imageToolPage.deselectAnnotation();
    await page.waitForTimeout(500);

    // 4. 重新选择polygon
    await page.mouse.click(selectX - 10, selectY + 10); // 稍微调整位置
    await page.waitForTimeout(1000);

    // 5. 验证控制点在新位置正确显示
    const newControlPointsVisible = await imageToolPage.verifyControlPointsVisible();
    expect(newControlPointsVisible).toBe(true);

    const reselectedPoints = await imageToolPage.getControlPointPositions();
    expect(reselectedPoints.length).toBe(initialPoints.length);

    // 验证控制点位置已更新（与初始位置不同）
    const pointsMoved = await imageToolPage.verifyShapeModified(initialPoints);
    expect(pointsMoved).toBe(true);

    console.log('✅ Polygon control points correctly displayed at updated positions after reselection');
  });

  test('should support reshaping polygon through multiple control point edits', async () => {
    console.log('🧪 Test: Reshape polygon through multiple control point edits');

    // 1. 创建简单三角形
    const trianglePoints = [
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.3 },
      { x: 0.5, y: 0.7 }
    ];

    await imageToolPage.drawPolygon(trianglePoints);
    await page.waitForTimeout(2000);

    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    const selectX = bounds.x + bounds.width * 0.5;
    const selectY = bounds.y + bounds.height * 0.45;

    // 2. 选择并获取初始控制点
    await imageToolPage.selectEditTool();
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    let currentPoints = await imageToolPage.getControlPointPositions();
    const originalPointCount = currentPoints.length;
    expect(originalPointCount).toBe(3); // 三角形应该有3个控制点

    // 3. 连续编辑多个控制点，将三角形变形为不规则形状
    
    // 编辑第一个点（左上）
    if (currentPoints.length > 0) {
      const firstPoint = currentPoints[0];
      await imageToolPage.dragControlPoint(
        firstPoint.x,
        firstPoint.y,
        firstPoint.x - 40,
        firstPoint.y - 20
      );
      await page.waitForTimeout(500);
    }

    // 编辑第二个点（右上）
    currentPoints = await imageToolPage.getControlPointPositions();
    if (currentPoints.length > 1) {
      const secondPoint = currentPoints[1];
      await imageToolPage.dragControlPoint(
        secondPoint.x,
        secondPoint.y,
        secondPoint.x + 50,
        secondPoint.y - 30
      );
      await page.waitForTimeout(500);
    }

    // 编辑第三个点（底部）
    currentPoints = await imageToolPage.getControlPointPositions();
    if (currentPoints.length > 2) {
      const thirdPoint = currentPoints[2];
      await imageToolPage.dragControlPoint(
        thirdPoint.x,
        thirdPoint.y,
        thirdPoint.x + 20,
        thirdPoint.y + 40
      );
      await page.waitForTimeout(500);
    }

    // 4. 验证形状已被多次修改且控制点仍然正常工作
    const finalControlPointsVisible = await imageToolPage.verifyControlPointsVisible();
    expect(finalControlPointsVisible).toBe(true);

    const finalPoints = await imageToolPage.getControlPointPositions();
    expect(finalPoints.length).toBe(originalPointCount);

    console.log('✅ Polygon successfully reshaped through multiple control point edits');
  });

  test('should handle complex polygon editing with many vertices', async () => {
    console.log('🧪 Test: Complex polygon editing with many vertices');

    // 1. 创建复杂六边形
    const hexagonPoints = [
      { x: 0.5, y: 0.1 },   // 顶部
      { x: 0.8, y: 0.25 },  // 右上
      { x: 0.8, y: 0.55 },  // 右下
      { x: 0.5, y: 0.7 },   // 底部
      { x: 0.2, y: 0.55 },  // 左下
      { x: 0.2, y: 0.25 }   // 左上
    ];

    await imageToolPage.drawPolygon(hexagonPoints);
    await page.waitForTimeout(2000);

    // 2. 选择并验证所有控制点
    await imageToolPage.selectEditTool();
    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    const selectX = bounds.x + bounds.width * 0.5;
    const selectY = bounds.y + bounds.height * 0.4;
    
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    const controlPoints = await imageToolPage.getControlPointPositions();
    expect(controlPoints.length).toBe(6); // 六边形应该有6个控制点

    // 3. 编辑其中几个顶点来测试复杂形状的编辑能力
    if (controlPoints.length >= 6) {
      // 编辑顶部点
      await imageToolPage.dragControlPoint(
        controlPoints[0].x,
        controlPoints[0].y,
        controlPoints[0].x + 25,
        controlPoints[0].y - 15
      );
      await page.waitForTimeout(500);

      // 编辑右下点
      await imageToolPage.dragControlPoint(
        controlPoints[2].x,
        controlPoints[2].y,
        controlPoints[2].x + 35,
        controlPoints[2].y + 25
      );
      await page.waitForTimeout(500);

      // 编辑左上点
      await imageToolPage.dragControlPoint(
        controlPoints[5].x,
        controlPoints[5].y,
        controlPoints[5].x - 40,
        controlPoints[5].y - 10
      );
      await page.waitForTimeout(500);
    }

    // 4. 验证复杂编辑后状态
    const finalControlPointsVisible = await imageToolPage.verifyControlPointsVisible();
    expect(finalControlPointsVisible).toBe(true);

    const finalPoints = await imageToolPage.getControlPointPositions();
    expect(finalPoints.length).toBe(6); // 控制点数量应该保持不变

    console.log('✅ Complex polygon with multiple vertices edited successfully');
  });

  test('should hide control points when polygon is deselected', async () => {
    console.log('🧪 Test: Hide control points when polygon is deselected');

    // 1. 创建并选择polygon
    const diamondPoints = [
      { x: 0.5, y: 0.2 },   // 顶部
      { x: 0.7, y: 0.5 },   // 右侧
      { x: 0.5, y: 0.8 },   // 底部
      { x: 0.3, y: 0.5 }    // 左侧
    ];

    await imageToolPage.drawPolygon(diamondPoints);
    await page.waitForTimeout(2000);

    await imageToolPage.selectEditTool();
    const canvas = await imageToolPage.getMainCanvas();
    const bounds = await canvas.boundingBox();
    
    if (!bounds) {
      throw new Error('Cannot get canvas bounds');
    }

    const selectX = bounds.x + bounds.width * 0.5;
    const selectY = bounds.y + bounds.height * 0.5;
    
    await page.mouse.click(selectX, selectY);
    await page.waitForTimeout(1000);

    // 2. 验证控制点显示
    let controlPointsVisible = await imageToolPage.verifyControlPointsVisible();
    expect(controlPointsVisible).toBe(true);

    // 3. 取消选择
    await imageToolPage.deselectAnnotation();
    await page.waitForTimeout(1000);

    // 4. 验证控制点隐藏
    controlPointsVisible = await imageToolPage.verifyControlPointsVisible();
    expect(controlPointsVisible).toBe(false);

    console.log('✅ Polygon control points correctly hidden when annotation is deselected');
  });
}); 