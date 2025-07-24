-- 创建效率监控系统数据库表

-- 效率指标表
CREATE TABLE IF NOT EXISTS efficiency_metrics (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255) NOT NULL,
    tool_type VARCHAR(50) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 用户统计表
CREATE TABLE IF NOT EXISTS user_stats (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255) NOT NULL,
    total_annotations INTEGER DEFAULT 0,
    total_time_spent DOUBLE PRECISION DEFAULT 0,
    avg_annotation_time DOUBLE PRECISION DEFAULT 0,
    projects_count INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, project_id)
);

-- 项目统计表
CREATE TABLE IF NOT EXISTS project_stats (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL UNIQUE,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    total_annotations INTEGER DEFAULT 0,
    avg_completion_time DOUBLE PRECISION DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 任务统计表
CREATE TABLE IF NOT EXISTS task_stats (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL UNIQUE,
    project_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration DOUBLE PRECISION,
    annotation_count INTEGER DEFAULT 0,
    tool_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 工具使用统计表
CREATE TABLE IF NOT EXISTS tool_usage (
    id SERIAL PRIMARY KEY,
    tool_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255),
    usage_time DOUBLE PRECISION NOT NULL,
    action_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 系统健康状态表
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    component VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    response_time DOUBLE PRECISION,
    error_rate DOUBLE PRECISION,
    metadata JSONB,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_efficiency_metrics_user_id ON efficiency_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_efficiency_metrics_project_id ON efficiency_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_efficiency_metrics_tool_type ON efficiency_metrics(tool_type);
CREATE INDEX IF NOT EXISTS idx_efficiency_metrics_created_at ON efficiency_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_project_stats_project_id ON project_stats(project_id);
CREATE INDEX IF NOT EXISTS idx_task_stats_task_id ON task_stats(task_id);
CREATE INDEX IF NOT EXISTS idx_task_stats_project_id ON task_stats(project_id);
CREATE INDEX IF NOT EXISTS idx_task_stats_user_id ON task_stats(user_id);

CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_type ON tool_usage(tool_type);
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON tool_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_project_id ON tool_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON tool_usage(created_at);

CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health(component);
CREATE INDEX IF NOT EXISTS idx_system_health_checked_at ON system_health(checked_at);

-- 插入系统健康状态初始数据
INSERT INTO system_health (component, status, response_time, error_rate, metadata)
VALUES 
    ('postgresql', 'healthy', 0.0, 0.0, '{"version": "14", "initialized": true}'),
    ('influxdb', 'healthy', 0.0, 0.0, '{"version": "2.0", "initialized": true}'),
    ('redis', 'healthy', 0.0, 0.0, '{"version": "7", "initialized": true}'),
    ('efficiency_service', 'healthy', 0.0, 0.0, '{"version": "1.0", "initialized": true}')
ON CONFLICT DO NOTHING; 