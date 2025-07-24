package ai.basic.x1.adapter.port.rpc.dto;

import cn.hutool.json.JSONObject;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * @author zhujh
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageInteractiveRespDTO {

    private long id;
    private String code;
    private String modelCode;
    private Long dataId;
    private List<DataAnnotation> dataAnnotations;
    private List<ImageISSResultDTO> objects;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataAnnotation {
        private String classificationId;
        private JSONObject classificationAttributes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassificationAttributes {
        private String id;
        private List<String> values;
    }


}
