# 效率监控系统 - 阶段1设计文档

## 项目概述

本项目旨在构建一个全方位的用户标注效率监督和后台计算效率评估系统，为标注工作提供数据驱动的监控和分析能力。

### 主要目标
1. **标注效率监督**: 实时监控用户标注行为，计算标注效率指标
2. **后台计算评估**: 监控标注辅助计算的性能和效率
3. **数据可视化**: 提供直观的报表和实时监控界面
4. **异常检测**: 识别效率异常和性能问题

## 阶段1：基础数据收集系统

### 1. 技术架构

#### 1.1 整体架构
```
前端埋点SDK → FastAPI接收层 → Redis队列 → Celery Worker → 数据存储
                                                    ↓
                           查询API ← 数据分析 ← PostgreSQL + InfluxDB
```

#### 1.2 技术栈选择
- **前端**: TypeScript + Vue.js 3
- **后端**: Python + FastAPI + Celery
- **数据库**: PostgreSQL (关系数据) + InfluxDB (时序数据)
- **缓存/队列**: Redis
- **监控**: Grafana + Prometheus
- **部署**: Docker + Docker Compose

### 2. 数据收集设计

#### 2.1 前端埋点SDK
位置: `frontend/efficiency/`

**核心功能**:
- 事件收集器 (EventCollector)
- 数据缓冲器 (DataBuffer)
- 网络管理器 (NetworkManager)
- 工具集成模块 (pc-tool, image-tool, text-tool)

**主要事件类型**:
- 标注行为事件 (AnnotationEvent)
- 性能监控事件 (PerformanceEvent)
- 用户交互事件 (UserInteractionEvent)
- 后台计算事件 (BackendComputationEvent)
- 任务状态事件 (TaskStatusEvent)
- 错误事件 (ErrorEvent)

#### 2.2 数据上报机制
- **批量上报**: 每10秒或100个事件触发一次
- **实时上报**: 关键事件立即上报
- **断网重试**: 本地缓存，网络恢复后重新上报
- **数据压缩**: 采用gzip压缩减少传输量

### 3. 后端服务设计

#### 3.1 服务架构
位置: `backend/efficiency-monitor/`

**核心组件**:
- **FastAPI应用**: 提供RESTful API接口
- **Celery Worker**: 异步处理事件数据
- **数据处理服务**: 计算效率指标和统计数据
- **报表生成服务**: 生成各种效率报表

#### 3.2 API设计
**主要端点**:
- `POST /api/v1/events/batch` - 批量事件上报
- `GET /api/v1/metrics/user-efficiency` - 用户效率查询
- `GET /api/v1/metrics/computation-efficiency` - 计算效率查询
- `POST /api/v1/reports/generate` - 生成报表
- `GET /api/v1/realtime/user-activity` - 实时用户活动

### 4. 数据存储设计

#### 4.1 PostgreSQL Schema
**主要表结构**:
- `users` - 用户信息
- `projects` - 项目信息
- `tasks` - 任务信息
- `annotations` - 标注对象
- `task_sessions` - 任务会话
- `efficiency_metrics` - 效率指标汇总
- `computation_jobs` - 后台计算任务
- `user_behavior_logs` - 用户行为日志

#### 4.2 InfluxDB Schema
**主要测量值**:
- `user_events` - 用户行为事件
- `performance_metrics` - 性能指标
- `computation_metrics` - 计算效率数据
- `task_efficiency` - 任务效率汇总
- `error_events` - 错误和异常
- `system_metrics` - 系统资源使用

### 5. 核心指标定义

#### 5.1 用户效率指标
- **标注速度**: 每小时标注对象数
- **标注质量**: 标注准确率和一致性
- **活跃时间**: 实际工作时间 vs 总在线时间
- **任务完成时间**: 任务开始到完成的时间
- **错误率**: 标注错误次数/总标注次数

#### 5.2 后台计算效率指标
- **计算时间**: 各类计算任务的平均执行时间
- **吞吐量**: 单位时间内处理的数据量
- **准确率**: 自动标注的准确率
- **资源利用率**: CPU、内存、GPU使用率
- **成功率**: 计算任务的成功完成率

