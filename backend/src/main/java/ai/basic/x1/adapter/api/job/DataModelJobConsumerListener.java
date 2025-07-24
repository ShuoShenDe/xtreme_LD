package ai.basic.x1.adapter.api.job;

import ai.basic.x1.entity.ModelMessageBO;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContext;
import org.springframework.data.redis.connection.stream.ObjectRecord;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.stream.StreamListener;

import java.util.concurrent.ConcurrentHashMap;

/**
 * @author andy
 */
@Slf4j
public class DataModelJobConsumerListener implements StreamListener<String, ObjectRecord<String, String>> {

    private String group;
    private String streamKey;
    private RedisTemplate<String, Object> redisTemplate;
    private ConcurrentHashMap<String, AbstractModelMessageHandler> modelMessageHandlerMap = new ConcurrentHashMap<>();

    public DataModelJobConsumerListener(String streamKey, String group, RedisTemplate<String, Object> redisTemplate, ApplicationContext applicationContext) {
        this.streamKey = streamKey;
        this.group = group;
        this.redisTemplate = redisTemplate;
        // 关键：从Spring容器中获取所有AbstractModelMessageHandler类型的Bean
        for (AbstractModelMessageHandler messageHandler : applicationContext.getBeansOfType(AbstractModelMessageHandler.class).values()) {
             // 将Handler按模型代码注册到Map中
            modelMessageHandlerMap.put(messageHandler.getModelCodeEnum().name(), messageHandler);
        }
    }


    @Override
    public void onMessage(ObjectRecord message) {
        String modelMessageBOJSONStr = (String) message.getValue();
        log.info("receive data message:{}",modelMessageBOJSONStr);
        ModelMessageBO modelMessageBO = JSONUtil.toBean(modelMessageBOJSONStr, ModelMessageBO.class);
        AbstractModelMessageHandler handler = modelMessageHandlerMap.get(modelMessageBO.getModelCode().name());
        if (handler != null) {
            if (handler.handleDataModelRun(modelMessageBO)) {
                redisTemplate.opsForStream().acknowledge(streamKey, group, message.getId());
            }
        } else {
            log.error("No handler found for model code: {}", modelMessageBO.getModelCode().name());
            // Still acknowledge the message to prevent it from being reprocessed
            redisTemplate.opsForStream().acknowledge(streamKey, group, message.getId());
        }
    }
}
