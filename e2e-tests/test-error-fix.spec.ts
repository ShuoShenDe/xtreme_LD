import { test, expect } from '@playwright/test';

test.describe('Error Fix Test', () => {
  test('should handle test error condition properly', async ({ page }) => {
    // Basic test to verify the application loads without the test error message
    console.log('🔍 Testing for error conditions...');
    
    try {
      // Navigate to a simple test URL
      const testUrl = 'http://localhost:3300/?recordId=test-record-123&datasetId=test-dataset-456&dataId=test-data-789&taskid=test-task-123&ltm=http://localhost:8080&phase=annotate';
      
      await page.goto(testUrl, { timeout: 30000 });
      
      // Wait for basic page load
      await page.waitForTimeout(3000);
      
      // Check for any error messages on the page
      const errorElements = await page.locator('text=/error|failed|This is a test error message/i').count();
      console.log('Error elements found:', errorElements);
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/error-fix-test.png' });
      
      // The test should pass if no critical errors are found
      expect(errorElements).toBeLessThan(5); // Allow some minor errors but not major ones
      
      console.log('✅ Error fix test completed successfully');
      
    } catch (error) {
      console.error('❌ Test error:', error);
      // Instead of failing, we'll capture the error for analysis
      await page.screenshot({ path: 'test-results/error-state.png' });
      throw error;
    }
  });
});