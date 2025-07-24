# 3D Polyline/Polygon 选中问题修复

## 问题描述

在3D环境中创建的polyline/polygon对象无法正常选中。用户点击这些对象时，选择功能不起作用。

## 问题根本原因

经过分析，发现主要问题出现在以下几个方面：

### 1. 射线投射缺少相机信息
在 `SelectAction.ts` 的 `fallbackRaycastSelection` 方法中，没有将相机信息传递给raycaster，导致 `Polyline3D` 和 `Polygon3D` 对象的自定义raycast方法无法获取相机信息来计算自适应阈值。

### 2. 屏幕投影坐标转换问题
在屏幕投影选择方法中，没有检查点是否在相机视锥内，导致不可见的点也被用于选择计算。

### 3. 选择阈值过于严格
原有的选择阈值对于3D环境中的交互来说过于严格，特别是在较远距离或特定角度下。

## 修复内容

### 1. 修复 SelectAction.ts

#### 1.1 增强 fallbackRaycastSelection 方法
```typescript
// 将相机信息传递给raycaster，供对象的自定义raycast方法使用
(this.raycaster as any).camera = this.renderView.camera;

// 使用更宽松的阈值
this.raycaster.params.Line = { threshold: SELECTION_CONFIG.THRESHOLDS.LINE * 2 };

// 添加对象类型优先级排序
validIntersects.sort((a, b) => {
    const getPriority = (obj: THREE.Object3D) => {
        const name = obj.constructor.name;
        switch (name) {
            case 'Polygon3D': return 4;
            case 'Segmentation3D': return 3;
            case 'Box': return 2;
            case 'Polyline3D': return 1;
            default: return 0;
        }
    };
    // ... 排序逻辑
});
```

#### 1.2 修复屏幕投影选择方法
在 `checkPolygonScreenProjection` 和 `checkPolylineScreenProjection` 方法中：
- 添加视锥检查，确保只有可见的点参与计算
- 增加选择容差（polygon边缘从10像素增加到15像素，polyline从8像素增加到12像素）
- 修复深度计算，使用有效点数量而不是总点数

### 2. 修复 Polygon3D.ts

```typescript
raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
    // 确保世界矩阵是最新的
    this.updateMatrixWorld();
    
    // 增强wireframe raycast参数
    if (this.wireframe) {
        const originalThreshold = raycaster.params.Line?.threshold || 10;
        const camera = (raycaster as any).camera;
        
        // 使用自适应阈值
        if (camera) {
            const adaptiveThreshold = getAdaptiveLineSelectionThreshold(
                raycaster, camera, this, SELECTION_CONFIG.THRESHOLDS.POLYGON_MULTIPLIER
            );
            raycaster.params.Line = { threshold: adaptiveThreshold };
        }
        
        this.wireframe.raycast(raycaster, tempIntersects);
        raycaster.params.Line = { threshold: originalThreshold };
    }
    // ... 其余逻辑
}
```

### 3. 修复 Polyline3D.ts

```typescript
raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    // 确保世界矩阵是最新的
    this.updateMatrixWorld();

    // 计算增强阈值
    const originalThreshold = raycaster.params.Line?.threshold || 10;
    const camera = (raycaster as any).camera;
    
    let enhancedThreshold = originalThreshold;
    if (camera) {
        enhancedThreshold = getAdaptiveLineSelectionThreshold(
            raycaster, camera, this, SELECTION_CONFIG.THRESHOLDS.POLYLINE_MULTIPLIER
        );
    }
    
    // 为内置raycast设置增强阈值
    raycaster.params.Line = { threshold: enhancedThreshold };
    super.raycast(raycaster, intersects);
    raycaster.params.Line = { threshold: originalThreshold };
    
    // ... 回退到自定义raycast逻辑
}
```

## 测试验证

### E2E测试
创建了完整的E2E测试用例：
- `e2e-tests/tests/e2e/pc-tool/polyline-polygon-selection.spec.ts`
- `e2e-tests/tests/pages/pc-tool/pc-tool-page.ts`

测试包括：
1. 3D polyline创建和选中功能
2. 3D polygon创建和选中功能（内部点击和边缘点击）
3. 多对象选择优先级测试
4. 空白区域点击测试

### 手动验证步骤

1. **创建3D Polyline**
   - 选择3D polyline工具
   - 在3D视图中点击多个点创建polyline
   - 按Enter键完成创建

2. **测试Polyline选中**
   - 切换到选择模式（或按ESC键）
   - 点击polyline的任意线段
   - 验证polyline被正确选中（高亮显示）

3. **创建3D Polygon**
   - 选择3D polygon工具
   - 在3D视图中点击多个点创建polygon
   - 按Enter键完成创建

4. **测试Polygon选中**
   - 点击polygon内部 → 应该选中polygon
   - 点击polygon边缘 → 应该选中polygon
   - 点击polygon外部 → 应该取消选择

## 配置优化

在 `SELECTION_CONFIG` 中的阈值配置已经过优化：
```typescript
export const SELECTION_CONFIG = {
    THRESHOLDS: {
        LINE: 10,
        POINTS: 10,
        POLYGON: 8,
        POLYLINE_MULTIPLIER: 3,  // polyline使用3倍基础阈值
        POLYGON_MULTIPLIER: 2    // polygon使用2倍基础阈值
    },
    EPSILON: 1e-6
};
```

## 预期效果

修复后，用户应该能够：
1. ✅ 正常选中3D环境中创建的polyline对象
2. ✅ 正常选中3D环境中创建的polygon对象（内部和边缘点击）
3. ✅ 在有多个重叠对象时，按优先级选择（Polygon > Segmentation > Box > Polyline）
4. ✅ 在不同距离和角度下都能稳定选中对象
5. ✅ 点击空白区域时正确取消选择

## 兼容性

这些修复：
- ✅ 保持了向后兼容性
- ✅ 不影响现有的2D选择功能
- ✅ 不影响其他3D对象（如Box）的选择
- ✅ 支持不同的相机角度和距离
- ✅ 在没有相机信息时提供合理的回退机制

## 总结

通过以上修复，3D环境中polyline/polygon对象的选中问题已得到解决。主要通过传递相机信息、优化坐标转换、增加选择容差和改进raycast逻辑来实现稳定可靠的选择功能。