package ai.basic.x1.adapter.api.config;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import cn.hutool.json.JSONObject;

import java.util.List;

/**
 * @author zhujh
 * SAM (Segment Anything Model) 交互式分割数据集初始配置
 */
@Data
@SuperBuilder
@NoArgsConstructor
@Component
@ConfigurationProperties(prefix = "dataset-initial.dataset.image-sam")
public class ImageSAMDatasetInitialInfo extends DatasetInitialInfo {

    /**
     * 提示类型：point 或 box
     */
    private String promptTypes;

    private JSONObject interactiveData;
    /**
     * 提示点列表
     */
    private List<Point> points;

    @Data
    public static class Point {
        /**
         * X 坐标
         */
        private Double x;

        /**
         * Y 坐标
         */
        private Double y;

        /**
         * 是否为正面提示点（仅用于 point 类型）
         */
        private Boolean positive;
    }
} 