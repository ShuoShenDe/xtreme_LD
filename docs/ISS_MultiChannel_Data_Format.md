# ISS 多通道数据格式详解

## 概述

ISS (Instance Semantic Segmentation) 对象支持两种数据格式：
1. **简单 ISS Metadata** - 当前使用的轻量级格式
2. **完整多通道数据** - 包含像素级别信息的完整格式

## 1. 简单 ISS Metadata 格式（当前使用）

```json
{
  "contour": {
    "points": [
      {"x": 100, "y": 200},
      {"x": 300, "y": 200}, 
      {"x": 300, "y": 400},
      {"x": 100, "y": 400}
    ],
    "area": 40000,
    "issMetadata": {
      "instanceId": 12345,
      "confidence": 1.0,
      "isVisible": true,
      "semanticLabel": 0,
      "imageSize": {
        "width": 1920,
        "height": 1080
      },
      "createdAt": "2023-12-07T10:30:00.000Z"
    }
  }
}
```

## 2. 完整多通道数据格式

### 2.1 原始多通道数据结构

```json
{
  "contour": {
    "points": [
      {"x": 100, "y": 200},
      {"x": 300, "y": 200}, 
      {"x": 300, "y": 400},
      {"x": 100, "y": 400}
    ],
    "area": 40000,
    "multiChannelMask": {
      "version": "2.0",
      "width": 1920,
      "height": 1080,
      "channels": {
        "foreground": {
          "data": [0, 0, 0, ..., 255, 255, 255, ..., 0, 0, 0],
          "type": "uint8"
        },
        "instance_id": {
          "data": [0, 0, 0, ..., 12345, 12345, 12345, ..., 0, 0, 0],
          "type": "uint16"
        },
        "visibility": {
          "data": [255, 255, 255, ..., 255, 255, 255, ..., 255, 255, 255],
          "type": "uint8"
        },
        "confidence": {
          "data": [1.0, 1.0, 1.0, ..., 1.0, 1.0, 1.0, ..., 1.0, 1.0, 1.0],
          "type": "float32"
        },
        "semantic": {
          "data": [0, 0, 0, ..., 1, 1, 1, ..., 0, 0, 0],
          "type": "uint8"
        },
        "depth": {
          "data": [0.0, 0.0, 0.0, ..., 5.2, 5.2, 5.2, ..., 0.0, 0.0, 0.0],
          "type": "float32"
        }
      },
      "metadata": {
        "instanceId": 12345,
        "confidence": 1.0,
        "isVisible": true,
        "semanticLabel": 1,
        "createdAt": "2023-12-07T10:30:00.000Z"
      }
    }
  }
}
```

### 2.2 压缩后发送到后端的格式

```json
{
  "contour": {
    "points": [
      {"x": 100, "y": 200},
      {"x": 300, "y": 200}, 
      {"x": 300, "y": 400},
      {"x": 100, "y": 400}
    ],
    "area": 40000,
    "multiChannelMask": {
      "version": "2.0",
      "instanceId": 12345,
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "channels": {
        "foreground": {
          "data": [
            {"start": 100, "length": 50, "value": 255},
            {"start": 200, "length": 30, "value": 255},
            {"start": 300, "length": 80, "value": 255}
          ],
          "type": "uint8",
          "compressed": true
        },
        "instance_id": {
          "data": [
            {"start": 100, "length": 50, "value": 12345},
            {"start": 200, "length": 30, "value": 12345},
            {"start": 300, "length": 80, "value": 12345}
          ],
          "type": "uint16",
          "compressed": true
        },
        "visibility": {
          "data": [255, 255, 255, 255, 255],
          "type": "uint8",
          "compressed": false
        },
        "confidence": {
          "data": [1.0, 1.0, 1.0, 1.0, 1.0],
          "type": "float32",
          "compressed": false
        },
        "semantic": {
          "data": [1, 1, 1, 1, 1],
          "type": "uint8",
          "compressed": false
        }
      },
      "metadata": {
        "instanceId": 12345,
        "confidence": 1.0,
        "isVisible": true,
        "semanticLabel": 1,
        "createdAt": "2023-12-07T10:30:00.000Z",
        "optimizedAt": "2023-12-07T10:30:01.000Z",
        "originalSize": 2073600,
        "compressedSize": 512
      }
    }
  }
}
```

## 3. 各通道数据说明

### 3.1 Foreground 通道 (前景遮罩)
- **数据类型**: uint8 (0-255)
- **含义**: 二进制遮罩，255表示前景像素，0表示背景像素
- **用途**: 像素级别的分割边界
- **压缩**: 使用 RLE (Run-Length Encoding) 压缩

### 3.2 Instance ID 通道 (实例ID)
- **数据类型**: uint16 (0-65535)
- **含义**: 每个像素的实例ID，同一实例的所有像素具有相同ID
- **用途**: 区分不同的实例对象
- **压缩**: 使用 RLE 压缩

### 3.3 Visibility 通道 (可见性)
- **数据类型**: uint8 (0-255)
- **含义**: 像素的可见性，255=完全可见，0=完全遮挡
- **用途**: 处理遮挡情况
- **压缩**: 采样存储（只存储代表性像素）

### 3.4 Confidence 通道 (置信度)
- **数据类型**: float32 (0.0-1.0)
- **含义**: 每个像素分割的置信度
- **用途**: 质量评估和不确定性量化
- **压缩**: 采样存储

### 3.5 Semantic 通道 (语义标签)
- **数据类型**: uint8 (0-255)
- **含义**: 像素的语义类别ID
- **用途**: 语义分割标注
- **压缩**: 采样存储

### 3.6 Depth 通道 (深度信息)
- **数据类型**: float32
- **含义**: 像素的深度值
- **用途**: 3D感知和深度估计
- **压缩**: 采样存储

## 4. 数据大小对比

### 简单 ISS Metadata
```
数据大小: ~200 bytes
传输时间: ~1ms
存储空间: 极小
```

### 完整多通道数据（原始）
```
1920×1080 图像:
- Foreground: 2,073,600 bytes
- Instance ID: 4,147,200 bytes  
- Visibility: 2,073,600 bytes
- Confidence: 8,294,400 bytes
- Semantic: 2,073,600 bytes
- Depth: 8,294,400 bytes
总计: ~25 MB
```

### 完整多通道数据（压缩后）
```
压缩后大小: ~500 KB (99.99% 压缩率)
传输时间: ~100ms
存储空间: 中等
```

## 5. 使用场景对比

| 特性 | 简单 Metadata | 完整多通道 |
|------|---------------|------------|
| 基础渲染 | ✅ | ✅ |
| 像素级精度 | ❌ | ✅ |
| 置信度信息 | 对象级 | 像素级 |
| 语义分割 | ❌ | ✅ |
| 3D感知 | ❌ | ✅ |
| ML训练 | 基础 | 完整 |
| 存储开销 | 极小 | 中等 |
| 传输开销 | 极小 | 中等 |

## 6. 启用完整多通道数据

当前系统默认使用简单 ISS Metadata 格式。如需启用完整多通道数据支持，需要：

1. 在 `result-save.ts` 中启用多通道数据生成
2. 在 `result-request.ts` 中启用多通道数据解压
3. 在 `Iss.ts` 中启用多通道渲染

```typescript
// 启用方法：将 handleISSObject 中的多通道生成代码取消注释
``` 