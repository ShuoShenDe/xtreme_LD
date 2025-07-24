package ai.basic.x1.util;

import ai.basic.x1.adapter.dto.PreModelParamDTO;
import ai.basic.x1.entity.enums.ModelCodeEnum;
import ai.basic.x1.usecase.exception.UsecaseCode;
import ai.basic.x1.usecase.exception.UsecaseException;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import ai.basic.x1.adapter.dto.PreInteractiveModelParamDTO;

/**
 * @author zhujh
 */
public class ModelParamUtils {

    public static void valid(JSONObject resultFilterParam, ModelCodeEnum modelCode) {
        if (JSONUtil.isNull(resultFilterParam)) {
            return;
        }
        switch (modelCode) {
            case LIDAR_DETECTION:
            case IMAGE_DETECTION:
                var modelClass = DefaultConverter.convert(resultFilterParam, PreModelParamDTO.class);
                ValidateUtil.validate(modelClass);
                break;
            case IMAGE_INTERACTIVE:
            //waiting to be implemented
                var contourParam = DefaultConverter.convert(resultFilterParam, PreInteractiveModelParamDTO.class);
                if (contourParam.getInteractiveData().get("type").equals("rect")) {
                    System.out.println("rect interactive");
                } else {
                    System.out.println("point interactive");
                }
                break;
            default:
                throw new UsecaseException(UsecaseCode.UNKNOWN, "Not support the model code: " + modelCode);
        }
    }
}
