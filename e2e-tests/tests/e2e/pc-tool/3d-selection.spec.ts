import { test, expect } from '@playwright/test';

test.describe('PC-Tool 3D Selection Tests', () => {

  test.beforeEach(async ({ page }) => {
    // 导航到pc-tool页面
    await page.goto('http://localhost:3200/?recordId=test-record-123&datasetId=test-dataset-456&dataId=test-data-789');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // 等待3D场景初始化
  });

  test('should create and select 3D polyline', async ({ page }) => {
    console.log('🚀 Testing 3D polyline creation and selection...');

    // 1. 等待3D视图加载
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // 2. 寻找polyline创建工具
    const polylineToolSelectors = [
      '[title*="polyline"], [title*="Polyline"]',
      '[data-tool="polyline"], [data-action="polyline"]',
      'button:has-text("polyline"), button:has-text("Polyline")',
      '.tool-polyline, .polyline-tool',
      '.toolbar button:nth-child(3)'  // 通常polyline是第3个工具
    ];

    let polylineToolFound = false;
    for (const selector of polylineToolSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found polyline tool with selector: ${selector}`);
        await page.locator(selector).first().click();
        polylineToolFound = true;
        await page.waitForTimeout(1000);
        break;
      }
    }

    if (!polylineToolFound) {
      console.log('⚠️ Polyline tool not found, trying keyboard shortcut...');
      await page.keyboard.press('KeyP'); // 尝试快捷键
      await page.waitForTimeout(1000);
    }

    // 3. 在3D视图中创建polyline
    const canvas = page.locator('canvas').first();
    const canvasBounds = await canvas.boundingBox();
    
    if (!canvasBounds) {
      throw new Error('Cannot get canvas bounds');
    }

    console.log('📍 Creating polyline points...');
    
    // 定义polyline的点 (相对于canvas的坐标)
    const polylinePoints = [
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.3 },
      { x: 0.7, y: 0.7 },
      { x: 0.3, y: 0.7 }
    ];

    // 点击创建polyline
    for (const point of polylinePoints) {
      const x = canvasBounds.x + canvasBounds.width * point.x;
      const y = canvasBounds.y + canvasBounds.height * point.y;
      
      console.log(`Clicking point: (${x}, ${y})`);
      await page.mouse.click(x, y);
      await page.waitForTimeout(500);
    }

    // 完成polyline创建
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // 4. 尝试选择刚创建的polyline
    console.log('🎯 Testing polyline selection...');
    
    // 首先点击空白区域取消选择
    await page.mouse.click(canvasBounds.x + 50, canvasBounds.y + 50);
    await page.waitForTimeout(500);

    // 然后点击polyline的中点进行选择
    const midX = canvasBounds.x + canvasBounds.width * 0.5;
    const midY = canvasBounds.y + canvasBounds.height * 0.5;
    
    console.log(`Trying to select polyline at: (${midX}, ${midY})`);
    await page.mouse.click(midX, midY);
    await page.waitForTimeout(1000);

    // 5. 验证选择是否成功
    // 检查是否有选中状态的视觉反馈
    const selectionIndicators = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      let hasSelection = false;
      
      for (const canvas of canvases) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // 检查是否有黄色像素（选中状态）
          for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];
            
            // 检查黄色 (255, 255, 0) 或相近颜色
            if (a > 0 && r > 200 && g > 200 && b < 100) {
              hasSelection = true;
              break;
            }
          }
        }
      }
      
      return hasSelection;
    });

    // 检查是否有属性面板或选择指示器
    const hasPropertyPanel = await page.locator('.property-panel, .selection-info, .object-properties').count() > 0;
    const hasSelectionList = await page.locator('.selection-list, .selected-objects').count() > 0;
    
    console.log('Selection indicators:', { selectionIndicators, hasPropertyPanel, hasSelectionList });
    
    // 验证选择成功
    const isSelected = selectionIndicators || hasPropertyPanel || hasSelectionList;
    if (!isSelected) {
      console.log('❌ Polyline selection failed - no visual feedback detected');
      
      // 截图用于调试
      await page.screenshot({ path: 'test-results/polyline-selection-failed.png' });
      
      // 尝试不同的选择位置
      console.log('🔄 Retrying selection at different positions...');
      
      const retryPoints = [
        { x: 0.4, y: 0.3 }, // 边上的点
        { x: 0.3, y: 0.5 }, // 另一条边
        { x: 0.6, y: 0.6 }  // 对角线
      ];
      
      for (const point of retryPoints) {
        const x = canvasBounds.x + canvasBounds.width * point.x;
        const y = canvasBounds.y + canvasBounds.height * point.y;
        
        console.log(`Retry clicking at: (${x}, ${y})`);
        await page.mouse.click(x, y);
        await page.waitForTimeout(1000);
        
        const retrySelection = await page.evaluate(() => {
          const canvases = document.querySelectorAll('canvas');
          for (const canvas of canvases) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              for (let i = 0; i < imageData.data.length; i += 4) {
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];
                const a = imageData.data[i + 3];
                
                if (a > 0 && r > 200 && g > 200 && b < 100) {
                  return true;
                }
              }
            }
          }
          return false;
        });
        
        if (retrySelection) {
          console.log('✅ Polyline selection succeeded on retry');
          return;
        }
      }
    }
    
    expect(isSelected).toBe(true);
    console.log('✅ Polyline selection test completed successfully');
  });

  test('should create and select 3D polygon', async ({ page }) => {
    console.log('🚀 Testing 3D polygon creation and selection...');

    // 1. 等待3D视图加载
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // 2. 寻找polygon创建工具
    const polygonToolSelectors = [
      '[title*="polygon"], [title*="Polygon"]',
      '[data-tool="polygon"], [data-action="polygon"]',
      'button:has-text("polygon"), button:has-text("Polygon")',
      '.tool-polygon, .polygon-tool',
      '.toolbar button:nth-child(4)'  // 通常polygon是第4个工具
    ];

    let polygonToolFound = false;
    for (const selector of polygonToolSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found polygon tool with selector: ${selector}`);
        await page.locator(selector).first().click();
        polygonToolFound = true;
        await page.waitForTimeout(1000);
        break;
      }
    }

    if (!polygonToolFound) {
      console.log('⚠️ Polygon tool not found, trying keyboard shortcut...');
      await page.keyboard.press('KeyG'); // 尝试快捷键
      await page.waitForTimeout(1000);
    }

    // 3. 在3D视图中创建polygon
    const canvas = page.locator('canvas').first();
    const canvasBounds = await canvas.boundingBox();
    
    if (!canvasBounds) {
      throw new Error('Cannot get canvas bounds');
    }

    console.log('📍 Creating polygon points...');
    
    // 定义polygon的点 (五边形)
    const polygonPoints = [
      { x: 0.5, y: 0.2 },  // 顶点
      { x: 0.7, y: 0.4 },  // 右上
      { x: 0.6, y: 0.7 },  // 右下
      { x: 0.4, y: 0.7 },  // 左下
      { x: 0.3, y: 0.4 }   // 左上
    ];

    // 点击创建polygon
    for (const point of polygonPoints) {
      const x = canvasBounds.x + canvasBounds.width * point.x;
      const y = canvasBounds.y + canvasBounds.height * point.y;
      
      console.log(`Clicking point: (${x}, ${y})`);
      await page.mouse.click(x, y);
      await page.waitForTimeout(500);
    }

    // 完成polygon创建 (通常需要闭合或按Enter)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // 4. 尝试选择刚创建的polygon
    console.log('🎯 Testing polygon selection...');
    
    // 首先点击空白区域取消选择
    await page.mouse.click(canvasBounds.x + 50, canvasBounds.y + 50);
    await page.waitForTimeout(500);

    // 然后点击polygon的中心点进行选择
    const centerX = canvasBounds.x + canvasBounds.width * 0.5;
    const centerY = canvasBounds.y + canvasBounds.height * 0.45; // 稍微偏上一点
    
    console.log(`Trying to select polygon at center: (${centerX}, ${centerY})`);
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(1000);

    // 5. 验证选择是否成功
    const selectionIndicators = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      let hasSelection = false;
      
      for (const canvas of canvases) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // 检查是否有黄色像素（选中状态）
          for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];
            
            // 检查黄色 (255, 255, 0) 或相近颜色
            if (a > 0 && r > 200 && g > 200 && b < 100) {
              hasSelection = true;
              break;
            }
          }
        }
      }
      
      return hasSelection;
    });

    // 检查是否有属性面板或选择指示器
    const hasPropertyPanel = await page.locator('.property-panel, .selection-info, .object-properties').count() > 0;
    const hasSelectionList = await page.locator('.selection-list, .selected-objects').count() > 0;
    
    console.log('Selection indicators:', { selectionIndicators, hasPropertyPanel, hasSelectionList });
    
    // 验证选择成功
    const isSelected = selectionIndicators || hasPropertyPanel || hasSelectionList;
    if (!isSelected) {
      console.log('❌ Polygon selection failed - no visual feedback detected');
      
      // 截图用于调试
      await page.screenshot({ path: 'test-results/polygon-selection-failed.png' });
      
      // 尝试点击边缘
      console.log('🔄 Retrying selection at polygon edges...');
      
      const edgePoints = [
        { x: 0.6, y: 0.3 },  // 右边
        { x: 0.4, y: 0.3 },  // 左边
        { x: 0.5, y: 0.55 }  // 下边
      ];
      
      for (const point of edgePoints) {
        const x = canvasBounds.x + canvasBounds.width * point.x;
        const y = canvasBounds.y + canvasBounds.height * point.y;
        
        console.log(`Retry clicking at edge: (${x}, ${y})`);
        await page.mouse.click(x, y);
        await page.waitForTimeout(1000);
        
        const retrySelection = await page.evaluate(() => {
          const canvases = document.querySelectorAll('canvas');
          for (const canvas of canvases) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              for (let i = 0; i < imageData.data.length; i += 4) {
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];
                const a = imageData.data[i + 3];
                
                if (a > 0 && r > 200 && g > 200 && b < 100) {
                  return true;
                }
              }
            }
          }
          return false;
        });
        
        if (retrySelection) {
          console.log('✅ Polygon selection succeeded on retry');
          return;
        }
      }
    }
    
    expect(isSelected).toBe(true);
    console.log('✅ Polygon selection test completed successfully');
  });

  test('should test selection reliability with multiple objects', async ({ page }) => {
    console.log('🚀 Testing selection reliability with multiple 3D objects...');

    await page.waitForSelector('canvas', { timeout: 10000 });
    const canvas = page.locator('canvas').first();
    const canvasBounds = await canvas.boundingBox();
    
    if (!canvasBounds) {
      throw new Error('Cannot get canvas bounds');
    }

    // 创建多个对象进行选择测试
    const objects = [
      {
        type: 'polyline',
        points: [{ x: 0.2, y: 0.2 }, { x: 0.4, y: 0.2 }, { x: 0.4, y: 0.4 }],
        selectionPoint: { x: 0.3, y: 0.2 }
      },
      {
        type: 'polygon', 
        points: [{ x: 0.6, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.4 }, { x: 0.6, y: 0.4 }],
        selectionPoint: { x: 0.7, y: 0.3 }
      },
      {
        type: 'polyline',
        points: [{ x: 0.2, y: 0.6 }, { x: 0.4, y: 0.6 }, { x: 0.4, y: 0.8 }],
        selectionPoint: { x: 0.3, y: 0.7 }
      }
    ];

    // 创建所有对象
    for (const obj of objects) {
      // 选择工具 (简化版本)
      if (obj.type === 'polyline') {
        await page.keyboard.press('KeyP');
      } else {
        await page.keyboard.press('KeyG');
      }
      await page.waitForTimeout(500);

      // 创建对象
      for (const point of obj.points) {
        const x = canvasBounds.x + canvasBounds.width * point.x;
        const y = canvasBounds.y + canvasBounds.height * point.y;
        await page.mouse.click(x, y);
        await page.waitForTimeout(300);
      }
      
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }

    // 测试选择每个对象
    let selectionCount = 0;
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      
      console.log(`Testing selection of ${obj.type} ${i + 1}...`);
      
      // 点击选择点
      const x = canvasBounds.x + canvasBounds.width * obj.selectionPoint.x;
      const y = canvasBounds.y + canvasBounds.height * obj.selectionPoint.y;
      
      await page.mouse.click(x, y);
      await page.waitForTimeout(1000);
      
      // 检查是否选中
      const isSelected = await page.evaluate(() => {
        const canvases = document.querySelectorAll('canvas');
        for (const canvas of canvases) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
              const r = imageData.data[i];
              const g = imageData.data[i + 1];
              const b = imageData.data[i + 2];
              const a = imageData.data[i + 3];
              
              if (a > 0 && r > 200 && g > 200 && b < 100) {
                return true;
              }
            }
          }
        }
        return false;
      });
      
      if (isSelected) {
        selectionCount++;
        console.log(`✅ ${obj.type} ${i + 1} selected successfully`);
      } else {
        console.log(`❌ ${obj.type} ${i + 1} selection failed`);
      }
    }

    console.log(`Selection success rate: ${selectionCount}/${objects.length}`);
    
    // 至少50%的选择应该成功
    expect(selectionCount).toBeGreaterThanOrEqual(Math.ceil(objects.length / 2));
  });
});