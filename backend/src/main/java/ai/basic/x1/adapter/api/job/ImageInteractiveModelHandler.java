package ai.basic.x1.adapter.api.job;

import ai.basic.x1.adapter.api.job.converter.ModelSamRequestConverter;
import ai.basic.x1.adapter.api.job.converter.ModelSamResponseConverter;
import ai.basic.x1.adapter.dto.ApiResult;
import ai.basic.x1.adapter.dto.PreInteractiveModelParamDTO;
import ai.basic.x1.adapter.dto.PreModelParamDTO;
import ai.basic.x1.adapter.port.dao.mybatis.model.DataAnnotationObject;
import ai.basic.x1.adapter.port.dao.mybatis.model.ModelDatasetResult;
import ai.basic.x1.adapter.port.dao.mybatis.model.ModelRunRecord;
import ai.basic.x1.adapter.port.rpc.ImageInteractiveModelHttpCaller;
import ai.basic.x1.adapter.port.rpc.dto.ImageDetectionMetricsReqDTO;
import ai.basic.x1.adapter.port.rpc.dto.ImageISSObject;
import ai.basic.x1.adapter.port.rpc.dto.ImageInteractiveRespDTO;
import ai.basic.x1.entity.*;
import ai.basic.x1.entity.enums.DataAnnotationObjectSourceTypeEnum;
import ai.basic.x1.entity.enums.ModelCodeEnum;
import ai.basic.x1.usecase.ModelUseCase;
import ai.basic.x1.usecase.exception.UsecaseCode;
import ai.basic.x1.usecase.exception.UsecaseException;
import ai.basic.x1.util.DefaultConverter;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * @author andy
 */
@Slf4j
public class ImageInteractiveModelHandler extends AbstractModelMessageHandler<ImageInteractiveRespDTO> {

    @Autowired
    private ImageInteractiveModelHttpCaller modelHttpCaller;

    @Autowired
    private ModelUseCase modelUseCase;


    @Value("${image.resultEvaluate.url}")
    private String resultEvaluateUrl;

    @Override
    public ModelTaskInfoBO modelRun(ModelMessageBO message) {
        log.info("start interactive model run. dataId: {}, modelSerialNo: {}", message.getDataId(),
                message.getModelSerialNo());
        var apiResult = getRetryAbleApiResult(message);
        var systemModelClassMap = modelUseCase.getModelClassMapByModelId(message.getModelId());
        var filterCondition = JSONUtil.toBean(message.getResultFilterParam(),
                PreInteractiveModelParamDTO.class);
        return ModelSamResponseConverter.convert(apiResult, systemModelClassMap, filterCondition);
    }

    @Override
    ApiResult<ImageInteractiveRespDTO> callRemoteService(ModelMessageBO message) {
        System.out.println("callRemoteService: "+message);
        try {
            var apiResult = modelHttpCaller
                    .callInteractiveImageModel(ModelSamRequestConverter.convert(message), message.getUrl());

            if (CollUtil.isNotEmpty(apiResult.getData())) {
                return new ApiResult<>(apiResult.getCode(), apiResult.getMessage(),
                        apiResult.getData().get(0));
            }
            return new ApiResult<>(apiResult.getCode(), apiResult.getMessage());
        } catch (Exception e) {
            log.error("call interactive model error", e);
            throw new UsecaseException(UsecaseCode.UNKNOWN, e.getMessage());
        }
    }

    @Override
    public void syncModelAnnotationResult(ModelTaskInfoBO modelTaskInfo, ModelMessageBO modelMessage) {
        System.out.println("syncModelAnnotationResult in ImageInteractiveModelHandler");
        var modelResult = (ImageDetectionObjectBO) modelTaskInfo;
        if (CollUtil.isNotEmpty(modelResult.getObjects())) {
            var lambdaQueryWrapper = Wrappers.lambdaQuery(ModelRunRecord.class);
            lambdaQueryWrapper.eq(ModelRunRecord::getModelSerialNo, modelMessage.getModelSerialNo());
            lambdaQueryWrapper.last("limit 1");
            var modelRunRecord = modelRunRecordDAO.getOne(lambdaQueryWrapper);
            var dataAnnotationObjectBOList = new ArrayList<DataAnnotationObjectBO>(modelResult.getObjects().size());
            modelResult.getObjects().forEach(o -> {
                var dataAnnotationObjectBO = DataAnnotationObjectBO.builder()
                        .datasetId(modelMessage.getDatasetId()).dataId(modelResult.getDataId()).classAttributes(JSONUtil.parseObj(o))
                        .sourceType(DataAnnotationObjectSourceTypeEnum.MODEL).sourceId(modelRunRecord.getId()).build();
                dataAnnotationObjectBOList.add(dataAnnotationObjectBO);
            });

            dataAnnotationObjectDAO.saveBatch(DefaultConverter.convert(dataAnnotationObjectBOList, DataAnnotationObject.class));
        }
    }