#### 5.3 系统性能指标
- **响应时间**: API接口响应时间
- **渲染性能**: 前端渲染帧率和延迟
- **内存使用**: 应用内存消耗
- **错误率**: 系统错误发生频率

### 6. 部署配置

#### 6.1 Docker Compose架构
**服务组件**:
- `postgres` - PostgreSQL数据库
- `influxdb` - InfluxDB时序数据库
- `redis` - Redis缓存和消息队列
- `api` - FastAPI应用服务
- `worker` - Celery异步任务处理
- `beat` - Celery定时任务调度
- `nginx` - 反向代理和负载均衡
- `grafana` - 监控面板
- `prometheus` - 系统监控

#### 6.2 环境配置
**核心配置项**:
- 数据库连接配置
- Redis连接配置
- JWT认证配置
- 日志和监控配置
- 性能调优参数

### 7. 监控和运维

#### 7.1 系统监控
- **应用监控**: API性能、错误率、响应时间
- **数据库监控**: 连接数、查询性能、存储使用
- **队列监控**: 任务堆积、处理速度、失败率
- **资源监控**: CPU、内存、磁盘、网络使用

#### 7.2 日志管理
- **结构化日志**: 使用JSON格式记录关键事件
- **日志分级**: DEBUG、INFO、WARNING、ERROR
- **日志轮转**: 按大小和时间自动轮转
- **日志聚合**: 集中收集和分析日志

### 8. 安全设计

#### 8.1 认证和授权
- **JWT认证**: 无状态的用户认证
- **角色权限**: 基于角色的访问控制
- **API限流**: 防止接口滥用
- **数据脱敏**: 敏感信息加密存储

#### 8.2 数据安全
- **传输加密**: HTTPS/TLS加密
- **存储加密**: 数据库加密
- **访问审计**: 记录所有数据访问
- **备份恢复**: 定期数据备份

### 9. 性能优化

#### 9.1 数据库优化
- **索引设计**: 为常用查询创建索引
- **查询优化**: 使用视图和预聚合
- **分区策略**: 按时间分区时序数据
- **连接池**: 优化数据库连接管理

#### 9.2 缓存策略
- **Redis缓存**: 缓存热点数据
- **查询缓存**: 缓存复杂查询结果
- **CDN加速**: 静态资源分发
- **数据预计算**: 预先计算常用指标

### 10. 下一步计划

#### 10.1 阶段2：数据分析和可视化
- 实现实时数据分析算法
- 构建可视化监控面板
- 开发效率趋势分析功能
- 实现异常检测和告警

#### 10.2 阶段3：智能化功能
- 机器学习模型训练
- 智能效率预测
- 自动化报表生成
- 个性化效率建议

#### 10.3 阶段4：系统优化
- 性能调优和扩展
- 高可用性部署
- 数据治理和质量
- 用户体验优化

## 文件结构总览

```
项目根目录/
├── frontend/
│   └── common/
│       └── efficiency-tracker/          # 前端埋点SDK
├── backend/
│   └── efficiency-monitor/              # Python后端服务
│       ├── app/                         # FastAPI应用
│       ├── database_schema.sql          # PostgreSQL Schema
│       ├── influxdb_schema.md          # InfluxDB Schema文档
│       ├── api_design.md               # API设计文档
│       ├── docker-compose.yml          # Docker部署配置
│       └── environment_config.md       # 环境配置说明
└── EFFICIENCY_MONITOR_PHASE1_DESIGN.md # 本设计文档
```

## 预期效果

### 1. 监控能力
- 实时监控100+个关键指标
- 支持1000+并发用户数据收集
- 99.9%的数据采集准确率
- 秒级的监控数据更新

### 2. 分析能力
- 多维度效率分析
- 历史趋势对比
- 异常模式识别
- 性能瓶颈定位

### 3. 报表能力
- 自动化报表生成
- 多格式报表导出
- 定制化报表配置
- 邮件和通知推送

这个阶段1的设计为后续的数据分析和智能化功能奠定了坚实的基础，确保系统具备良好的扩展性和可维护性。 