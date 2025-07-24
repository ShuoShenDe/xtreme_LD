# Xtreme1 效率监控服务

这是Xtreme1项目的效率监控后端服务，基于FastAPI + Celery + PostgreSQL + InfluxDB架构。

## 🎯 独立部署说明

**本服务为独立部署服务，不依赖主系统**：
- 拥有自己的 `docker-compose.yml` 文件
- 使用独立的数据库和端口
- 可以与主系统并行运行
- 避免与主系统的端口冲突

## ✅ 服务状态

**生产就绪的效率监控系统**

系统架构组件：
- **FastAPI 主服务** (端口 8001) - RESTful API服务
- **Celery Worker** - 异步任务处理
- **Flower 监控界面** (端口 5555) - 任务队列监控
- **PostgreSQL 数据库** (端口 5433) - 结构化数据存储
- **Redis 缓存** (端口 6380) - 缓存和消息队列
- **InfluxDB 时序数据库** (端口 8087) - 时间序列数据

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend SDK  │    │  Python Service │    │   Databases     │
│                 │    │                 │    │                 │
│  • pc-tool      │───▶│  • FastAPI      │───▶│  • PostgreSQL   │
│  • image-tool   │    │  • Celery       │    │  • InfluxDB     │
│  • text-tool    │    │  • Redis        │    │  • Redis        │
│  • main         │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 功能特性

- ✅ **事件收集**: 批量处理前端事件数据
- ✅ **实时存储**: InfluxDB时序数据库存储
- ✅ **统计分析**: PostgreSQL关系数据库统计
- ✅ **异步处理**: Celery后台任务队列
- ✅ **健康监控**: 完整的健康检查API
- ✅ **容器化部署**: Docker + Docker Compose
- ✅ **任务监控**: Flower Web界面

## 目录结构

```
efficiency-service/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI应用入口
│   ├── celery_app.py          # Celery应用配置
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # 配置管理
│   │   └── database.py        # 数据库连接
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py      # API路由聚合
│   │       ├── events.py      # 事件收集API
│   │       └── health.py      # 健康检查API
│   ├── models/
│   │   ├── __init__.py
│   │   └── efficiency_metrics.py # 效率指标模型
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── event.py           # 事件Schema
│   └── services/
│       ├── __init__.py
│       ├── event_processor.py # 事件处理服务
│       └── influxdb_service.py # InfluxDB服务
├── Dockerfile                  # Docker配置
├── docker-compose.yml         # Docker Compose配置
├── requirements.txt            # Python依赖
├── init.sql                   # 数据库初始化脚本
├── start-efficiency-monitor.bat # Windows启动脚本
├── start-efficiency-monitor.sh  # Linux/Mac启动脚本
├── start.sh                   # 简单启动脚本
└── README.md                  # 本文档
```

## 快速开始

### 1. 环境准备

确保您的系统已安装：
- Docker 20.10+
- Docker Compose 2.0+
- Python 3.9+ (开发时需要)

### 2. 启动服务 (推荐方式)

**方式一：使用启动脚本 (Windows)**
```batch
# 在efficiency-service目录中运行
start-efficiency-monitor.bat
```

选择操作：
- 1) 启动服务 (start)
- 2) 停止服务 (stop) 
- 3) 重启服务 (restart)
- 4) 查看日志 (logs)
- 5) 查看状态 (status)
- 6) 清理数据 (clean)
- 7) 完全重建 (rebuild)

**方式二：使用启动脚本 (Linux/Mac)**
```bash
# 在efficiency-service目录中运行
chmod +x start-efficiency-monitor.sh
./start-efficiency-monitor.sh
```

**方式三：手动启动**
```bash
# 进入efficiency-service目录
cd efficiency-service

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f efficiency_service
```

### 3. 验证服务

**检查所有服务状态：**
```bash
# 查看容器状态
docker ps --filter "name=efficiency_"

# 检查端口监听
netstat -an | findstr ":8001\|:5555\|:5433\|:6380\|:8087"
```

**测试API端点：**
```bash
# 主服务根路径
curl http://localhost:8001/

# 健康检查 (正确路径)
curl http://localhost:8001/api/v1/health

# API文档
open http://localhost:8001/docs

# Flower监控界面
open http://localhost:5555
```

### 4. 服务端口

独立部署时使用以下端口 (避免与主系统冲突):

| 服务 | 端口 | 描述 | 访问地址 |
|------|------|------|----------|
| **效率监控API** | 8001 | FastAPI主服务 | http://localhost:8001 |
| **API文档** | 8001 | Swagger文档 | http://localhost:8001/docs |
| **PostgreSQL** | 5433 | 主数据库 | localhost:5433 |
| **InfluxDB** | 8087 | 时序数据库 | localhost:8087 |
| **Redis** | 6380 | 缓存和消息队列 | localhost:6380 |
| **Celery Flower** | 5555 | 任务监控界面 | http://localhost:5555 |

