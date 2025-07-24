import { test, expect } from '@playwright/test';
import { PcToolPage } from '../../pages/pc-tool/pc-tool-page';

test.describe('3D Polyline/Polygon Selection Tests', () => {
  let pcToolPage: PcToolPage;

  test.beforeEach(async ({ page }) => {
    pcToolPage = new PcToolPage(page);
    
    // 导航到PC-Tool测试页面
    await page.goto('http://localhost:3200/?recordId=test-record-123&datasetId=test-dataset-456&dataId=test-data-789&taskid=test-task-123&ltm=http://localhost:8080&phase=annotate');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // 等待PC-Tool编辑器就绪
    await pcToolPage.waitForEditorReady();
  });

  test('should create and select 3D polyline successfully', async ({ page }) => {
    console.log('🚀 Starting 3D polyline selection test...');
    
    // Step 1: 选择3D polyline工具
    console.log('📝 Step 1: Selecting 3D polyline tool...');
    await pcToolPage.select3DPolylineTool();
    
    // 验证工具是否被正确选择
    const activeToolExists = await page.locator('.tool-item.active, [class*="active"][class*="tool"], [class*="selected"][class*="tool"]').count();
    console.log(`Active tools found: ${activeToolExists}`);
    expect(activeToolExists).toBeGreaterThan(0);
    
    // Step 2: 创建3D polyline
    console.log('📍 Step 2: Creating 3D polyline...');
    const polylinePoints = [
      { x: 0.3, y: 0.3 },  // 起始点
      { x: 0.5, y: 0.4 },  // 中间点1  
      { x: 0.7, y: 0.5 },  // 中间点2
      { x: 0.8, y: 0.6 }   // 终点
    ];
    
    await pcToolPage.create3DPolyline(polylinePoints);
    
    // Step 3: 验证polyline已创建
    console.log('✅ Step 3: Verifying polyline creation...');
    const polylineCount = await pcToolPage.getPolylineCount();
    expect(polylineCount).toBeGreaterThan(0);
    console.log(`Created polylines: ${polylineCount}`);
    
    // Step 4: 尝试选中polyline
    console.log('🎯 Step 4: Testing polyline selection...');
    const selectedPolyline = await pcToolPage.selectPolylineByClick(polylinePoints[1]); // 点击中间点附近
    expect(selectedPolyline).toBeTruthy();
    console.log('Polyline selection successful');
    
    // Step 5: 验证选中状态
    console.log('✅ Step 5: Verifying selection state...');
    const selectionState = await pcToolPage.verifySelectionState('polyline');
    expect(selectionState.isSelected).toBe(true);
    expect(selectionState.selectedType).toBe('Polyline3D');
    console.log('Selection state verified');
  });

  test('should create and select 3D polygon successfully', async ({ page }) => {
    console.log('🚀 Starting 3D polygon selection test...');
    
    // Step 1: 选择3D polygon工具
    console.log('📝 Step 1: Selecting 3D polygon tool...');
    await pcToolPage.select3DPolygonTool();
    
    // 验证工具是否被正确选择
    const activeToolExists = await page.locator('.tool-item.active, [class*="active"][class*="tool"], [class*="selected"][class*="tool"]').count();
    expect(activeToolExists).toBeGreaterThan(0);
    
    // Step 2: 创建3D polygon
    console.log('📍 Step 2: Creating 3D polygon...');
    const polygonPoints = [
      { x: 0.3, y: 0.3 },  // 左上
      { x: 0.6, y: 0.3 },  // 右上
      { x: 0.6, y: 0.6 },  // 右下
      { x: 0.3, y: 0.6 }   // 左下
    ];
    
    await pcToolPage.create3DPolygon(polygonPoints);
    
    // Step 3: 验证polygon已创建
    console.log('✅ Step 3: Verifying polygon creation...');
    const polygonCount = await pcToolPage.getPolygonCount();
    expect(polygonCount).toBeGreaterThan(0);
    console.log(`Created polygons: ${polygonCount}`);
    
    // Step 4: 尝试选中polygon（点击内部）
    console.log('🎯 Step 4: Testing polygon selection (inside)...');
    const selectedPolygon = await pcToolPage.selectPolygonByClick({ x: 0.45, y: 0.45 }); // 点击中心
    expect(selectedPolygon).toBeTruthy();
    console.log('Polygon selection (inside) successful');
    
    // Step 5: 验证选中状态
    console.log('✅ Step 5: Verifying selection state...');
    const selectionState = await pcToolPage.verifySelectionState('polygon');
    expect(selectionState.isSelected).toBe(true);
    expect(selectionState.selectedType).toBe('Polygon3D');
    console.log('Selection state verified');
  });

  test('should test polygon edge selection', async ({ page }) => {
    console.log('🚀 Testing polygon edge selection...');
    
    // 创建polygon
    await pcToolPage.select3DPolygonTool();
    const polygonPoints = [
      { x: 0.3, y: 0.3 },
      { x: 0.6, y: 0.3 },
      { x: 0.6, y: 0.6 },
      { x: 0.3, y: 0.6 }
    ];
    await pcToolPage.create3DPolygon(polygonPoints);
    
    // 测试边缘选择
    console.log('🎯 Testing edge selection...');
    const edgePoint = { x: 0.45, y: 0.3 }; // 点击上边的中点
    const selectedPolygonByEdge = await pcToolPage.selectPolygonByClick(edgePoint);
    expect(selectedPolygonByEdge).toBeTruthy();
    console.log('Polygon edge selection successful');
  });

  test('should test multiple objects selection priority', async ({ page }) => {
    console.log('🚀 Testing multiple objects selection priority...');
    
    // 创建重叠的polyline和polygon
    await pcToolPage.select3DPolylineTool();
    await pcToolPage.create3DPolyline([
      { x: 0.4, y: 0.4 },
      { x: 0.6, y: 0.6 }
    ]);
    
    await pcToolPage.select3DPolygonTool();
    await pcToolPage.create3DPolygon([
      { x: 0.35, y: 0.35 },
      { x: 0.65, y: 0.35 },
      { x: 0.65, y: 0.65 },
      { x: 0.35, y: 0.65 }
    ]);
    
    // 点击重叠区域，验证选择优先级
    console.log('🎯 Testing selection priority...');
    const selectedObject = await pcToolPage.selectAnyObjectByClick({ x: 0.5, y: 0.5 });
    expect(selectedObject).toBeTruthy();
    
    const selectionState = await pcToolPage.verifySelectionState('any');
    expect(selectionState.isSelected).toBe(true);
    // Polygon应该有更高的优先级
    expect(selectionState.selectedType).toBe('Polygon3D');
    console.log('Selection priority test passed');
  });

  test('should fail gracefully when clicking empty space', async ({ page }) => {
    console.log('🚀 Testing empty space selection...');
    
    // 创建一个对象
    await pcToolPage.select3DPolylineTool();
    await pcToolPage.create3DPolyline([
      { x: 0.3, y: 0.3 },
      { x: 0.4, y: 0.4 }
    ]);
    
    // 点击空白区域
    console.log('🎯 Clicking empty space...');
    const selectedObject = await pcToolPage.selectAnyObjectByClick({ x: 0.8, y: 0.8 });
    expect(selectedObject).toBe(null);
    
    const selectionState = await pcToolPage.verifySelectionState('any');
    expect(selectionState.isSelected).toBe(false);
    console.log('Empty space selection test passed');
  });
});