    @Override
    public void assembleCalculateMetricsData(List<ModelDatasetResult> modelDatasetResults, List<DataAnnotationObject> dataAnnotationObjectList,
                                             String groundTruthFilePath, String modelRunFilePath) {
        System.out.println("wait to implement assembleCalculateMetricsData in ImageInteractiveModelHandler");
        return;
        // if (CollUtil.isEmpty(modelDatasetResults)) {
        //     return;
        // }
        // var dataAnnotationObjectMap = dataAnnotationObjectList.stream().filter(dataAnnotationObject -> {
        //     var objectBO = DefaultConverter.convert(dataAnnotationObject.getClassAttributes(), ImageInteractiveObjectBO.ObjectBO.class);
        //     return "RECTANGLE".equalsIgnoreCase(objectBO.getType());
        // }).collect(Collectors.groupingBy(DataAnnotationObject::getDataId));
        // modelDatasetResults.forEach(modelDatasetResult -> {
        //     var isSuccess = modelDatasetResult.getIsSuccess();
        //     if (!isSuccess) {
        //         return;
        //     }
        //     var modelResult = modelDatasetResult.getModelResult();
        //     var dataId = modelDatasetResult.getDataId();
        //     var dataAnnotationObjects = dataAnnotationObjectMap.get(modelDatasetResult.getDataId());
        //     var groundTruthObjects = new ArrayList<ImageISSObject>();
        //     if (CollUtil.isEmpty(dataAnnotationObjects)) {
        //         return;
        //     }
        //     dataAnnotationObjects.forEach(dataAnnotationObject -> {
        //         var imageDetectionObject = new ImageISSObject();
        //         var objectBO = DefaultConverter.convert(dataAnnotationObject.getClassAttributes().get("contour"), ImageDetectionObjectBO.ObjectBO.class);
        //         assembleObject(objectBO, imageDetectionObject);
        //         groundTruthObjects.add(imageDetectionObject);
        //     });
        //     var modelRunObjects = new ArrayList<ImageISSObject>();
        //     var predImageModelObjectBO = DefaultConverter.convert(modelResult, ImageDetectionObjectBO.class);
        //     predImageModelObjectBO.getObjects().forEach(objectBO -> {
        //         var imageISSObject = new ImageISSObject();
        //         var confidence = objectBO.getConfidence();
        //         assembleObject(objectBO, imageISSObject);
        //         // imageDetectionObject.setConfidence(confidence);
        //         modelRunObjects.add(imageISSObject);
        //     });
        //     var groundTruthObject = ImageDetectionMetricsReqDTO.builder().id(dataId).objects(groundTruthObjects).build();
        //     var modelRunObject = ImageDetectionMetricsReqDTO.builder().id(dataId).objects(modelRunObjects).build();
        //     FileUtil.appendUtf8String(StrUtil.removeAllLineBreaks(JSONUtil.toJsonStr(groundTruthObject)), groundTruthFilePath);
        //     FileUtil.appendUtf8String("\n", groundTruthFilePath);
        //     FileUtil.appendUtf8String(StrUtil.removeAllLineBreaks(JSONUtil.toJsonStr(modelRunObject)), modelRunFilePath);
        //     FileUtil.appendUtf8String("\n", modelRunFilePath);
        // });
    }

    private void assembleObject(ImageDetectionObjectBO.ObjectBO objectBO, ImageISSObject imageISSObject) {
        var points = objectBO.getPoints();
        if (CollUtil.isEmpty(points)) {
            return;
        }
        var imageISSObjectPoints = new ArrayList<ImageISSObject.Point>();
        for (var point : points) {
            var imageISSObjectPoint = ImageISSObject.Point.builder().x(point.getX()).y(point.getY()).build();
            imageISSObjectPoints.add(imageISSObjectPoint);
        }
        System.out.println("ImageISSObject in assembleObject: "+imageISSObject);
        imageISSObject.setPoints(imageISSObjectPoints);
        // imageISSObject.setLeftTopX(leftTopX);
        // imageISSObject.setLeftTopY(leftTopY);
        // imageISSObject.setRightBottomX(rightBottomX);
        // imageISSObject.setRightBottomY(rightBottomY);
    }

    @Override
    public String getResultEvaluateUrl() {
        return resultEvaluateUrl;
    }

    @Override
    public ModelCodeEnum getModelCodeEnum() {
        return ModelCodeEnum.IMAGE_INTERACTIVE;
    }
} 