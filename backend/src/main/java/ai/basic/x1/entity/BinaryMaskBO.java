package ai.basic.x1.entity;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

/**
 * Binary Mask Business Object for ISS (Instance Semantic Segmentation)
 * 用于ISS物体语义分割的二进制掩码数据结构
 * 
 * @author ISS Implementation Team
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BinaryMaskBO {
    
    /**
     * 掩码宽度（基于原图尺寸）
     */
    private Integer width;
    
    /**
     * 掩码高度（基于原图尺寸）
     */
    private Integer height;
    
    /**
     * 二进制掩码数据
     * 扁平化的0/1数组，长度为 width * height
     * 0表示背景，1表示前景（物体区域）
     */
    private List<Integer> data;
    
    /**
     * RLE压缩数据（可选）
     * 格式: "0:1234,1:567,0:890"
     * 用于大图像的存储优化
     */
    private String rleData;
    
    /**
     * 是否使用压缩格式
     * true: 使用rleData字段
     * false: 使用data字段
     */
    @Builder.Default
    private Boolean isCompressed = false;
    
    /**
     * 掩码面积（像素数量）
     * 等于data数组中值为1的元素个数
     */
    private Integer area;
    
    /**
     * 数据版本，用于兼容性
     */
    @Builder.Default
    private String version = "1.0";
    
    /**
     * 获取有效像素数量
     * @return 前景像素数量
     */
    public Integer getPixelCount() {
        if (area != null) {
            return area;
        }
        
        if (data != null && !data.isEmpty()) {
            return (int) data.stream().mapToInt(Integer::intValue).sum();
        }
        
        return 0;
    }
    
    /**
     * 验证掩码数据的完整性
     * @return 是否有效
     */
    public boolean isValid() {
        if (width == null || height == null || width <= 0 || height <= 0) {
            return false;
        }
        
        int expectedSize = width * height;
        
        if (isCompressed) {
            return rleData != null && !rleData.trim().isEmpty();
        } else {
            return data != null && data.size() == expectedSize;
        }
    }
    
    /**
     * 获取掩码覆盖率（0-1）
     * @return 前景像素占总像素的比例
     */
    public Double getCoverage() {
        if (width == null || height == null) {
            return 0.0;
        }
        
        int totalPixels = width * height;
        int foregroundPixels = getPixelCount();
        
        return totalPixels > 0 ? (double) foregroundPixels / totalPixels : 0.0;
    }
} 