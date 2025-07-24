package ai.basic.x1.adapter.port.rpc.dto;

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
public class ImageInteractiveReqDTO {

    private List<ImageData> datas;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ImageData {

        private String url;

        private Long id;

        private String type;

        private List<Point> points;

    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Point {
        private Double x;
        private Double y;
        private Boolean positive;
    }

} 