import { Page, Locator, expect } from '@playwright/test';

export interface Point2D {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 基础页面对象模型类
 * 提供通用的页面操作方法
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * 导航到页面
   */
  abstract navigateTo(): Promise<void>;

  /**
   * 等待页面加载完成
   */
  abstract waitForLoad(): Promise<void>;

  /**
   * 等待元素出现
   */
  async waitForElement(selector: string, timeout = 30000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ timeout });
    return element;
  }

  /**
   * 等待元素消失
   */
  async waitForElementToHide(selector: string, timeout = 30000): Promise<void> {
    await this.page.locator(selector).waitFor({ state: 'hidden', timeout });
  }

  /**
   * 截图
   */
  async screenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }

  /**
   * 等待网络空闲
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 模拟键盘按键
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * 模拟组合键
   */
  async pressKeys(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.page.keyboard.down(key);
    }
    for (const key of keys.reverse()) {
      await this.page.keyboard.up(key);
    }
  }

  /**
   * 获取元素的边界框
   */
  async getElementBounds(selector: string): Promise<Rect | null> {
    const element = this.page.locator(selector);
    return await element.boundingBox();
  }

  /**
   * 滚动到元素
   */
  async scrollToElement(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * 等待文本出现
   */
  async waitForText(text: string, timeout = 30000): Promise<void> {
    await this.page.getByText(text).waitFor({ timeout });
  }

  /**
   * 验证元素是否存在
   */
  async verifyElementExists(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * 验证元素是否不存在
   */
  async verifyElementNotExists(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  /**
   * 获取元素文本
   */
  async getElementText(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  /**
   * 获取元素属性
   */
  async getElementAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.page.locator(selector).getAttribute(attribute);
  }

  /**
   * 清理方法，在测试结束时调用
   */
  async cleanup(): Promise<void> {
    // 子类可以重写此方法
  }
} 