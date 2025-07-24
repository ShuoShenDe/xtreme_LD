package ai.basic.x1.adapter.api.job.converter;

import ai.basic.x1.adapter.api.config.DatasetInitialInfo;
import ai.basic.x1.adapter.api.config.ImageSAMDatasetInitialInfo;
import ai.basic.x1.adapter.port.rpc.dto.ImageInteractiveReqDTO;
import ai.basic.x1.entity.ModelMessageBO;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;

import java.util.List;

import static ai.basic.x1.util.Constants.FILE;

/**
 * @author zhujh
 */
public class ModelSamRequestConverter {

    public static ImageInteractiveReqDTO convert(ModelMessageBO message) {
        var dataInfo = message.getDataInfo();
        if (dataInfo == null) {
            throw new IllegalArgumentException(String.format("%s data is not found",
                    message.getDataId()));
        }
        var fileNodes = dataInfo.getContent();
        if (CollUtil.isEmpty(fileNodes)) {
            throw new IllegalArgumentException("file is not found");
        }
        var fileNodeBO = fileNodes.get(0);
        String url;
        if (fileNodeBO.getType().equals(FILE)) {
            url = fileNodeBO.getFile().getUrl();
        } else {
            url = fileNodeBO.getFiles().get(0).getFile().getUrl();
        }
        if (StrUtil.isEmpty(url)) {
            throw new IllegalArgumentException("file url is empty");
        }
        String type = null;
        
        // Extract points from model message if available (for interactive SAM models)
        List<ImageInteractiveReqDTO.Point> points = null;
        
        // 首先尝试从 resultFilterParam 中获取交互数据
        if (message.getResultFilterParam() != null) {
            // 处理交互点
            if (message.getResultFilterParam().containsKey("points")) {
                var pointsArray = message.getResultFilterParam().getJSONArray("points");
                if (pointsArray != null && !pointsArray.isEmpty()) {
                    points = pointsArray.stream()
                        .map(pointObj -> {
                            var point = (cn.hutool.json.JSONObject) pointObj;
                            return ImageInteractiveReqDTO.Point.builder()
                                .x(point.getDouble("x"))
                                .y(point.getDouble("y"))
                                .positive(point.getBool("positive", true))
                                .build();
                        })
                        .collect(java.util.stream.Collectors.toList());
                }
            }
            
            // 处理框选区域 - 这是前端实际发送的格式
            if (message.getResultFilterParam().containsKey("interactiveData")) {
                var interactiveData = message.getResultFilterParam().getJSONObject("interactiveData");
                type = interactiveData.getStr("type");
                if (interactiveData != null && "rect".equals(type)) {
                    var coordinates = interactiveData.getJSONObject("coordinates");
                    if (coordinates != null) {
                        // 将框选区域转换为左上右下两个角点
                        double x = coordinates.getDouble("x");
                        double y = coordinates.getDouble("y");
                        double width = coordinates.getDouble("width");
                        double height = coordinates.getDouble("height");
                        
                        if (points == null) {
                            points = new java.util.ArrayList<>();
                        }
                        
                        // 添加框选的两个角点作为正样本点
                        points.add(ImageInteractiveReqDTO.Point.builder()
                            .x(x).y(y).positive(true).build());
                        points.add(ImageInteractiveReqDTO.Point.builder()
                            .x(x + width).y(y + height).positive(true).build());

                    }
                }
                else if (interactiveData != null && "points".equals(type)) {
                    var pointsArray = interactiveData.getJSONArray("points");
                    if (pointsArray != null && !pointsArray.isEmpty()) {
                        points = pointsArray.stream()
                            .map(pointObj -> {
                                var point = (cn.hutool.json.JSONObject) pointObj;
                                return ImageInteractiveReqDTO.Point.builder()
                                    .x(point.getDouble("x"))
                                    .y(point.getDouble("y"))
                                    .positive(point.getBool("positive", true))
                                    .build();
                            })
                            .collect(java.util.stream.Collectors.toList());
                    }
                }
            }
        }
        
        // 如果没有从 resultFilterParam 获取到点数据，且 datasetInitialInfo 是 ImageSAMDatasetInitialInfo 类型，
        // 则使用配置中的默认点数据（用于 testModelUrlConnection 等情况）
        // if (points == null && datasetInitialInfo instanceof ImageSAMDatasetInitialInfo) {
        //     var samDatasetInfo = (ImageSAMDatasetInitialInfo) datasetInitialInfo;
        //     var configPoints = samDatasetInfo.getPoints();
        //     if (CollUtil.isNotEmpty(configPoints)) {
        //         points = configPoints.stream()
        //             .map(configPoint -> ImageInteractiveReqDTO.Point.builder()
        //                 .x(configPoint.getX())
        //                 .y(configPoint.getY())
        //                 .positive(configPoint.getPositive())
        //                 .build())
        //             .collect(java.util.stream.Collectors.toList());
        //     }
        // }
        
        return ImageInteractiveReqDTO.builder().datas(List.of(ImageInteractiveReqDTO.ImageData.builder()
                .id(dataInfo.getId())
                .url(url)
                .points(points)
                .type(type)
                .build())).build();
    }

} 