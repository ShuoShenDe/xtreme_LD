import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'html-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  /* Shared settings for all the tests */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'on', // 总是截屏，方便查看测试过程
    video: 'on', // 总是录制视频
    headless: true, // 使用无头模式提高性能
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'image-tool',
      use: {
        ...devices['Desktop Chrome'],
        // 使用简化的基础URL，Mock环境会处理认证和数据
        baseURL: 'http://localhost:3300',
        // 增加超时时间以等待Mock环境初始化
        timeout: 30000,
        navigationTimeout: 30000,
      },
      testDir: './tests/e2e/image-tool',
    },
    {
      name: 'pc-tool',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3200',
        timeout: 30000,
        navigationTimeout: 30000,
      },
      testDir: './tests/e2e/pc-tool',
    },
  ],

  /* Global test timeout */
  timeout: 60000,

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },

  /* Test output directory */
  outputDir: 'test-results',
}); 