package ai.basic.x1.util;

import ai.basic.x1.entity.DataResultObjectExportBO;
import ai.basic.x1.entity.IssDataExportBO;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONArray;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * ISS和3D数据导出处理工具类
 * 
 * @author ISS Implementation Team
 */
@Slf4j
public class IssDataExportUtil {

    /**
     * 处理ISS数据的导出转换
     * 
     * @param contour 轮廓数据
     * @param exportBO 导出对象
     * @throws IllegalArgumentException 当输入参数无效时
     */
    public static void processIssData(JSONObject contour, DataResultObjectExportBO exportBO) {
        if (contour == null) {
            log.warn("Contour is null, skipping ISS data processing");
            return;
        }
        
        if (exportBO == null) {
            log.error("ExportBO is null, cannot process ISS data");
            throw new IllegalArgumentException("ExportBO cannot be null");
        }

        try {
            processMultiChannelMask(contour, exportBO);
            processIssMetadata(contour, exportBO);
            processAreaData(contour, exportBO);
            
                    // ISS data processed successfully
    } catch (Exception e) {
        log.error("Error processing ISS data for object: {}", exportBO.getId(), e);
        throw new RuntimeException("Failed to process ISS data", e);
    }
    }

    /**
     * 处理多通道掩码数据
     */
    private static void processMultiChannelMask(JSONObject contour, DataResultObjectExportBO exportBO) {
        try {
            JSONObject multiChannelMask = contour.getJSONObject("multiChannelMask");
            if (multiChannelMask != null) {
                exportBO.setMultiChannelMask(multiChannelMask);
                // Multi-channel mask data processed
            }
        } catch (Exception e) {
            log.warn("Failed to process multi-channel mask for object: {}", exportBO.getId(), e);
        }
    }

    /**
     * 处理ISS元数据
     */
    private static void processIssMetadata(JSONObject contour, DataResultObjectExportBO exportBO) {
        try {
            JSONObject issMetadata = contour.getJSONObject("issMetadata");
            if (issMetadata != null) {
                exportBO.setIssMetadata(issMetadata);
                // ISS metadata processed
            }
        } catch (Exception e) {
            log.warn("Failed to process ISS metadata for object: {}", exportBO.getId(), e);
        }
    }

    /**
     * 处理面积数据
     */
    private static void processAreaData(JSONObject contour, DataResultObjectExportBO exportBO) {
        try {
            if (contour.containsKey("area")) {
                // ISS区域的面积已经在contour中，无需额外处理
                // Area data found
            }
        } catch (Exception e) {
            log.warn("Failed to process area data for object: {}", exportBO.getId(), e);
        }
    }

    /**
     * 处理3D polygon/polyline数据的导出转换
     * 
     * @param contour 轮廓数据
     * @param exportBO 导出对象
     * @param objectType 对象类型
     * @throws IllegalArgumentException 当输入参数无效时
     */
    public static void process3DData(JSONObject contour, DataResultObjectExportBO exportBO, String objectType) {
        if (contour == null) {
            log.warn("Contour is null, skipping 3D data processing");
            return;
        }
        
        if (exportBO == null) {
            log.error("ExportBO is null, cannot process 3D data");
            throw new IllegalArgumentException("ExportBO cannot be null");
        }
        
        if (objectType == null || objectType.trim().isEmpty()) {
            log.warn("Object type is null or empty, using default");
            objectType = "UNKNOWN";
        }

        try {
            process3DPoints(contour, exportBO);
            processHeightData(contour, exportBO);
            processZCoordinate(contour, exportBO);
            processRotation3D(contour, exportBO);
            
            // 3D data processed successfully
        } catch (Exception e) {
            log.error("Error processing 3D data for object: {} of type: {}", exportBO.getId(), objectType, e);
            throw new RuntimeException("Failed to process 3D data", e);
        }
    }

