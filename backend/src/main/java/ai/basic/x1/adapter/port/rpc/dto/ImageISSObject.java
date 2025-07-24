package ai.basic.x1.adapter.port.rpc.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageISSObject {


    private Long id;

    private String type;

    private List<Point> points;

    private BigDecimal confidence;

    private String label;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Point {
        private BigDecimal x;
        private BigDecimal y;
    }

}
