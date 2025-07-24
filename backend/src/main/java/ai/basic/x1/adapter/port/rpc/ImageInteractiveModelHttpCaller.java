package ai.basic.x1.adapter.port.rpc;

import ai.basic.x1.adapter.dto.ApiResult;
import ai.basic.x1.adapter.port.rpc.dto.ImageInteractiveReqDTO;
import ai.basic.x1.adapter.port.rpc.dto.ImageInteractiveRespDTO;
import ai.basic.x1.usecase.exception.UsecaseCode;
import ai.basic.x1.usecase.exception.UsecaseException;
import cn.hutool.http.ContentType;
import cn.hutool.http.HttpStatus;
import cn.hutool.http.HttpUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

/**
 * @author zhujh
 */
@Component
public class ImageInteractiveModelHttpCaller {

    @Autowired
    private ObjectMapper objectMapper;

    public ApiResult<List<ImageInteractiveRespDTO>> callInteractiveImageModel(ImageInteractiveReqDTO requestBody, String url) throws IOException {
        var newRequestBody = replaceUrl(requestBody);
        var requestBodyStr = objectMapper.writeValueAsString(newRequestBody);
        var httpRequest = HttpUtil.createPost(url)
                .body(requestBodyStr, ContentType.JSON.getValue())
                .timeout(60000); // Set 60 second timeout
        var httpResponse = httpRequest.execute();
        ApiResult<List<ImageInteractiveRespDTO>> result;
        if (httpResponse.getStatus() == HttpStatus.HTTP_OK) {
            result = objectMapper.readValue(httpResponse.bodyBytes(),
                    new TypeReference<ApiResult<List<ImageInteractiveRespDTO>>>() {
            });
        } else {
            throw new UsecaseException(UsecaseCode.UNKNOWN, httpResponse.body());
        }
        return result;
    }


    
    private ImageInteractiveReqDTO replaceUrl(ImageInteractiveReqDTO requestBody) { 
        var host = "localhost";
        for (var data : requestBody.getDatas()) {
            var url = data.getUrl();
            var ip = url.split(":")[0];
            // get ip from env
            var envIp = System.getenv("MINIO_HOST");
            if (ip.contains(host)) {
                data.setUrl(url.replace(host, envIp.split(":")[0]));
            }
        }
        return requestBody;
    }
}
