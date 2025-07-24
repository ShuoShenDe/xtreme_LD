# ISS和3D数据导入导出实施指南

## 🎯 概述

本指南介绍如何在Xtreme1系统中实现对ISS（Instance Semantic Segmentation）和3D polygon/polyline数据的导入导出支持。

## 🏗️ 架构概览

```
ISS和3D数据支持架构
├── 前端 (Frontend)
│   ├── 类型定义 (export.ts)
│   ├── ISS掩码处理 (UnifiedMaskBuilder)
│   └── 3D坐标处理
├── 后端 (Backend)
│   ├── 对象类型枚举 (ObjectTypeEnum)
│   ├── 导出实体类 (DataResultObjectExportBO)
│   ├── ISS数据处理 (IssDataExportUtil)
│   └── 增强导出服务 (EnhancedDataExportUseCase)
└── 数据格式
    ├── ISS_ENHANCED 格式
    └── 3D_ENHANCED 格式
```

## 🔧 实现的功能

### 1. 支持的数据类型

#### ISS（物体语义分割）类型
- `ISS_UNIFIED` - ISS unified mask

#### 3D数据类型
- `THREE_D_POLYGON` - 3D多边形
- `THREE_D_POLYLINE` - 3D折线
- `THREE_D_SEGMENTATION` - 3D分割

### 2. 数据结构支持

#### ISS多通道掩码数据
```json
{
  "multiChannelMask": {
    "width": 1920,
    "height": 1080,
    "channels": {
      "instanceId": {
        "data": [1, 2, 3, ...],
        "dataType": "uint16",
        "description": "Instance ID channel"
      },
      "classId": {
        "data": [10, 20, 30, ...],
        "dataType": "uint8",
        "description": "Class ID channel"
      },
      "confidence": {
        "data": [0.9, 0.8, 0.7, ...],
        "dataType": "float32",
        "description": "Confidence channel"
      }
    },
    "pixelAttributes": [
      {
        "id": 1,
        "visible": true,
        "confidence": 0.95,
        "category": 10
      }
    ],
    "metadata": {
      "version": "1.0",
      "created": "2024-01-01T00:00:00Z",
      "compressed": true,
      "totalChannels": 3,
      "totalInstances": 50,
      "totalPixels": 2073600,
      "annotatedPixels": 156800
    }
  }
}
```

#### 3D坐标数据
```json
{
  "points3D": [
    {"x": 10.5, "y": 20.3, "z": 1.2},
    {"x": 15.7, "y": 25.1, "z": 1.8}
  ],
  "zCoordinate": 1.5,
  "height": 2.0,
  "rotation3D": {
    "pitch": 0.1,
    "yaw": 0.2,
    "roll": 0.0
  }
}
```

## 💡 使用方法

### 1. 导出ISS数据

#### 后端使用示例
```java
@Autowired
private EnhancedDataExportUseCase enhancedExportUseCase;

// 在现有导出逻辑中调用增强处理
List<DataResultObjectExportBO> objects = getExportObjects();
enhancedExportUseCase.enhanceObjectExport(objects, classMap);

// 生成导出摘要
ExportSummary summary = enhancedExportUseCase.generateExportSummary(objects);
log.info("Export completed: {}", summary);
```

#### 前端导出配置
```typescript
import { ExportFormat, ExportConfig } from './types/export';

const exportConfig: ExportConfig = {
  format: ExportFormat.ISS_ENHANCED,
  includeISSMasks: true,
  include3DCoordinates: true,
  compressMasks: true,
  includeMetadata: true,
  coordinateSystem: 'ISS_PIXEL'
};
```

### 2. 导入ISS数据

#### 数据验证
```java
// 在导入前验证数据
if (IssDataExportUtil.isIssType(objectType)) {
    boolean isValid = IssDataExportUtil.validateIssData(contour);
    if (!isValid) {
        throw new ValidationException("Invalid ISS data");
    }
}
```

#### 前端数据处理
```typescript
import { UnifiedMaskBuilder } from './utils/unified-mask-builder';

// 处理ISS掩码数据
const maskBuilder = new UnifiedMaskBuilder(width, height);
regions.forEach(region => {
    maskBuilder.addRegion(region);
});
const unifiedMask = maskBuilder.build();
```