### 5. 测试事件提交

```bash
curl -X POST http://localhost:8001/api/v1/events/batch \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "test-batch-001",
    "events": [
      {
        "event_type": "annotation",
        "timestamp": "2024-01-01T00:00:00Z",
        "user_id": "test-user",
        "project_id": "test-project",
        "data": {
          "type": "create",
          "annotationType": "cuboid",
          "duration": 5000,
          "success": true
        }
      }
    ],
    "metadata": {
      "tool": "pc-tool",
      "version": "1.0.0"
    }
  }'
```

## API 接口

### 核心端点

- `GET /` - 服务根路径，返回服务信息
- `GET /docs` - API交互文档 (Swagger UI)
- `GET /redoc` - API文档 (ReDoc)

### 事件收集 API

- `POST /api/v1/events/batch` - 批量提交事件
- `GET /api/v1/events/stats/{user_id}` - 获取用户统计
- `GET /api/v1/events/performance/{project_id}` - 获取项目性能
- `DELETE /api/v1/events/events/{user_id}` - 清除用户数据

### 健康检查 API

- `GET /api/v1/health/` - 系统健康检查
- `GET /api/v1/health/ready` - 就绪状态检查
- `GET /api/v1/health/live` - 存活状态检查

## 技术栈和依赖

### 核心技术栈

- **Web框架**: FastAPI 0.104.1
- **ASGI服务器**: uvicorn[standard] 0.24.0
- **数据验证**: pydantic 2.4.2, pydantic-settings 2.0.3
- **异步处理**: Celery 5.3.4
- **任务监控**: flower 2.0.1

### 数据库和存储

- **关系数据库**: PostgreSQL 14 (asyncpg 0.28.0)
- **时序数据库**: InfluxDB 2.0 (influxdb-client 1.38.0)
- **缓存/队列**: Redis 7 (redis 5.0.1, aioredis 2.0.1)
- **HTTP客户端**: aiohttp 3.8.6, httpx 0.25.2

### 数据库工具

- **ORM**: SQLAlchemy 2.0.23
- **迁移**: Alembic 1.12.1
- **PostgreSQL驱动**: psycopg2-binary 2.9.9

### 安全和工具

- **认证**: python-jose[cryptography] 3.3.0
- **密码哈希**: passlib[bcrypt] 1.7.4
- **文件上传**: python-multipart 0.0.6
- **日期处理**: python-dateutil 2.8.2

## 前端SDK集成

### 效率追踪SDK

项目包含了通用的效率追踪SDK (`frontend/efficiency/`)：

```typescript
import { EfficiencyTracker } from '../efficiency';

// 配置追踪器
const tracker = EfficiencyTracker.getInstance({
  apiUrl: 'http://localhost:8001/api/v1/events',
  userId: 'current-user-id',
  projectId: 'current-project-id',
  tool: 'pc-tool' // 或 'image-tool', 'text-tool', 'main'
});

// 启动追踪
tracker.start();

// 手动记录事件
tracker.trackEvent('annotation_created', {
  type: 'cuboid',
  duration: 5000
});
```

### 各项目集成示例

#### main项目 (`frontend/main/src/main.ts`)

```typescript
import { EfficiencyTracker } from '../efficiency';

const tracker = EfficiencyTracker.getInstance({
  apiUrl: 'http://localhost:8001/api/v1/events',
  userId: getCurrentUserId(),
  projectId: getCurrentProjectId(),
  tool: 'main'
});

tracker.start();
```

#### pc-tool项目 (`frontend/pc-tool/src/main.ts`)

```typescript
import { EfficiencyTracker } from '../efficiency';

const tracker = EfficiencyTracker.getInstance({
  apiUrl: 'http://localhost:8001/api/v1/events',
  userId: getCurrentUserId(),
  projectId: getCurrentProjectId(),
  tool: 'pc-tool'
});

tracker.start();
```

## 环境配置

### 开发环境

创建 `.env.development` 文件：

```env
ENVIRONMENT=development
DEBUG=true
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=xtreme1_efficiency
INFLUXDB_HOST=localhost
INFLUXDB_PORT=8086
INFLUXDB_TOKEN=your_influxdb_token
INFLUXDB_ORG=xtreme1
INFLUXDB_BUCKET=efficiency_events
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 生产环境

创建 `.env.production` 文件：

```env
ENVIRONMENT=production
DEBUG=false
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=xtreme1_efficiency
INFLUXDB_HOST=your-influxdb-host
INFLUXDB_PORT=8086
INFLUXDB_TOKEN=your_production_token
INFLUXDB_ORG=xtreme1
INFLUXDB_BUCKET=efficiency_events
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

