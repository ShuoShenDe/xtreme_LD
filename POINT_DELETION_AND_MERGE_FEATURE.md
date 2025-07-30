# 2D图形点删除和点合并功能

本文档描述了为2D Polyline和Polygon工具新增的点删除和点合并功能。

## 功能概述

### 1. 单点删除功能
- **问题描述**: 之前按删除键(Del)会删除整个Polyline/Polygon对象
- **解决方案**: 现在当选中某个锚点时，按删除键只会删除该点，而不是整个图形
- **安全保护**: 当点数达到最小值时（Polyline最少2点，Polygon最少3点），将阻止删除操作

### 2. 点自动合并功能
- **功能描述**: 当拖动某个点使其与相邻点重合时（距离小于10像素），会自动合并这两个点
- **适用范围**: 
  - Polyline: 检查与前一个点和后一个点的距离
  - Polygon: 除了检查相邻点，还检查首尾点之间的距离（因为多边形是封闭的）

## 实现详情

### 修改的文件

#### 1. `frontend/image-tool/src/package/image-editor/ImageView/shapeTool/PolylineTool.ts`
**新增功能**:
- `selectedAnchorIndex`: 记录当前选中的锚点索引
- `selectAnchor()`: 锚点选择方法
- `checkEditAction()`: 支持删除动作检查
- `onToolDelete()`: 删除选中锚点的实现
- `checkAndMergePoints()`: 点合并检测逻辑
- **修改的事件处理**:
  - 锚点点击事件：支持锚点选择
  - 拖拽移动事件：增加点合并检测

#### 2. `frontend/image-tool/src/package/image-editor/ImageView/shapeTool/PolygonTool.ts`
**新增功能**:
- `checkAndMergePointsPolygon()`: 多边形特有的点合并逻辑（包括首尾点连接）
- **修改的事件处理**:
  - 重写锚点拖拽事件以使用多边形特有的合并逻辑

### 核心实现逻辑

#### 点删除逻辑
```typescript
onToolDelete() {
  if (!this.object || this.selectedAnchorIndex === -1) return;
  
  const currentPoints = [...(this.object.attrs.points || [])];
  
  // 检查最小点数限制
  if (currentPoints.length <= this._minPointNum) {
    console.warn(`Cannot delete point: minimum ${this._minPointNum} points required`);
    return;
  }
  
  // 删除选中的点
  currentPoints.splice(this.selectedAnchorIndex, 1);
  this.object.setAttrs({ points: currentPoints });
  // ... 更新UI
}
```

#### 点合并逻辑
```typescript
checkAndMergePoints(points: Vector2[], dragIndex: number): Vector2[] {
  const mergeThreshold = 10; // 像素阈值
  const dragPoint = points[dragIndex];
  
  // 检查与前后相邻点的距离
  if (distance < mergeThreshold) {
    // 删除当前点实现合并
    const mergedPoints = [...points];
    mergedPoints.splice(dragIndex, 1);
    return mergedPoints;
  }
  
  return points; // 无需合并
}
```

## 测试用例

创建了完整的端到端测试文件：`e2e-tests/tests/e2e/image-tool/point-deletion-and-merge.spec.ts`

### 测试场景

1. **点删除测试**
   - ✅ 从Polyline删除选中的点
   - ✅ 从Polygon删除选中的点
   - ✅ 阻止删除导致点数低于最小值的操作

2. **点合并测试**
   - ✅ Polyline中拖动点重合时自动合并
   - ✅ Polygon中拖动点重合时自动合并（包括首尾点）

3. **边界条件测试**
   - ✅ 防止Polyline点数少于2个
   - ✅ 防止Polygon点数少于3个

## 使用方法

### 删除点
1. 使用Polyline或Polygon工具创建图形
2. 切换到编辑工具(选择图标)
3. 点击要编辑的图形以进入编辑模式
4. 点击要删除的锚点（锚点会显示为选中状态）
5. 按删除键(Del/Backspace)删除该点

### 合并点
1. 进入编辑模式
2. 拖动某个锚点
3. 将其拖动到相邻点附近（距离小于10像素）
4. 松开鼠标，两个点会自动合并为一个

## 运行测试

### 前提条件
确保开发服务器运行在 `http://localhost:3300`

### 运行测试命令
```bash
# 进入测试目录
cd e2e-tests

# 安装依赖
npm install

# 运行特定的点删除和合并测试
npx playwright test point-deletion-and-merge.spec.ts

# 运行所有image-tool测试
npx playwright test tests/e2e/image-tool/

# 以调试模式运行（可视化）
npx playwright test point-deletion-and-merge.spec.ts --debug
```

## 技术细节

### 关键技术决策

1. **合并阈值**: 设置为10像素，在用户体验和精度之间取得平衡
2. **最小点数保护**: 
   - Polyline: 最少2个点（构成一条线段）
   - Polygon: 最少3个点（构成一个三角形）
3. **事件处理**: 使用Konva.js的事件系统，确保与现有编辑工具兼容
4. **状态管理**: 通过`selectedAnchorIndex`跟踪当前选中的锚点

### 兼容性考虑

- 保持向后兼容，不影响现有功能
- 继承现有的编辑模式和工具切换逻辑
- 使用现有的命令系统支持撤销/重做功能

## 注意事项

1. **最小点数限制**: 系统会阻止删除导致图形无效的操作
2. **合并距离**: 10像素的合并阈值在不同缩放级别下可能需要调整
3. **性能**: 大量点的图形在合并检测时可能有轻微性能影响
4. **用户反馈**: 删除和合并操作都有控制台日志输出，便于调试

## 后续改进建议

1. **可配置阈值**: 允许用户或系统配置合并距离阈值
2. **视觉反馈**: 在拖拽过程中显示合并预览
3. **撤销支持**: 完善删除和合并操作的撤销功能
4. **性能优化**: 对大量点的图形进行优化