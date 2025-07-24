-- 更新字段名称
ALTER TABLE efficiency_metrics RENAME COLUMN meta_data TO extra_data;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_efficiency_metrics_timestamp ON efficiency_metrics (timestamp);
CREATE INDEX IF NOT EXISTS idx_efficiency_metrics_metric_type ON efficiency_metrics (metric_type);

-- 更新注释
COMMENT ON COLUMN efficiency_metrics.extra_data IS '事件相关的额外数据，存储为JSON格式';
COMMENT ON COLUMN efficiency_metrics.metric_type IS '指标类型：annotation_time, fps等';
COMMENT ON COLUMN efficiency_metrics.metric_value IS '指标值'; 