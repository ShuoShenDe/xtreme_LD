package ai.basic.x1.adapter.api.job.converter;

import ai.basic.x1.adapter.dto.ApiResult;
import ai.basic.x1.adapter.dto.PreInteractiveModelParamDTO;
import ai.basic.x1.adapter.port.dao.mybatis.model.ModelClass;
import ai.basic.x1.adapter.port.rpc.dto.ImageISSObject;
import ai.basic.x1.adapter.port.rpc.dto.ImageISSResultDTO;
import ai.basic.x1.adapter.port.rpc.dto.ImageInteractiveRespDTO;
import ai.basic.x1.entity.ImageInteractiveObjectBO;
import ai.basic.x1.usecase.exception.UsecaseCode;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * @author zhujh
 */
@Slf4j
public class ModelSamResponseConverter {

    public static ImageInteractiveObjectBO convert(ApiResult<ImageInteractiveRespDTO> predImageRespDTOApiResult,
                                                 Map<String, ModelClass> systemModelClassMap,
                                                 PreInteractiveModelParamDTO filterCondition) {
        ImageInteractiveObjectBO.ImageInteractiveObjectBOBuilder<?, ?> builder = ImageInteractiveObjectBO.builder();
        var response = predImageRespDTOApiResult.getData();
        if (predImageRespDTOApiResult.getCode() == UsecaseCode.OK) {
            if (CollUtil.isEmpty(response.getObjects())) {
                builder.code(UsecaseCode.OK.getCode())
                        .message("success")
                        .dataId(response.getId())
                        .objects(List.of());
            } else {
                log.info("not start filter predItem. filter condition: " + JSONUtil.toJsonStr(filterCondition));
                var predObjects = response.getObjects()
                        .stream()
                        // .filter(item -> matchSelectedConfidence(item, filterCondition)
                        // )
                        .map(item -> buildObject(item, systemModelClassMap))
                        .collect(Collectors.toList());
                // builder.confidence(response.getConfidence());
                // if (CollUtil.isNotEmpty(predObjects) && ObjectUtil.isNull(response.getConfidence())) {
                //     var dataConfidence = predObjects.stream().mapToDouble(object -> object.getConfidence().doubleValue()).summaryStatistics();
                //     builder.confidence(BigDecimal.valueOf(dataConfidence.getAverage()));
                // }
                var dataAnnotations = new ArrayList<ImageInteractiveObjectBO.DataAnnotation>();
                for (ImageInteractiveRespDTO.DataAnnotation item : response.getDataAnnotations()) {
                    var classificationAttributes = new ArrayList<ImageInteractiveObjectBO.ClassificationAttributes>();
                    
                    // Handle classificationAttributes as JSONObject - it can be either a single object or an array
                    if (item.getClassificationAttributes() != null) {
                        var jsonObj = item.getClassificationAttributes();
                        if (jsonObj.containsKey("id")) {
                            // If it's a single object, process it directly
                            classificationAttributes.add(ImageInteractiveObjectBO.ClassificationAttributes.builder()
                                .id(jsonObj.getStr("id"))
                                .values(jsonObj.getBeanList("values", String.class))
                                .build());
                        } else {
                            // If it's an array, process each element
                            var attributesArray = jsonObj.getJSONArray("values");
                            if (attributesArray != null) {
                                for (var attribute : attributesArray) {
                                    if (attribute instanceof cn.hutool.json.JSONObject) {
                                        var attrObj = (cn.hutool.json.JSONObject) attribute;
                                        classificationAttributes.add(ImageInteractiveObjectBO.ClassificationAttributes.builder()
                                            .id(attrObj.getStr("id"))
                                            .values(attrObj.getBeanList("values", String.class))
                                            .build());
                                    }
                                }
                            }
                        }
                    }
                    
                    ImageInteractiveObjectBO.DataAnnotation dataAnnotation = ImageInteractiveObjectBO.DataAnnotation.builder()
                        .classificationId(item.getClassificationId())
                        .classificationAttributes(classificationAttributes)
                        .build();
                    dataAnnotations.add(dataAnnotation);
                }
                
                builder.code(UsecaseCode.OK.getCode())
                        .message("success")
                        .dataId(response.getId())
                        .objects(predObjects)
                        .dataAnnotations(dataAnnotations);
            }
        } else {
            builder.code(UsecaseCode.ERROR.getCode())
                    .message(predImageRespDTOApiResult.getMessage())
                    .objects(null).build();
        }
        return builder.build();
    }

    private static ImageInteractiveObjectBO.ObjectBO buildObject(ImageISSResultDTO imageISSResultDTO, Map<String, ModelClass> modelClassMap) {
        var points = imageISSResultDTO.getClassAttributes().getContour().getPoints();
        var imageInteractiveObjectPoints = new ArrayList<ImageInteractiveObjectBO.Point>();
        for (var point : points) {
            var imageInteractiveObjectPoint = ImageInteractiveObjectBO.Point.builder()
                    .x(point.getX())
                    .y(point.getY()).build();
            imageInteractiveObjectPoints.add(imageInteractiveObjectPoint);
        }

        return ImageInteractiveObjectBO
                .ObjectBO.builder()
                // .confidence(imageISSResultDTO.getConfidence())
                // .modelClass(StrUtil.isNotEmpty(imageISSResultDTO.getLabel()) ?
                        // ObjectUtil.isNotNull(modelClassMap.get(imageISSObject.getLabel())) ? modelClassMap.get(imageISSObject.getLabel()).getName() : null : null)
                .type("ISS")
                .points(imageInteractiveObjectPoints)
                .build();
    }

    private static boolean matchSelectedConfidence(ImageISSObject imageISSObject,
                                                           PreInteractiveModelParamDTO filterPredItem) {


        var maxConfidence = getMaxConfidence(filterPredItem.getMaxConfidence());
        var minConfidence = getMinConfidence(filterPredItem.getMinConfidence());

        return betweenConfidence(imageISSObject.getConfidence(), minConfidence, maxConfidence);
    }

    private static boolean betweenConfidence(BigDecimal predConfidence, BigDecimal minConfidence,
                                             BigDecimal maxConfidence) {
        return minConfidence.compareTo(predConfidence) <= 0 && maxConfidence.compareTo(predConfidence) >= 0;
    }

    private static BigDecimal getMaxConfidence(BigDecimal confidence) {
        return confidence == null ? new BigDecimal(1) : confidence;
    }

    private static BigDecimal getMinConfidence(BigDecimal confidence) {
        return confidence == null ? new BigDecimal(0) : confidence;
    }

}
