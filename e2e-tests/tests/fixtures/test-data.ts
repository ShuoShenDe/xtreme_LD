/**
 * 测试数据配置
 * 提供各种测试场景所需的数据
 */

export interface TestImageData {
  name: string;
  path: string;
  width: number;
  height: number;
  description: string;
}

export interface TestAnnotationData {
  type: 'rect' | 'polygon' | 'polyline' | 'key-point';
  coordinates: number[];
  properties?: Record<string, any>;
}

// 测试图像数据
export const TEST_IMAGES: TestImageData[] = [
  {
    name: 'sample-image-1',
    path: '/test-data/images/sample1.jpg',
    width: 1920,
    height: 1080,
    description: '标准测试图像 - 城市场景'
  },
  {
    name: 'sample-image-2',
    path: '/test-data/images/sample2.jpg',
    width: 1280,
    height: 720,
    description: '测试图像 - 自然场景'
  },
  {
    name: 'small-image',
    path: '/test-data/images/small.jpg',
    width: 640,
    height: 480,
    description: '小尺寸测试图像'
  },
  {
    name: 'large-image',
    path: '/test-data/images/large.jpg',
    width: 4096,
    height: 2160,
    description: '大尺寸测试图像'
  }
];

// 测试矩形标注数据
export const TEST_RECTANGLES: TestAnnotationData[] = [
  {
    type: 'rect',
    coordinates: [0.1, 0.1, 0.4, 0.4], // [x1, y1, x2, y2] 相对坐标
    properties: { label: '汽车', confidence: 0.95 }
  },
  {
    type: 'rect',
    coordinates: [0.6, 0.2, 0.9, 0.6],
    properties: { label: '行人', confidence: 0.87 }
  },
  {
    type: 'rect',
    coordinates: [0.2, 0.7, 0.5, 0.9],
    properties: { label: '建筑物', confidence: 0.92 }
  }
];

// 测试多边形数据
export const TEST_POLYGONS: TestAnnotationData[] = [
  {
    type: 'polygon',
    coordinates: [0.1, 0.1, 0.3, 0.1, 0.4, 0.3, 0.2, 0.4], // [x1,y1, x2,y2, ...]
    properties: { label: '不规则区域' }
  }
];

// 性能测试配置
export const PERFORMANCE_CONFIG = {
  // 批量创建测试
  BATCH_CREATION: {
    SMALL: 10,
    MEDIUM: 50,
    LARGE: 100
  },
  // 性能阈值（毫秒）
  THRESHOLDS: {
    PAGE_LOAD: 5000,
    TOOL_SWITCH: 500,
    ANNOTATION_CREATE: 1000,
    ANNOTATION_DELETE: 500,
    CANVAS_RENDER: 2000
  }
};

// 视觉回归测试基线
export const VISUAL_BASELINES = {
  CLEAN_CANVAS: 'clean-canvas.png',
  SINGLE_RECT: 'single-rectangle.png',
  MULTIPLE_RECTS: 'multiple-rectangles.png',
  TOOL_SELECTED: 'rect-tool-selected.png'
};

// 错误场景测试数据
export const ERROR_SCENARIOS = {
  INVALID_COORDINATES: [
    { x: -1, y: 0.5 },    // 负坐标
    { x: 0.5, y: 2 },     // 超出范围
    { x: NaN, y: 0.5 },   // 无效数值
    { x: 0.5, y: null }   // 空值
  ],
  EXTREME_SIZES: [
    { width: 1, height: 1 },           // 极小尺寸
    { width: 10000, height: 10000 },   // 极大尺寸
    { width: 0, height: 100 },         // 零宽度
    { width: 100, height: 0 }          // 零高度
  ]
};

// 工具快捷键映射
export const TOOL_SHORTCUTS = {
  edit: 'q',
  rect: '1',
  polygon: '2',
  polyline: '3',
  'key-point': '4',
  undo: 'Control+z',
  redo: 'Control+y',
  save: 'Control+s',
  delete: 'Delete'
};

// 常用测试选择器
export const SELECTORS = {
  // 主要容器
  MAIN_CONTAINER: '.image-editor-wrap',
  CANVAS: 'canvas',
  TOOL_BAR: '.image-editor-tool',
  OPERATION_PANEL: '.operation-panel',
  
  // 工具按钮
  RECT_TOOL: '[data-tool="rect"]',
  EDIT_TOOL: '[data-tool="edit"]',
  POLYGON_TOOL: '[data-tool="polygon"]',
  POLYLINE_TOOL: '[data-tool="polyline"]',
  ISS_TOOL: '[data-tool="iss"]',
  ISS_RECT_TOOL: '[data-tool="iss-rect"]',
  ISS_POINTS_TOOL: '[data-tool="iss-points"]',
  
  // 注释列表
  ANNOTATION_LIST: '.annotation-list',
  ANNOTATION_ITEM: '.annotation-item',
  
  // 加载状态
  LOADING: '.loading, .ant-spin',
  
  // 菜单和弹窗
  CONTEXT_MENU: '.ant-dropdown',
  MODAL: '.ant-modal',
  
  // 状态指示器
  ACTIVE_TOOL: '.tool-item.active',
  SELECTED_ANNOTATION: '.annotation-item.selected'
};

// 辅助函数
export const TestDataUtils = {
  /**
   * 生成随机矩形坐标
   */
  generateRandomRect(): number[] {
    const x1 = Math.random() * 0.7;
    const y1 = Math.random() * 0.7;
    const x2 = x1 + Math.random() * (0.9 - x1);
    const y2 = y1 + Math.random() * (0.9 - y1);
    return [x1, y1, x2, y2];
  },

  /**
   * 生成批量矩形坐标
   */
  generateBatchRects(count: number): number[][] {
    const rects: number[][] = [];
    for (let i = 0; i < count; i++) {
      rects.push(this.generateRandomRect());
    }
    return rects;
  },

  /**
   * 转换相对坐标到像素坐标
   */
  relativeToPixel(relativeCoords: number[], canvasWidth: number, canvasHeight: number): number[] {
    return [
      relativeCoords[0] * canvasWidth,
      relativeCoords[1] * canvasHeight,
      relativeCoords[2] * canvasWidth,
      relativeCoords[3] * canvasHeight
    ];
  },

  /**
   * 验证矩形坐标的有效性
   */
  validateRectCoords(coords: number[]): boolean {
    if (coords.length !== 4) return false;
    const [x1, y1, x2, y2] = coords;
    return x1 >= 0 && y1 >= 0 && x2 <= 1 && y2 <= 1 && x1 < x2 && y1 < y2;
  }
}; 