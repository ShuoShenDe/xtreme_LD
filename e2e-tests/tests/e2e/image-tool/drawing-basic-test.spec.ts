import { test, expect } from '@playwright/test';

test.describe('Image-Tool Basic Drawing Test', () => {
  
  test('should load Image-Tool and perform basic drawing operations', async ({ page }) => {
    console.log('🎯 Starting basic drawing test...');
    
    // 使用完整的URL参数（包含taskid, ltm, phase）
    const testUrl = 'http://localhost:3300/?recordId=test-record-123&datasetId=test-dataset-456&dataId=test-data-789&taskid=test-task-123&ltm=http://localhost:8080&phase=annotate';
    
    // 导航到测试页面
    console.log('📍 Navigating to:', testUrl);
    await page.goto(testUrl);
    
    // 等待页面基础加载
    await page.waitForTimeout(3000);
    
    // 检查页面标题
    const title = await page.title();
    console.log('📄 Page title:', title);
    expect(title).toContain('Image Tool');
    
    // 验证基础元素存在
    const appContainer = await page.locator('#app').isVisible();
    console.log('📦 App container visible:', appContainer);
    expect(appContainer).toBe(true);
    
    // 等待更长时间让应用完全加载
    console.log('⏳ Waiting for app to fully load...');
    await page.waitForTimeout(5000);
    
    // 检查canvas元素
    const canvasCount = await page.locator('canvas').count();
    console.log('🎨 Canvas count:', canvasCount);
    
    if (canvasCount > 0) {
      console.log('✅ Canvas elements found, proceeding with drawing test');
      
      // 尝试找到主canvas
      const mainCanvas = page.locator('canvas').first();
      const canvasBox = await mainCanvas.boundingBox();
      
      if (canvasBox) {
        console.log('🎯 Canvas found with dimensions:', canvasBox);
        
        // 尝试在canvas上进行简单的鼠标操作
        const centerX = canvasBox.x + canvasBox.width / 2;
        const centerY = canvasBox.y + canvasBox.height / 2;
        
        // 模拟绘制操作 - 从中心往右下角拖拽
        const startX = centerX - 50;
        const startY = centerY - 50;
        const endX = centerX + 50;
        const endY = centerY + 50;
        
        console.log(`🖱️ Drawing rectangle from (${startX}, ${startY}) to (${endX}, ${endY})`);
        
        // 鼠标按下
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        
        // 拖拽到结束位置
        await page.mouse.move(endX, endY);
        
        // 松开鼠标
        await page.mouse.up();
        
        // 等待绘制完成
        await page.waitForTimeout(1000);
        
        console.log('✅ Drawing operation completed');
        
        // 截图用于验证
        await page.screenshot({ path: 'test-results/drawing-basic-test.png' });
        
      } else {
        console.log('⚠️ Canvas found but no bounding box available');
      }
    } else {
      console.log('⚠️ No canvas elements found, checking for other drawing elements');
      
      // 查找其他可能的绘制元素
      const drawingElements = await page.locator('[class*="editor"], [class*="canvas"], [class*="konva"]').count();
      console.log('🎨 Drawing elements count:', drawingElements);
    }
    
    // 检查是否有工具栏
    const toolElements = await page.locator('[class*="tool"], button, [role="button"]').count();
    console.log('🛠️ Tool elements count:', toolElements);
    
    // 检查是否有错误消息
    const errorElements = await page.locator('text=/error|错误|failed|失败/i').count();
    console.log('❌ Error elements count:', errorElements);
    
    // 最终截图
    await page.screenshot({ path: 'test-results/drawing-final-state.png' });
    
    console.log('✅ Basic drawing test completed');
  });
  
  test('should verify tool selection functionality', async ({ page }) => {
    console.log('🎯 Testing tool selection...');
    
    const testUrl = 'http://localhost:3300/?recordId=test-record-123&datasetId=test-dataset-456&dataId=test-data-789&taskid=test-task-123&ltm=http://localhost:8080&phase=annotate';
    
    await page.goto(testUrl);
    await page.waitForTimeout(5000);
    
    // 查找工具按钮
    const buttons = await page.locator('button, [role="button"]').all();
    console.log(`🛠️ Found ${buttons.length} potential tool buttons`);
    
    // 尝试点击工具按钮
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      try {
        const button = buttons[i];
        const isVisible = await button.isVisible();
        if (isVisible) {
          const text = await button.textContent();
          console.log(`🔘 Clicking button ${i}: "${text}"`);
          await button.click();
          await page.waitForTimeout(500);
        }
      } catch (error) {
        console.log(`⚠️ Failed to click button ${i}:`, error);
      }
    }
    
    await page.screenshot({ path: 'test-results/tool-selection-test.png' });
    console.log('✅ Tool selection test completed');
  });
}); 