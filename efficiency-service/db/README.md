# 数据库架构和迁移

## 目录结构

```
db/
├── init/                           # 数据库初始化脚本
│   └── V1__Initial_schema.sql     # 初始数据库架构
├── migrations/                     # 数据库迁移脚本
│   └── V5__Update_field_names.sql # 字段名称更新
└── README.md                      # 本文档
```

## 初始化脚本 (init/)

### V1__Initial_schema.sql
包含完整的数据库表结构定义：

**核心表**:
- `efficiency_metrics` - 效率指标数据
- `user_stats` - 用户统计信息
- `project_stats` - 项目统计信息
- `task_stats` - 任务统计信息
- `tool_usage` - 工具使用统计
- `system_health` - 系统健康状态

**特性**:
- 完整的索引定义
- 约束和关系
- 初始数据插入
- PostgreSQL 14 兼容

## 迁移脚本 (migrations/)

### V5__Update_field_names.sql
- 字段重命名: `meta_data` → `extra_data`
- 性能优化索引
- 字段注释更新

## 使用方法

### 1. 开发环境初始化
```bash
# Docker容器会自动执行初始化脚本
docker-compose up -d postgres
```

### 2. 手动执行初始化
```bash
psql -h localhost -p 5433 -U postgres -d xtreme1_efficiency -f db/init/V1__Initial_schema.sql
```

### 3. 执行迁移脚本
```bash
psql -h localhost -p 5433 -U postgres -d xtreme1_efficiency -f db/migrations/V5__Update_field_names.sql
```

## 命名规范

### 初始化脚本
- 格式: `V{version}__Description.sql`
- 例如: `V1__Initial_schema.sql`

### 迁移脚本
- 格式: `V{version}__Description.sql`
- 版本号递增，描述简洁明确
- 例如: `V5__Update_field_names.sql`

## 重要提醒

1. **Docker配置更新**: 如果移动了init.sql，需要更新docker-compose.yml中的挂载路径
2. **生产环境**: 迁移脚本需要在生产环境中谨慎执行
3. **备份**: 执行任何数据库变更前都应进行备份
4. **测试**: 所有迁移脚本都应在测试环境中验证

## 相关文件

- `docker-compose.yml` - Docker数据库配置
- `app/core/database.py` - 数据库连接配置
- `app/models/` - SQLAlchemy模型定义 