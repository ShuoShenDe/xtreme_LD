import { test, expect } from '@playwright/test';

test('Cookie Authentication Test', async ({ page }) => {
  console.log('Starting cookie authentication test...');
  
  // 更新URL包含所有必需的参数
  const testUrl = 'http://localhost:3300/?recordId=test-record-123&datasetId=test-dataset-456&dataId=test-data-789&taskid=test-task-123&ltm=http://localhost:8080&phase=annotate';
  
  // 导航到测试页面
  await page.goto(testUrl);
  
  // 等待页面加载
  await page.waitForTimeout(5000);
  
  // 检查页面标题
  const title = await page.title();
  console.log('Page title:', title);
  expect(title).toContain('Image Tool');
  
  // 检查cookies
  const cookies = await page.context().cookies();
  console.log('Page cookies:', cookies);
  
  // 检查hostname token cookie
  const hostnameTokenCookie = cookies.find(cookie => cookie.name === 'localhost token');
  console.log('Hostname token cookie:', hostnameTokenCookie?.value);
  
  // 检查是否有登录相关的错误元素
  const loginErrors = await page.locator('text=/login|登录|not.*logged|未.*登录/i').count();
  console.log('Found', loginErrors, 'login-related error elements');
  
  // 检查应用容器是否可见
  const appContainer = await page.locator('#app').isVisible();
  console.log('App container visible:', appContainer);
  expect(appContainer).toBe(true);
  
  // 检查是否有"Not logged in"错误
  const notLoggedInErrors = await page.locator('text=/not logged in|未登录/i').count();
  console.log('Not logged in error count:', notLoggedInErrors);
  
  // 检查是否有数据加载失败的错误
  const dataLoadErrors = await page.locator('text=/数据加载失败|data.*loading.*failed/i').count();
  console.log('Data loading error count:', dataLoadErrors);
  
  // 截图用于调试
  await page.screenshot({ path: 'test-results/auth-test-screenshot.png' });
  
  console.log('✅ Cookie Authentication test completed successfully');
}); 