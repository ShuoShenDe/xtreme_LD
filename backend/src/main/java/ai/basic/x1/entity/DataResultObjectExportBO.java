package ai.basic.x1.entity;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class DataResultObjectExportBO {

    /**
     * Object id
     */
    private String id;

    /**
     * Type
     */
    private String type;

    /**
     * Class id
     */
    private Long classId;

    /**
     * Class name
     */
    private String className;

    /**
     * Track id
     */
    private String trackId;

    /**
     * Track name
     */
    private String trackName;

    /**
     * Class values
     */
    private JSONArray classValues;

    /**
     * Profile information
     */
    private JSONObject contour;

    /**
     * Confidence of model recognition, only available for model recognition
     */
    private BigDecimal modelConfidence;

    /**
     * The category identified by the model is only available when the model is identified
     */
    private String modelClass;

    // === ISS 相关字段 ===
    
    /**
     * ISS Multi-Channel Mask Data
     * ISS多通道掩码数据
     */
    private JSONObject multiChannelMask;

    /**
     * ISS Instance Metadata
     * ISS实例元数据
     */
    private JSONObject issMetadata;

    /**
     * ISS Unified Mask Data (for ISS_UNIFIED objects)
     * ISS统一掩码数据（用于ISS_UNIFIED对象）
     */
    private JSONObject unifiedMaskData;

    // === 3D 数据相关字段 ===
    
    /**
     * 3D Points for 3D_POLYGON and 3D_POLYLINE
     * 用于3D多边形和3D折线的3D坐标点
     */
    private List<Point3D> points3D;

    /**
     * Z-coordinate for 2D objects with height information
     * 具有高度信息的2D对象的Z坐标
     */
    private Double zCoordinate;

    /**
     * Object height (for 3D objects)
     * 对象高度（用于3D对象）
     */
    private Double height;

    /**
     * 3D Rotation information
     * 3D旋转信息
     */
    private Rotation3D rotation3D;

    // === 内嵌类定义 ===

    /**
     * 3D Point Structure
     */
    @Data
    public static class Point3D {
        private Double x;
        private Double y;
        private Double z;
        
        public Point3D() {}
        
        public Point3D(Double x, Double y, Double z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
    }

    /**
     * 3D Rotation Structure
     */
    @Data
    public static class Rotation3D {
        private Double pitch;  // X轴旋转
        private Double yaw;    // Y轴旋转
        private Double roll;   // Z轴旋转
        
        public Rotation3D() {}
        
        public Rotation3D(Double pitch, Double yaw, Double roll) {
            this.pitch = pitch;
            this.yaw = yaw;
            this.roll = roll;
        }
    }

}