### 3. 导出3D数据

#### 配置3D导出
```typescript
const export3DConfig: ExportConfig = {
  format: ExportFormat.THREE_D_ENHANCED,
  includeISSMasks: false,
  include3DCoordinates: true,
  compressMasks: false,
  includeMetadata: true,
  coordinateSystem: '3D_WORLD'
};
```

#### 后端3D数据处理
```java
// 处理3D对象
if (IssDataExportUtil.is3DType(objectType)) {
    IssDataExportUtil.process3DData(contour, exportBO, objectType);
}
```

## 🧪 测试方法

### 1. 单元测试

#### 测试ISS数据处理
```java
@Test
public void testIssDataProcessing() {
    JSONObject contour = createIssContour();
    DataResultObjectExportBO exportBO = new DataResultObjectExportBO();
    
    IssDataExportUtil.processIssData(contour, exportBO);
    
    assertNotNull(exportBO.getMultiChannelMask());
    assertNotNull(exportBO.getIssMetadata());
}
```

#### 测试3D数据处理
```java
@Test
public void test3DDataProcessing() {
    JSONObject contour = create3DContour();
    DataResultObjectExportBO exportBO = new DataResultObjectExportBO();
    
    IssDataExportUtil.process3DData(contour, exportBO, "THREE_D_POLYGON");
    
    assertNotNull(exportBO.getPoints3D());
    assertTrue(exportBO.getPoints3D().size() > 0);
}
```

### 2. 集成测试

#### 完整导出流程测试
```java
@Test
public void testEnhancedExportFlow() {
    // 准备测试数据
    List<DataResultObjectExportBO> objects = createTestObjects();
    
    // 执行增强导出
    enhancedExportUseCase.enhanceObjectExport(objects, classMap);
    
    // 验证结果
    ExportSummary summary = enhancedExportUseCase.generateExportSummary(objects);
    assertEquals(5, summary.issObjectCount);
    assertEquals(3, summary.threeDObjectCount);
}
```

## 📝 配置更新

### 1. 更新导出格式选择

修改前端ExportModal.vue：
```typescript
let dataFormatOption = computed(() => {
  const baseOptions = [
    { value: 'XTREME1', label: 'Xtreme1' },
  ];
  
  if (hasIssData.value) {
    baseOptions.push({ value: 'ISS_ENHANCED', label: 'ISS Enhanced' });
  }
  
  if (has3DData.value) {
    baseOptions.push({ value: '3D_ENHANCED', label: '3D Enhanced' });
  }
  
  if (props.datasetType?.includes('IMAGE')) {
    baseOptions.push({ value: 'COCO', label: 'COCO' });
  }
  
  return baseOptions;
});
```

### 2. 数据库迁移

由于使用JSON字段存储轮廓数据，无需修改数据库表结构。

## 🔍 监控和日志

### 1. 关键日志点
- ISS数据处理成功/失败
- 3D坐标转换状态
- 导出性能指标
- 数据验证结果

### 2. 性能监控
```java
@Component
public class ExportMetrics {
    private final MeterRegistry meterRegistry;
    
    public void recordIssExport(int objectCount, long processingTime) {
        meterRegistry.counter("iss.export.objects").increment(objectCount);
        meterRegistry.timer("iss.export.processing.time").record(processingTime, TimeUnit.MILLISECONDS);
    }
}
```

## 🚀 部署步骤

### 1. 后端部署
1. 编译新增的Java类
2. 更新Spring配置
3. 重启应用服务

### 2. 前端部署
1. 编译TypeScript类型定义
2. 更新导出UI组件
3. 部署前端资源

### 3. 验证部署
1. 测试ISS数据导出
2. 测试3D数据导出
3. 验证导入功能
4. 检查性能指标

## 🔗 相关文档

- [UnifiedMaskBuilder使用指南](./unified-mask-system-guide.md)
- [3D坐标系统文档](./3d-coordinate-system.md)
- [导入导出API文档](./import-export-api.md)

## 📞 技术支持

如果在实施过程中遇到问题，请参考：
- 系统日志：检查`iss.export.*`和`3d.export.*`相关日志
- 性能监控：查看导出处理时间指标
- 数据验证：使用内置的数据验证方法

---

*最后更新：2024年1月* 