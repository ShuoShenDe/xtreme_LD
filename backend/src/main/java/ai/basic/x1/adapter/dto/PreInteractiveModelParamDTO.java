package ai.basic.x1.adapter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Range;

import cn.hutool.json.JSONObject;

import javax.validation.constraints.NotEmpty;
import java.math.BigDecimal;
import java.util.List;

/**
 * @author fyb
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PreInteractiveModelParamDTO {

    @Range(min = 0, max = 1, message = "confidence is error")
    private BigDecimal minConfidence;

    @Range(min = 0, max = 1, message = "confidence is error")
    private BigDecimal maxConfidence;

    @NotEmpty(message = "interactiveData not empty")
    private JSONObject interactiveData;

}