    /**
     * 处理3D点数据
     */
    private static void process3DPoints(JSONObject contour, DataResultObjectExportBO exportBO) {
        try {
            JSONArray pointsArray = contour.getJSONArray("points");
            if (pointsArray != null && pointsArray.size() > 0) {
                List<DataResultObjectExportBO.Point3D> points3D = new ArrayList<>();
                
                for (int i = 0; i < pointsArray.size(); i++) {
                    Object point = pointsArray.get(i);
                    DataResultObjectExportBO.Point3D point3D = parse3DPoint(point);
                    if (point3D != null) {
                        points3D.add(point3D);
                    }
                }
                
                if (!points3D.isEmpty()) {
                    exportBO.setPoints3D(points3D);
                    log.debug("Processed {} 3D points for object: {}", points3D.size(), exportBO.getId());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to process 3D points for object: {}", exportBO.getId(), e);
        }
    }

    /**
     * 处理高度数据
     */
    private static void processHeightData(JSONObject contour, DataResultObjectExportBO exportBO) {
        try {
            if (contour.containsKey("height")) {
                Double height = contour.getDouble("height");
                if (height != null) {
                    exportBO.setHeight(height);
                    log.debug("Height data processed for object: {}", exportBO.getId());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to process height data for object: {}", exportBO.getId(), e);
        }
    }

    /**
     * 处理Z坐标数据
     */
    private static void processZCoordinate(JSONObject contour, DataResultObjectExportBO exportBO) {
        try {
            Double z = null;
            if (contour.containsKey("z")) {
                z = contour.getDouble("z");
            } else if (contour.containsKey("zCoordinate")) {
                z = contour.getDouble("zCoordinate");
            }
            
            if (z != null) {
                exportBO.setZCoordinate(z);
                log.debug("Z coordinate processed for object: {}", exportBO.getId());
            }
        } catch (Exception e) {
            log.warn("Failed to process Z coordinate for object: {}", exportBO.getId(), e);
        }
    }

    /**
     * 处理3D旋转信息
     */
    private static void processRotation3D(JSONObject contour, DataResultObjectExportBO exportBO) {
        try {
            JSONObject rotation = contour.getJSONObject("rotation3D");
            if (rotation != null) {
                DataResultObjectExportBO.Rotation3D rotation3D = new DataResultObjectExportBO.Rotation3D(
                    rotation.getDouble("pitch"),
                    rotation.getDouble("yaw"),
                    rotation.getDouble("roll")
                );
                exportBO.setRotation3D(rotation3D);
                log.debug("3D rotation processed for object: {}", exportBO.getId());
            }
        } catch (Exception e) {
            log.warn("Failed to process 3D rotation for object: {}", exportBO.getId(), e);
        }
    }

    /**
     * 解析3D点坐标
     * 
     * @param point 点数据
     * @return 3D点对象，解析失败返回null
     */
    private static DataResultObjectExportBO.Point3D parse3DPoint(Object point) {
        if (point == null) {
            log.warn("Point data is null, cannot parse 3D point");
            return null;
        }

        try {
            if (point instanceof JSONObject) {
                return parseObjectPoint((JSONObject) point);
            } else if (point instanceof JSONArray) {
                return parseArrayPoint((JSONArray) point);
            } else {
                log.warn("Unsupported point data type: {}", point.getClass().getSimpleName());
                return null;
            }
        } catch (Exception e) {
            log.warn("Failed to parse 3D point: {}", point, e);
            return null;
        }
    }

    /**
     * 解析对象格式的点坐标
     */
    private static DataResultObjectExportBO.Point3D parseObjectPoint(JSONObject pointObj) {
        try {
            Double x = pointObj.getDouble("x");
            Double y = pointObj.getDouble("y");
            Double z = pointObj.getDouble("z");
            
            if (x == null || y == null) {
                log.warn("Required coordinates (x, y) are missing in point object");
                return null;
            }
            
            return new DataResultObjectExportBO.Point3D(x, y, z != null ? z : 0.0);
        } catch (Exception e) {
            log.warn("Failed to parse object point: {}", pointObj, e);
            return null;
        }
    }

    /**
     * 解析数组格式的点坐标
     */
    private static DataResultObjectExportBO.Point3D parseArrayPoint(JSONArray pointArray) {
        try {
            if (pointArray.size() < 2) {
                log.warn("Point array must have at least 2 coordinates, got: {}", pointArray.size());
                return null;
            }
            
            Double x = pointArray.getDouble(0);
            Double y = pointArray.getDouble(1);
            
            if (x == null || y == null) {
                log.warn("Required coordinates (x, y) are null in point array");
                return null;
            }
            
            if (pointArray.size() >= 3) {
                Double z = pointArray.getDouble(2);
                return new DataResultObjectExportBO.Point3D(x, y, z != null ? z : 0.0);
            } else {
                // 2D点，Z坐标默认为0
                return new DataResultObjectExportBO.Point3D(x, y, 0.0);
            }
        } catch (Exception e) {
            log.warn("Failed to parse array point: {}", pointArray, e);
            return null;
        }
    }

    /**
     * 检查对象是否为ISS类型
     * 
     * @param objectType 对象类型
     * @return 是否为ISS类型
     */
    public static boolean isIssType(String objectType) {
        if (objectType == null || objectType.trim().isEmpty()) {
            return false;
        }
        return "ISS_UNIFIED".equals(objectType.trim());
    }

    /**
     * 检查对象是否为3D类型
     * 
     * @param objectType 对象类型
     * @return 是否为3D类型
     */
    public static boolean is3DType(String objectType) {
        if (objectType == null || objectType.trim().isEmpty()) {
            return false;
        }
        
        String normalizedType = objectType.trim();
        return "THREE_D_POLYGON".equals(normalizedType) || 
               "THREE_D_POLYLINE".equals(normalizedType) ||
               "THREE_D_SEGMENTATION".equals(normalizedType) ||
               "POLYGON_3D".equals(normalizedType) ||
               "POLYLINE_3D".equals(normalizedType) ||
               "SEGMENTATION_3D".equals(normalizedType);
    }

    /**
     * 验证ISS数据的完整性
     * 
     * @param contour 轮廓数据
     * @return 验证结果
     */
    public static boolean validateIssData(JSONObject contour) {
        if (contour == null) {
            log.debug("Contour is null, ISS data validation failed");
            return false;
        }

        try {
            // 检查是否包含必要的ISS字段
            boolean hasMultiChannelMask = contour.containsKey("multiChannelMask");
            boolean hasIssMetadata = contour.containsKey("issMetadata");
            boolean hasArea = contour.containsKey("area");
            boolean hasUnifiedMaskData = contour.containsKey("unifiedMaskData");
            
            boolean isValid = hasMultiChannelMask || hasIssMetadata || hasArea || hasUnifiedMaskData;
            
            if (!isValid) {
                log.debug("ISS data validation failed: missing required fields");
            } else {
                log.debug("ISS data validation passed");
            }
            
            return isValid;
        } catch (Exception e) {
            log.warn("Error during ISS data validation", e);
            return false;
        }
    }

    /**
     * 验证3D数据的完整性
     * 
     * @param contour 轮廓数据
     * @return 验证结果
     */
    public static boolean validate3DData(JSONObject contour) {
        if (contour == null) {
            log.debug("Contour is null, 3D data validation failed");
            return false;
        }

        try {
            // 检查是否包含3D坐标点
            JSONArray points = contour.getJSONArray("points");
            if (points == null || points.isEmpty()) {
                log.debug("3D data validation failed: points array is null or empty");
                return false;
            }

            // 验证第一个点是否包含Z坐标
            Object firstPoint = points.get(0);
            boolean hasZCoordinate = false;
            
            if (firstPoint instanceof JSONObject) {
                JSONObject pointObj = (JSONObject) firstPoint;
                hasZCoordinate = pointObj.containsKey("z");
                if (!hasZCoordinate) {
                    log.debug("3D data validation failed: first point object missing z coordinate");
                }
            } else if (firstPoint instanceof JSONArray) {
                JSONArray pointArray = (JSONArray) firstPoint;
                hasZCoordinate = pointArray.size() >= 3;
                if (!hasZCoordinate) {
                    log.debug("3D data validation failed: first point array has less than 3 coordinates");
                }
            } else {
                log.debug("3D data validation failed: unsupported point format");
                return false;
            }
            
            if (hasZCoordinate) {
                log.debug("3D data validation passed");
            }
            
            return hasZCoordinate;
        } catch (Exception e) {
            log.warn("Error during 3D data validation", e);
            return false;
        }
    }

    /**
     * 处理ISS_UNIFIED数据的导出转换
     * 
     * @param contour 轮廓数据
     * @param exportBO 导出对象
     * @throws IllegalArgumentException 当输入参数无效时
     */
    public static void processIssUnifiedData(JSONObject contour, DataResultObjectExportBO exportBO) {
        if (contour == null) {
            log.warn("Contour is null, skipping ISS_UNIFIED data processing");
            return;
        }
        
        if (exportBO == null) {
            log.error("ExportBO is null, cannot process ISS_UNIFIED data");
            throw new IllegalArgumentException("ExportBO cannot be null");
        }

        try {
            processUnifiedMaskData(contour, exportBO);
            processCompressedMask(contour, exportBO);
            processIssMetadata(contour, exportBO);
            
            log.debug("Successfully processed ISS_UNIFIED data for object: {}", exportBO.getId());
        } catch (Exception e) {
            log.error("Error processing ISS_UNIFIED data for object: {}", exportBO.getId(), e);
            throw new RuntimeException("Failed to process ISS_UNIFIED data", e);
        }
    }

    /**
     * 处理统一掩码数据
     */
    private static void processUnifiedMaskData(JSONObject contour, DataResultObjectExportBO exportBO) {
        try {
            JSONObject unifiedMaskData = contour.getJSONObject("unifiedMaskData");
            if (unifiedMaskData != null) {
                exportBO.setUnifiedMaskData(unifiedMaskData);
                log.debug("Unified mask data processed for object: {}", exportBO.getId());
            }
        } catch (Exception e) {
            log.warn("Failed to process unified mask data for object: {}", exportBO.getId(), e);
        }
    }

    /**
     * 处理压缩掩码数据
     */
    private static void processCompressedMask(JSONObject contour, DataResultObjectExportBO exportBO) {
        try {
            if (contour.containsKey("compressedMask")) {
                String compressedMask = contour.getStr("compressedMask");
                if (compressedMask != null && !compressedMask.trim().isEmpty()) {
                    JSONObject multiChannelMask = new JSONObject();
                    multiChannelMask.set("compressedMask", compressedMask);
                    exportBO.setMultiChannelMask(multiChannelMask);
                    log.debug("Compressed mask data processed for object: {}", exportBO.getId());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to process compressed mask data for object: {}", exportBO.getId(), e);
        }
    }

    /**
     * 验证ISS_UNIFIED数据的完整性
     * 
     * @param contour 轮廓数据
     * @return 验证结果
     */
    public static boolean validateIssUnifiedData(JSONObject contour) {
        if (contour == null) {
            log.debug("Contour is null, ISS_UNIFIED data validation failed");
            return false;
        }

        try {
            // 检查是否包含ISS_UNIFIED必要字段
            JSONObject unifiedMaskData = contour.getJSONObject("unifiedMaskData");
            if (unifiedMaskData == null) {
                log.debug("ISS_UNIFIED data validation failed: unifiedMaskData is null");
                return false;
            }

            // 验证instances数据
            JSONObject instances = unifiedMaskData.getJSONObject("instances");
            if (instances == null) {
                log.debug("ISS_UNIFIED data validation failed: instances is null");
                return false;
            }
            
            if (instances.isEmpty()) {
                log.debug("ISS_UNIFIED data validation failed: instances is empty");
                return false;
            }
            
            log.debug("ISS_UNIFIED data validation passed");
            return true;
        } catch (Exception e) {
            log.warn("Error during ISS_UNIFIED data validation", e);
            return false;
        }
    }
} 