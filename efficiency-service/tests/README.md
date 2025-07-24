# 测试文件说明

## 目录内容

本目录包含效率监控服务的测试脚本和工具：

### 测试脚本

1. **`simple_test.py`** - Python简化测试脚本
   - 功能：测试基础API功能（用户统计、行为分析、智能建议）
   - 使用方法：`python simple_test.py`
   - 依赖：requests, json

2. **`test_api_simple.py`** - Python API端点测试
   - 功能：测试基础端点和分析端点
   - 使用方法：`python test_api_simple.py`
   - 依赖：requests, json

3. **`test_analysis.ps1`** - PowerShell测试脚本
   - 功能：Windows环境下的API测试
   - 使用方法：在PowerShell中运行 `.\test_analysis.ps1`
   - 优势：无需Python环境，直接使用系统工具

4. **`analyze_influxdb_hourly.py`** - InfluxDB数据分析脚本 🆕
   - 功能：连接InfluxDB，获取和分析最近1小时的效率监控数据
   - 使用方法：`python analyze_influxdb_hourly.py`
   - 高级选项：
     - `--hours 3` - 分析最近3小时的数据
     - `--output report.txt` - 保存报告到文件
     - `--json` - 输出JSON格式的分析结果
   - 依赖：influxdb-client, pandas

5. **`run_hourly_analysis.bat`** - Windows快速分析脚本 🆕
   - 功能：一键运行InfluxDB数据分析（自动安装依赖）
   - 使用方法：双击运行或在cmd中执行
   - 优势：自动检查和安装Python依赖包

## 使用前提

确保效率监控服务正在运行：
```bash
cd ../
docker-compose up -d
```

## 推荐使用顺序

1. 首先运行 `simple_test.py` 进行基础功能测试
2. 如果需要详细的端点测试，运行 `test_api_simple.py`
3. **分析实际数据：运行 `run_hourly_analysis.bat` 或 `analyze_influxdb_hourly.py`** 🔥
4. Windows用户可以直接使用 `test_analysis.ps1`

## InfluxDB数据分析功能

新增的数据分析脚本提供以下分析功能：
- 📊 **总体概况**: 数据量、时间范围、活动频率
- ⏰ **时间分布**: 每分钟事件统计、峰值活动时间、安静期分析  
- 🎯 **事件类型**: 不同类型事件的分布和统计
- 👥 **用户活动**: 用户行为分析、最活跃用户识别
- 📁 **项目分析**: 项目活动分布和热点项目
- ⚡ **性能指标**: 响应时间、加载时间等性能分析
- ❌ **错误统计**: 错误率分析和错误详情

### 使用示例
```bash
# 基础分析（最近1小时）
python analyze_influxdb_hourly.py

# 分析最近3小时数据
python analyze_influxdb_hourly.py --hours 3

# 保存报告到文件
python analyze_influxdb_hourly.py --output today_report.txt

# 输出JSON格式（便于程序处理）
python analyze_influxdb_hourly.py --json --output data.json
```

## 注意事项

- 所有测试脚本都使用默认的服务地址 `http://localhost:8001`
- 测试用户ID为 `test_user_001`
- 如果需要修改配置，请编辑各脚本中的配置变量 