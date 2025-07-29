const { chromium } = require('playwright');

async function healthCheck() {
  console.log('🏥 Running health check...');
  
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Simple test to verify Playwright works
    await page.goto('data:text/html,<h1>Health Check</h1>');
    const title = await page.textContent('h1');
    
    await browser.close();
    
    if (title === 'Health Check') {
      console.log('✅ Playwright health check passed');
      process.exit(0);
    } else {
      console.log('❌ Playwright health check failed');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    process.exit(1);
  }
}

healthCheck();
