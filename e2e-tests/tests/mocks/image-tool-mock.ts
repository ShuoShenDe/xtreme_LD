import { Page } from '@playwright/test';

export class ImageToolMock {
  constructor(private page: Page) {}

  async setupMockAuth(): Promise<void> {
    // Mock JWT token - 一个有效的测试token
    const mockToken = 'Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJ0ZWFtSWQiOiIxIiwiaXNzIjoiYmFzaWMuYWkiLCJpYXQiOjE2NTI0MDc3MDcsImV4cCI6OTk5OTk5OTk5OX0.test-signature';
    
    // 使用addInitScript在页面加载前设置认证信息
    await this.page.addInitScript((token) => {
      localStorage.setItem('authToken', token);
      localStorage.setItem('username', 'test-user');
      localStorage.setItem('refreshToken', 'test-refresh-token');
    }, mockToken);

    // 设置cookie认证（用于useToken）
    await this.page.context().addCookies([
      {
        name: 'localhost token',
        value: mockToken.replace('Bearer ', ''),
        domain: 'localhost',
        path: '/',
      }
    ]);
  }

  async setupMockAPI(): Promise<void> {
    // Mock API responses
    await this.page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      console.log(`Mocking API: ${method} ${url}`);

      if (url.includes('/api/data/findDataAnnotationRecord/')) {
        // Mock record data
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            data: {
              id: 'test-record-123',
              itemType: 'DATA',
              serialNo: 'test-serial',
              datas: [
                {
                  dataId: 'test-data-789',
                  datasetId: 'test-dataset-456',
                  sceneId: 'test-scene'
                }
              ]
            }
          })
        });
      } else if (url.includes('/api/data/listByIds')) {
        // Mock data file info
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            data: [
              {
                id: 'test-data-789',
                name: 'test-image.jpg',
                datasetId: 'test-dataset-456',
                annotationStatus: 'NOT_ANNOTATED',
                status: 'VALID',
                content: [
                  {
                    name: 'main',
                    files: [
                      {
                        file: {
                          size: 100000,
                          url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          })
        });
      } else if (url.includes('/api/annotate/data/listByDataIds')) {
        // Mock annotation data
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            data: [
              {
                dataId: 'test-data-789',
                objects: [],
                classificationValues: []
              }
            ]
          })
        });
      } else if (url.includes('/api/ontology/class/findByDatasetId/')) {
        // Mock class definitions
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            data: [
              {
                id: 'class-1',
                name: 'person',
                color: '#FF0000',
                toolType: 'BOUNDING_BOX'
              },
              {
                id: 'class-2', 
                name: 'car',
                color: '#00FF00',
                toolType: 'BOUNDING_BOX'
              }
            ]
          })
        });
      } else if (url.includes('/api/v1/jsonapi/models/')) {
        // Mock LTM API responses
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'test-id',
              type: 'test-type',
              attributes: {},
              relationships: {}
            }
          })
        });
      } else {
        // Default response for unmocked APIs
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 200, data: {} })
        });
      }
    });
  }

  async setupMockEditor(): Promise<void> {
    // 在页面中注入编辑器实例以供测试使用
    await this.page.addInitScript(() => {
      // Mock global editor object
      (window as any).editor = {
        selection: [],
        needSave: () => false,
        save: () => Promise.resolve(),
        clear: () => {},
        getCurrentFrame: () => ({ id: 'test-data-789' }),
        getFrameIndex: () => 0,
        state: {
          frames: [{ id: 'test-data-789' }],
          models: []
        }
      };
    });
  }

  async setupTestImage(): Promise<void> {
    // 创建一个简单的测试图像
    await this.page.addInitScript(() => {
      // Override image loading to use test data
      const originalImage = window.Image;
      (window as any).Image = function() {
        const img = new originalImage();
        // Set a small test image data URL
        setTimeout(() => {
          Object.defineProperty(img, 'width', { value: 800, writable: false });
          Object.defineProperty(img, 'height', { value: 600, writable: false });
          img.onload && img.onload({} as any);
        }, 100);
        return img;
      };
    });
  }

  async setupMockEnvironment(): Promise<void> {
    // 设置更全面的Mock环境
    await this.page.addInitScript(() => {
      // Mock window.Cookies for useToken
      (window as any).Cookies = {
        get: (name: string) => {
          if (name.includes('token')) {
            return 'Bearer-test-token-123';
          }
          return null;
        }
      };

      // Mock console methods to reduce noise
      const originalConsole = console;
      (window as any).console = {
        ...originalConsole,
        error: (...args: any[]) => {
          // Filter out known errors that are expected in test environment
          const message = args.join(' ');
          if (!message.includes('Not logged in') && !message.includes('Invalid Query')) {
            originalConsole.error(...args);
          }
        }
      };
    });
  }

  async setup(): Promise<void> {
    console.log('Setting up Image-Tool mock environment...');
    
    await this.setupMockAuth();
    await this.setupMockAPI();
    await this.setupMockEditor();
    await this.setupTestImage();
    await this.setupMockEnvironment();
    
    console.log('Image-Tool mock environment ready');
  }
} 