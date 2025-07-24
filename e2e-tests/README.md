# Xtreme1 GUI自动化测试

这是Xtreme1前端工具的E2E自动化测试套件，支持Image-Tool、PC-Tool和Text-Tool的功能测试。

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn
- Chrome/Chromium浏览器

### 安装依赖
```bash
# Windows PowerShell
.\run-tests.ps1 setup

# Linux/macOS Bash
./run-tests.sh setup
```

## 📋 可用命令

### 基础测试命令

| 命令 | Windows | Linux/macOS | 描述 |
|------|---------|-------------|------|
| 环境设置 | `.\run-tests.ps1 setup` | `./run-tests.sh setup` | 安装依赖和浏览器 |
| 所有测试 | `.\run-tests.ps1 all` | `./run-tests.sh all` | 运行所有测试 |
| 核心功能 | `.\run-tests.ps1 rect` | `./run-tests.sh rect` | 运行2D矩形标注测试 |
| Image-Tool | `.\run-tests.ps1 image-tool` | `./run-tests.sh image-tool` | Image-Tool所有测试 |
| PC-Tool | `.\run-tests.ps1 pc-tool` | `./run-tests.sh pc-tool` | PC-Tool所有测试 |

### 开发和调试

| 命令 | Windows | Linux/macOS | 描述 |
|------|---------|-------------|------|
| 开发服务器 | `.\run-tests.ps1 dev` | `./run-tests.sh dev` | 启动开发服务器 |
| 调试模式 | `.\run-tests.ps1 debug` | `./run-tests.sh debug` | 调试模式运行测试 |
| UI模式 | `.\run-tests.ps1 ui` | `./run-tests.sh ui` | 交互式UI测试 |

### 报告和清理

| 命令 | Windows | Linux/macOS | 描述 |
|------|---------|-------------|------|
| 测试报告 | `.\run-tests.ps1 report` | `./run-tests.sh report` | 生成并打开报告 |
| 清理结果 | `.\run-tests.ps1 clean` | `./run-tests.sh clean` | 清理测试结果 |
| 清理端口 | `.\run-tests.ps1 clean-ports` | `./run-tests.sh clean-ports` | 清理占用端口 |

### CI模式

| 命令 | Windows | Linux/macOS | 描述 |
|------|---------|-------------|------|
| CI完整流程 | `.\run-tests.ps1 ci` | `./run-tests.sh ci` | CI模式完整测试 |
| CI所有测试 | `.\run-tests.ps1 all --ci` | `./run-tests.sh all --ci` | CI模式运行所有测试 |
| CI核心测试 | `.\run-tests.ps1 rect --ci` | `./run-tests.sh rect --ci` | CI模式运行核心测试 |

## 🔧 新功能特性

### ✅ 静默启动
- 开发服务器启动时不会自动打开浏览器
- 适合CI环境和自动化测试

### ✅ 智能服务检测
- 自动检测服务是否就绪（支持404、403响应）
- 不再需要等待固定时间

### ✅ 端口管理
- 自动清理占用3200/3300端口的Node.js进程
- 智能识别和管理开发服务器进程

### ✅ 退出码处理
- CI模式下测试失败会正确返回非零退出码
- 支持GitLab CI的自动构建失败判断

## 🏗️ GitLab CI集成

### 测试阶段
项目现在包含完整的GitLab CI测试流水线：

1. **E2E测试** (`e2e-tests`)
   - 运行所有端到端测试
   - 生成JUnit XML和HTML报告
   - 失败时阻止部署

2. **核心功能测试** (`core-functionality-test`)
   - 运行关键的矩形标注测试
   - 确保核心功能正常工作

3. **代码质量检查** (`frontend-lint`)
   - ESLint代码检查
   - TypeScript类型检查

4. **性能测试** (`performance-tests`)
   - 主分支和定时运行
   - 监控应用性能

5. **视觉回归测试** (`visual-regression-tests`)
   - 检测UI变化
   - 确保视觉一致性

### 测试报告
- **GitLab Pages**: 自动发布测试报告到 `https://your-project.gitlab.io/`
- **JUnit报告**: 集成到GitLab测试结果页面
- **工件收集**: 保存测试截图、视频和详细报告

### 触发条件
- **推送到任何分支**: 运行E2E和核心功能测试
- **合并请求**: 运行完整的测试套件
- **主分支**: 额外运行性能和视觉测试
- **定时任务**: 每日完整测试

## 📊 测试结果格式

### JUnit XML (`test-results/junit.xml`)
```xml
<testsuites tests="38" failures="0" time="72.59">
  <testsuite name="image-tool" tests="10" failures="0">
    <testcase name="Rectangle Annotation" time="2.1"/>
  </testsuite>
</testsuites>
```

### JSON详细数据 (`test-results/results.json`)
- 完整的测试执行信息
- 性能指标和时间数据
- 错误堆栈和截图路径

### HTML可视化报告 (`html-report/`)
- 交互式测试报告
- 失败时的截图和视频
- 测试执行时间线

## 🔍 故障排除

### 常见问题

1. **端口占用**
   ```bash
   # 清理占用的端口
   ./run-tests.sh clean-ports
   ```

2. **浏览器未安装**
   ```bash
   # 重新安装Playwright浏览器
   npx playwright install --with-deps
   ```

3. **服务启动失败**
   ```bash
   # 检查依赖是否正确安装
   ./run-tests.sh setup
   ```

4. **测试超时**
   - 检查系统资源使用情况
   - 确保没有其他进程占用端口

### 日志和调试
- 使用 `debug` 模式查看详细执行过程
- 检查 `test-results/` 目录中的详细日志
- 使用 `ui` 模式进行交互式调试

## 📈 性能优化

### CI环境优化
- 使用Docker缓存加速依赖安装
- 并行运行不相关的测试
- 智能工件收集和过期策略

### 本地开发优化
- 静默启动减少资源消耗
- 智能服务检测减少等待时间
- 增量测试支持（仅运行相关测试）

## 🤝 贡献指南

1. **添加新测试**
   - 在 `tests/e2e/` 目录下创建新的测试文件
   - 遵循现有的命名约定
   - 添加相应的文档

2. **修改CI配置**
   - 测试配置变更在本地环境
   - 确保向后兼容性
   - 更新相关文档

3. **报告问题**
   - 提供详细的错误信息
   - 包含环境信息和复现步骤
   - 附上相关的测试报告

---

更多信息请参考项目文档或联系开发团队。 