## 监控和维护

### 服务监控

```bash
# 查看所有服务状态
docker-compose ps

# 实时查看主服务日志
docker-compose logs -f efficiency_service

# 查看Worker日志
docker-compose logs -f efficiency_worker

# 查看Flower日志
docker-compose logs -f efficiency_flower

# 查看数据库日志
docker-compose logs -f efficiency_postgres
docker-compose logs -f efficiency_influxdb
docker-compose logs -f efficiency_redis
```

### Flower任务监控

访问 http://localhost:5555 查看：
- 活动任务
- 任务历史
- Worker状态
- 队列信息
- 任务统计

### 数据库管理

```bash
# 连接PostgreSQL
docker exec -it efficiency_postgres psql -U postgres -d xtreme1_efficiency

# 查看所有表
\dt

# 查询效率指标
SELECT * FROM efficiency_metrics LIMIT 10;

# 查询用户统计
SELECT * FROM user_stats;

# 连接InfluxDB (如果需要)
docker exec -it efficiency_influxdb influx
```

## 故障排除

### 常见问题及解决方案

#### 1. 服务启动失败

```bash
# 检查Docker状态
docker-compose ps

# 查看详细错误日志
docker-compose logs efficiency_service

# 重新构建并启动
docker-compose down
docker-compose up -d --build
```

#### 2. 健康检查失败 (404)

**注意**: 健康检查端点是 `/api/v1/health`，不是 `/health`

```bash
# 正确的健康检查
curl http://localhost:8001/api/v1/health

# 错误的路径 (会返回404)
curl http://localhost:8001/health
```

#### 3. 数据库连接失败

```bash
# 检查PostgreSQL状态
docker-compose exec efficiency_postgres pg_isready

# 重启数据库
docker-compose restart efficiency_postgres

# 检查数据库日志
docker-compose logs efficiency_postgres
```

#### 4. Celery Worker 连接失败

```bash
# 检查Redis状态
docker-compose exec efficiency_redis redis-cli ping

# 重启Redis
docker-compose restart efficiency_redis

# 重启Worker
docker-compose restart efficiency_worker
```

#### 5. 端口冲突

如果遇到端口冲突，检查以下端口是否被占用：
- 8001 (主服务)
- 5555 (Flower)
- 5433 (PostgreSQL)
- 6380 (Redis)
- 8087 (InfluxDB)

```bash
# Windows检查端口
netstat -an | findstr ":8001"

# Linux/Mac检查端口
lsof -i :8001
```

### 调试模式

```bash
# 开启调试模式
export DEBUG=true
export ENVIRONMENT=development

# 重启服务以应用调试设置
docker-compose restart efficiency_service

# 查看详细日志
docker-compose logs -f efficiency_service
```

### 完全重置

如果需要完全重置服务和数据：

```bash
# 停止所有服务并清除数据
docker-compose down -v

# 重新构建并启动
docker-compose up -d --build

# 验证服务状态
docker-compose ps
curl http://localhost:8001/api/v1/health
```

## 部署和扩展

### Docker Compose 部署

当前配置支持单机部署，所有服务运行在独立网络中：

```yaml
# docker-compose.yml 关键配置
networks:
  efficiency_network:
    driver: bridge

volumes:
  postgres_data:
  influxdb_data:
  redis_data:
```

### 生产环境建议

1. **安全配置**:
   - 更改默认密码
   - 配置防火墙规则
   - 启用SSL/TLS

2. **性能优化**:
   - 增加Worker数量
   - 配置数据库连接池
   - 启用Redis持久化

3. **监控告警**:
   - 集成Prometheus + Grafana
   - 配置日志聚合
   - 设置健康检查告警

## 相关文档

- [效率监控设计文档](./EFFICIENCY_MONITOR_PHASE1_DESIGN.md)
- [Docker配置说明](./Dockerfile)
- [数据库初始化脚本](./init.sql)
- [API交互文档](http://localhost:8001/docs) (服务启动后可访问)

## 版本信息

- **服务版本**: 1.0.0
- **Python版本**: 3.9+
- **FastAPI版本**: 0.104.1
- **Docker镜像**: python:3.9-slim

## 技术支持

如有问题，请按以下顺序检查：

1. **服务状态**: `docker-compose ps`
2. **服务日志**: `docker-compose logs efficiency_service`
3. **健康检查**: `curl http://localhost:8001/api/v1/health`
4. **端口监听**: `netstat -an | findstr ":8001"`
5. **数据库连接**: 检查PostgreSQL、InfluxDB、Redis状态
6. **网络配置**: 确认端口和防火墙设置

**服务已验证可正常运行，所有核心功能已通过测试！**

---

**✅ 状态**: 生产就绪 | **🔗 API文档**: http://localhost:8001/docs | **📊 监控**: http://localhost:5555 