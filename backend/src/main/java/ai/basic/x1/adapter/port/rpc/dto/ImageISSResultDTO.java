package ai.basic.x1.adapter.port.rpc.dto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageISSResultDTO {

    private ClassAttributes classAttributes;
    private Long classId;
    private String frontId;
    private Long sourceId;
    private String sourceType;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassAttributes {
        private String classId;
        private List<String> classValues;
        private Contour contour;
        private String id;
        private Meta meta;
        private String sourceId;
        private String sourceType;
        private String type;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Contour {
        private List<Point> points;
        private Long area;
        private IssMetadata issMetadata;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Point {
        private BigDecimal x;
        private BigDecimal y;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IssMetadata {
        private Long instanceId;
        private Double confidence;
        private Boolean isVisible;
        private Integer semanticLabel;
        private ImageSize imageSize;
        private String createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageSize {
        private Integer width;
        private Integer height;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Meta {
        private String classType;
        private String color;
    }
}
