package ai.basic.x1.entity;

import cn.hutool.json.JSONObject;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * ISS (Instance Semantic Segmentation) Data Export Business Object
 * 用于ISS物体语义分割数据的导出
 * 
 * @author ISS Implementation Team
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssDataExportBO {

    /**
     * ISS Object ID
     */
    private String objectId;

    /**
     * Object Type (ISS_UNIFIED)
     */
    private String objectType;

    /**
     * Class ID
     */
    private Long classId;

    /**
     * Class Name
     */
    private String className;

    /**
     * Multi-Channel Mask Data
     */
    private MultiChannelMaskData multiChannelMask;

    /**
     * Bounding Box (for ISS_UNIFIED instances)
     */
    private BoundingBox boundingBox;

    /**
     * Polygon Points (for ISS_UNIFIED instances)
     */
    private List<Point2D> polygonPoints;

    /**
     * Instance Metadata
     */
    private JSONObject metadata;

    /**
     * Multi-Channel Mask Data Structure
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MultiChannelMaskData {
        private Integer width;
        private Integer height;
        private Map<String, ChannelData> channels;
        private List<PixelAttribute> pixelAttributes;
        private MaskMetadata metadata;
    }

    /**
     * Channel Data Structure
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChannelData {
        private List<Integer> data;
        private String dataType; // uint8, uint16, float32
        private String description;
    }

    /**
     * Pixel Attribute Structure
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PixelAttribute {
        private Integer id;
        private Boolean visible;
        private Double confidence;
        private Integer category;
        private JSONObject additionalAttributes;
    }

    /**
     * Mask Metadata
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MaskMetadata {
        private String version;
        private String created;
        private Boolean compressed;
        private Integer totalChannels;
        private Integer totalInstances;
        private Integer totalPixels;
        private Integer annotatedPixels;
    }

    /**
     * Bounding Box Structure
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BoundingBox {
        private Double x;
        private Double y;
        private Double width;
        private Double height;
        private Double rotation;
    }

    /**
     * 2D Point Structure
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Point2D {
        private Double x;
        private Double y;
    }
} 