// CI环境专用的Mock配置
// 这个文件会被提交到仓库中，确保CI环境有Mock API

// Mock数据
const mockData = {
  // 记录数据
  record: {
    code: 200,
    data: {
      id: 'test-record-123',
      itemType: 'DATA',
      serialNo: 'test-serial-001',
      datas: [
        {
          dataId: 'test-data-789',
          datasetId: 'test-dataset-456',
          sceneId: 'test-scene-001'
        }
      ]
    }
  },
  // 数据文件信息
  dataFiles: {
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
                  size: 181000,
                  url: '/image/20736.jpg'  // 使用public目录中的实际图片
                }
              }
            ]
          }
        ]
      }
    ]
  },
  // 标注数据
  annotations: {
    code: 200,
    data: [
      {
        dataId: 'test-data-789',
        objects: [],
        classificationValues: []
      }
    ]
  },
  // 类别定义
  classes: {
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
      },
      {
        id: 'class-3',
        name: 'bike',
        color: '#0000FF',
        toolType: 'POLYGON'
      }
    ]
  },
  // 分类定义
  classifications: {
    code: 200,
    data: []
  },
  // 用户登录状态
  userLogged: {
    code: 200,
    data: {
      id: 'test-user-123',
      username: 'test-user',
      email: 'test@example.com'
    }
  },
  // 数据集信息
  datasetInfo: {
    code: 200,
    data: {
      id: 'test-dataset-456',
      name: 'Test Dataset',
      type: 'IMAGE'
    }
  }
};

// 创建Mock插件
function mockApiPlugin() {
  return {
    name: 'mock-api-ci',
    configureServer(server) {
      // 添加静态文件和HTML的cookie设置中间件
      server.middlewares.use('/', (req, res, next) => {
        // 只对主HTML页面设置cookie (包含recordId参数的测试URL)
        if (req.url === '/' || req.url.includes('index.html') || req.url.includes('?recordId=')) {
          const hostname = req.headers.host?.split(':')[0] || 'localhost';
          console.log(`[CI Mock] Setting cookies for HTML page: ${req.url}`);
          res.setHeader('Set-Cookie', [
            `${hostname} token=test-token-value; Path=/; SameSite=Lax`,
            'Authorization=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token; Path=/; SameSite=Lax',
            'auth=authenticated; Path=/; SameSite=Lax',
            'user=test-user; Path=/; SameSite=Lax'
          ]);
        }
        next();
      });

      server.middlewares.use('/api', (req, res, next) => {
        const url = req.url;
        const method = req.method;
        
        // CI环境下的Mock API处理
        console.log(`[CI Mock API] ${method} ${url}`);
        
        // 设置响应头
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
        
        // 为API请求也设置认证cookies
        const hostname = req.headers.host?.split(':')[0] || 'localhost';
        res.setHeader('Set-Cookie', [
          `${hostname} token=test-token-value; Path=/; SameSite=Lax`,
          'Authorization=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token; Path=/; SameSite=Lax',
          'auth=authenticated; Path=/; SameSite=Lax',
          'user=test-user; Path=/; SameSite=Lax'
        ]);
        
        if (method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }
        
        // 路由处理
        if (url.includes('/data/findDataAnnotationRecord/')) {
          console.log('[CI Mock API] Returning record data');
          res.statusCode = 200;
          res.end(JSON.stringify(mockData.record));
        } else if (url.includes('/data/listByIds')) {
          console.log('[CI Mock API] Returning data files');
          res.end(JSON.stringify(mockData.dataFiles));
        } else if (url.includes('/annotate/data/listByDataIds')) {
          console.log('[CI Mock API] Returning annotations');
          res.end(JSON.stringify(mockData.annotations));
        } else if (url.includes('/ontology/class/findByDatasetId/') || url.includes('/datasetClass/findAll/')) {
          console.log('[CI Mock API] Returning classes');
          res.end(JSON.stringify(mockData.classes));
        } else if (url.includes('/datasetClassification/findAll/')) {
          console.log('[CI Mock API] Returning classifications');
          res.end(JSON.stringify(mockData.classifications));
        } else if (url.includes('/user/logged') || url.includes('/user/info') || url.includes('/user/current')) {
          console.log('[CI Mock API] Returning user info');
          const hostname = req.headers.host?.split(':')[0] || 'localhost';
          res.setHeader('Set-Cookie', [
            `${hostname} token=test-token-value; Path=/; SameSite=Lax`,
            'Authorization=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token; Path=/; SameSite=Lax',
            'auth=authenticated; Path=/; SameSite=Lax',
            'user=test-user; Path=/; SameSite=Lax'
          ]);
          res.end(JSON.stringify(mockData.userLogged));
        } else if (url.includes('/dataset/info/')) {
          console.log('[CI Mock API] Returning dataset info');
          res.end(JSON.stringify(mockData.datasetInfo));
        } else if (url.includes('/auth/login') || url.includes('/login')) {
          console.log('[CI Mock API] Returning login success');
          res.end(JSON.stringify({
            code: 200,
            data: {
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token',
              user: mockData.userLogged.data
            },
            message: 'Login successful'
          }));
        } else if (url.includes('/auth/verify') || url.includes('/verify')) {
          console.log('[CI Mock API] Returning token verification');
          res.end(JSON.stringify({
            code: 200,
            data: { valid: true },
            message: 'Token valid'
          }));
        } else if (url.includes('/model/list')) {
          console.log('[CI Mock API] Returning model list');
          res.end(JSON.stringify({ code: 200, data: [] }));
        } else if (url.includes('/data/findByPage')) {
          console.log('[CI Mock API] Returning page data');
          res.end(JSON.stringify({
            code: 200,
            data: {
              list: [
                {
                  id: 'test-data-789',
                  type: 'DATA',
                  name: 'test-image.jpg'
                }
              ],
              total: 1
            }
          }));
        } else if (url.includes('/data/getDataModelRunResult/')) {
          console.log('[CI Mock API] Returning model result');
          res.end(JSON.stringify({ code: 200, data: [] }));
        } else if (url.includes('/v1/jsonapi/models/tasks/')) {
          console.log('[CI Mock API] Returning LTM task');
          res.end(JSON.stringify({
            data: {
              type: 'tasks',
              id: 'test-task-123',
              attributes: {
                name: 'Test Task',
                phase: 'annotate',
                status: 'active'
              }
            }
          }));
        } else if (url.includes('/v1/jsonapi/models/projects/')) {
          console.log('[CI Mock API] Returning LTM project');
          res.end(JSON.stringify({
            data: {
              type: 'projects',
              id: 'test-project-456',
              attributes: {
                name: 'Test Project',
                status: 'active'
              }
            }
          }));
        } else if (url.includes('/v1/jsonapi/models/comments')) {
          console.log('[CI Mock API] Returning LTM comments');
          res.end(JSON.stringify({
            data: [],
            links: { self: url }
          }));
        } else if (url.includes('/v1/jsonapi/')) {
          console.log('[CI Mock API] Returning generic LTM response');
          res.end(JSON.stringify({
            data: {
              id: 'test-id',
              type: 'test-type',
              attributes: {},
              relationships: {}
            }
          }));
        } else if (url.startsWith('/api/')) {
          // 默认成功响应 - CI环境中所有未匹配的API都返回成功
          console.log(`[CI Mock API] Default success response for: ${url}`);
          res.statusCode = 200;
          res.end(JSON.stringify({ code: 200, data: {}, message: 'CI Mock Success' }));
        } else {
          next();
        }
      });
    }
  };
}

// 导出配置
module.exports = {
  plugins: [mockApiPlugin()]
}; 