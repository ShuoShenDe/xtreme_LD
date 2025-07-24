# Xtreme1 效率监控系统 - 访问指南

## 🚀 快速访问

### 📊 主要示例页面

| 页面 | URL | 描述 | 推荐度 |
|------|-----|------|--------|
| **首页索引** | http://localhost:8001/examples/index.html | 美观的导航首页，包含所有示例 | ⭐⭐⭐⭐⭐ |
| **效率仪表板** | http://localhost:8001/examples/dashboard_fixed.html | Chart.js完全修复版本（推荐） | ⭐⭐⭐⭐⭐ |
| **项目监控** | http://localhost:8001/examples/project_monitor.html | 项目级别监控面板 | ⭐⭐⭐⭐ |
| **团队管理** | http://localhost:8001/examples/team_management.html | 团队效率管理界面 | ⭐⭐⭐⭐ |

### 📚 文档

| 资源 | URL | 描述 |
|------|-----|------|
| **完整文档** | http://localhost:8001/examples/README.md | 详细使用说明和修复方案 |
| **API信息** | http://localhost:8001/ | 服务状态和API列表 |

## 🛠️ 服务管理

### 启动服务
```bash
cd efficiency-service
docker-compose up -d
```

### 检查状态
```bash
docker-compose ps
```

### 查看日志
```bash
docker-compose logs efficiency_service
```

### 停止服务
```bash
docker-compose down
```

## ✅ 验证清单

访问任何页面前，请确认：

1. ✅ 所有Docker容器正在运行
2. ✅ http://localhost:8001/ 返回JSON响应
3. ✅ 浏览器控制台无Chart.js错误
4. ✅ 图表正常显示和更新

## 🔧 故障排除

### 404错误
- 确认服务正在运行：`docker-compose ps`
- 检查URL拼写是否正确
- 重启服务：`docker-compose restart efficiency_service`

### Chart.js错误
- 使用推荐的修复版本：`dashboard_fixed.html`
- 强制刷新浏览器：Ctrl+F5
- 清除浏览器缓存

### 数据加载问题
- 检查API服务状态
- 查看浏览器网络请求
- 使用默认模拟数据（自动降级）

## 🌟 最佳实践

1. **首次访问**：从 http://localhost:8001/examples/index.html 开始
2. **生产使用**：使用 `dashboard_fixed.html`
3. **开发调试**：使用 `personal_dashboard.html`
4. **问题诊断**：使用测试页面验证功能

## 📞 技术支持

如遇问题：
1. 查看 `README.md` 获取详细说明
2. 检查浏览器控制台错误信息
3. 查看Docker容器日志
4. 确认网络连接和端口访问 