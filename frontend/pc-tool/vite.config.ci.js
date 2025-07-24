// PC-Tool CI环境专用的Mock配置
// 这个文件会被提交到仓库中，确保CI环境有Mock API

// Mock数据
const mockData = {
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
      name: 'Test PC Dataset',
      type: 'LIDAR_FUSION'
    }
  },
  // 点云数据
  pointCloudData: {
    code: 200,
    data: {
      id: 'test-pointcloud-789',
      name: 'test-pointcloud.pcd',
      url: '/case-padaset/test.pcd'
    }
  }
};

// 创建Mock插件
function mockApiPlugin() {
  return {
    name: 'mock-api-pc-ci',
    configureServer(server) {
      // 添加HTML页面cookie设置中间件
      server.middlewares.use('/', (req, res, next) => {
        // 对主HTML页面设置cookie
        if (req.url === '/' || req.url.includes('index.html') || req.url.includes('?recordId=')) {
          const hostname = req.headers.host?.split(':')[0] || 'localhost';
          console.log(`[PC-Tool CI Mock] Setting cookies for HTML page: ${req.url}`);
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
        
        // PC-Tool CI环境下的Mock API处理
        console.log(`[PC-Tool CI Mock API] ${method} ${url}`);
        
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
        if (url.includes('/user/logged') || url.includes('/user/info') || url.includes('/user/current')) {
          console.log('[PC-Tool CI Mock API] Returning user info');
          res.end(JSON.stringify(mockData.userLogged));
        } else if (url.includes('/dataset/info/')) {
          console.log('[PC-Tool CI Mock API] Returning dataset info');
          res.end(JSON.stringify(mockData.datasetInfo));
        } else if (url.includes('/pointcloud/') || url.includes('/lidar/')) {
          console.log('[PC-Tool CI Mock API] Returning point cloud data');
          res.end(JSON.stringify(mockData.pointCloudData));
        } else if (url.includes('/auth/login') || url.includes('/login')) {
          console.log('[PC-Tool CI Mock API] Returning login success');
          res.end(JSON.stringify({
            code: 200,
            data: {
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token',
              user: mockData.userLogged.data
            },
            message: 'Login successful'
          }));
        } else if (url.includes('/auth/verify') || url.includes('/verify')) {
          console.log('[PC-Tool CI Mock API] Returning token verification');
          res.end(JSON.stringify({
            code: 200,
            data: { valid: true },
            message: 'Token valid'
          }));
        } else if (url.includes('/v1/jsonapi/')) {
          console.log('[PC-Tool CI Mock API] Returning LTM response');
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
          console.log(`[PC-Tool CI Mock API] Default success response for: ${url}`);
          res.statusCode = 200;
          res.end(JSON.stringify({ code: 200, data: {}, message: 'PC-Tool CI Mock Success' }));
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