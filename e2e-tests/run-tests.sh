#!/bin/bash

# Xtreme1 GUI自动化测试运行脚本 (Bash版本)
# 使用方法: ./run-tests.sh [选项] [--ci]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 全局变量
SERVERS_PID=()
CI_MODE=false
CLEANUP_REGISTERED=false

# 检查CI模式 - 支持环境变量和命令行参数
if [[ "$CI" == "true" ]]; then
    CI_MODE=true
fi

# 检查CI命令行参数
for arg in "$@"; do
    if [[ "$arg" == "--ci" ]]; then
        CI_MODE=true
        break
    fi
done

# 打印彩色信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示使用帮助
show_help() {
    echo "Xtreme1 GUI自动化测试运行脚本 (Bash版本)"
    echo ""
    echo "使用方法:"
    echo "  ./run-tests.sh [选项] [--ci]"
    echo ""
    echo "选项:"
    echo "  setup           - 安装依赖和浏览器"
    echo "  all             - 运行所有测试"
    echo "  rect            - 运行2D矩形标注测试 (核心功能)"
    echo "  core            - 运行核心功能测试 (矩形、折线、多边形)"
    echo "  iss             - 运行ISS工具测试 (语义分割)"
    echo "  iss-extended    - 运行ISS工具扩展测试 (基础+高级功能)"
    echo "  image-tool      - 运行Image-Tool所有测试"
    echo "  pc-tool         - 运行PC-Tool所有测试"
    echo "  performance     - 运行性能测试"
    echo "  visual          - 运行视觉回归测试"
    echo "  debug           - 调试模式运行矩形测试"
    echo "  ui              - 交互式UI模式运行测试"
    echo "  report          - 生成并打开测试报告"
    echo "  clean           - 清理测试结果"
    echo "  clean-ports     - 清理占用3200/3300端口的进程"
    echo "  dev             - 启动开发服务器"
    echo "  ci              - CI模式：启动服务器->运行所有测试->清理"
    echo "  help            - 显示此帮助信息"
    echo ""
    echo "参数:"
    echo "  --ci            - CI模式标志，适用于持续集成环境"
    echo ""
    echo "示例:"
    echo "  ./run-tests.sh setup       # 首次运行前的环境setup"
    echo "  ./run-tests.sh rect        # 运行2D矩形标注测试"
    echo "  ./run-tests.sh core        # 运行核心功能测试（矩形、折线、多边形）"
    echo "  ./run-tests.sh ci          # CI模式完整测试"
    echo "  ./run-tests.sh all --ci    # CI模式运行所有测试"
}

# 注册清理函数
register_cleanup() {
    if [ "$CLEANUP_REGISTERED" = "false" ]; then
        trap 'stop_all_servers' EXIT INT TERM
        CLEANUP_REGISTERED=true
    fi
}

# 设置环境变量
set_environment() {
    local enable_mock=${1:-true}
    
    print_info "设置环境变量..."
    
    # 禁用浏览器自动打开（静默启动）
    print_info "设置静默启动模式（禁用浏览器自动打开）"
    export BROWSER="none"
    export VITE_SERVER_OPEN="false"
    
    if [ "$enable_mock" = "true" ]; then
        print_info "启用Mock API模式（适用于开发和调试）"
        export VITE_DISABLE_MOCK="false"
        export VITE_SHOW_MOCK_LOGS="true"
        export NODE_ENV="development"
    else
        print_info "禁用Mock API模式（适用于集成测试）"
        export VITE_DISABLE_MOCK="true"
        export VITE_SHOW_MOCK_LOGS="false"
        export NODE_ENV="test"
    fi
    
    # CI特定环境变量
    if [ "$CI_MODE" = "true" ]; then
        print_info "设置CI环境变量..."
        export CI="true"
        export PLAYWRIGHT_BROWSERS_PATH="0"  # 使用系统浏览器
        export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="1"
        
        # CI环境使用专用的Mock配置文件
        print_info "CI环境：启用CI Mock配置..."
        export NODE_ENV="test"  # 触发CI Mock配置加载
        
        # CI环境中的Vite特定配置
        print_info "CI环境：设置Vite特定配置..."
        export VITE_CI="true"
        export VITE_SKIP_GIT_CHECKS="true"
        export VITE_FORCE_COLOR="0"  # 禁用颜色输出
        export TERM="dumb"  # 设置终端类型
        
        # 确保服务器不自动打开浏览器
        export VITE_OPEN="false"
        export VITE_HOST="0.0.0.0"  # 在CI环境中绑定所有接口
        
        # 增加内存限制以防止OOM
        export NODE_OPTIONS="--max-old-space-size=4096"
    fi
    
    print_success "环境变量设置完成"
    
    # 在CI模式下显示所有相关环境变量
    if [ "$CI_MODE" = "true" ]; then
        print_info "当前环境变量："
        echo "  CI: $CI"
        echo "  NODE_ENV: $NODE_ENV (触发CI Mock配置)"
        echo "  BROWSER: $BROWSER"
        echo "  VITE_SERVER_OPEN: $VITE_SERVER_OPEN"
        echo "  VITE_CI: $VITE_CI"
        echo "  VITE_HOST: $VITE_HOST"
        echo "  NODE_OPTIONS: $NODE_OPTIONS"
    fi
}

# 检查环境
check_environment() {
    print_info "检查环境依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js未安装"
        exit 1
    fi
    
    local node_version=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "Node.js版本过低，需要18+，当前版本: $(node --version)"
        exit 1
    fi
    print_info "Node.js版本检查通过: $(node --version)"
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        print_error "npm未安装"
        exit 1
    fi
    print_info "npm版本: $(npm --version)"
    
    print_success "环境检查通过"
}

# 安装依赖
install_dependencies() {
    print_info "安装测试依赖..."
    
    # 安装根目录依赖
    print_info "安装根目录依赖..."
    npm install
    
    # 安装前端项目依赖
    print_info "安装PC-Tool依赖..."
    (cd ../frontend/pc-tool && npm install)
    
    print_info "安装Image-Tool依赖..."
    echo "PWD=$(pwd)"
    (cd ../frontend/image-tool && npm install)
    
    # 安装Playwright浏览器
    print_info "安装Playwright浏览器..."
    if [ "$CI_MODE" = "true" ]; then
        npx playwright install --with-deps chromium
    else
        npx playwright install --with-deps
    fi
    
    print_success "依赖安装完成"
}

# 检查端口占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口未被占用
    fi
}

# 清理占用端口的进程
clear_port() {
    local port=$1
    print_info "清理端口 $port 上的进程..."
    
    local processes_killed=0
    
    # 使用lsof查找占用端口的进程
    local pids
    pids=$(lsof -ti :$port 2>/dev/null) || true
    
    if [ -n "$pids" ]; then
        for pid in $pids; do
            if kill -0 "$pid" 2>/dev/null; then
                local process_name
                process_name=$(ps -p "$pid" -o comm= 2>/dev/null) || process_name="unknown"
                if [[ "$process_name" =~ ^(node|npm)$ ]]; then
                    print_info "终止进程: PID=$pid, Name=$process_name (Node.js进程)"
                    if kill -TERM "$pid" 2>/dev/null; then
                        sleep 2
                        if kill -0 "$pid" 2>/dev/null; then
                            kill -KILL "$pid" 2>/dev/null || true
                        fi
                        print_success "已终止PID $pid"
                        ((processes_killed++)) || true
                    else
                        print_warning "终止PID $pid 失败"
                    fi
                else
                    print_warning "跳过非Node.js相关进程: PID=$pid, Name=$process_name"
                fi
            fi
        done
    fi
    
    if [ $processes_killed -gt 0 ]; then
        print_success "已终止 $processes_killed 个占用端口 $port 的进程"
        sleep 3
    else
        print_info "端口 $port 未被占用或未发现需要清理的进程"
    fi
    
    # 确保函数成功返回
    return 0
}

# 检查HTTP服务是否可用
test_http_service() {
    local port=$1
    local path=${2:-"/"}
    
    local url="http://localhost:$port$path"
    local timeout=8
    local connect_timeout=3
    
    # CI环境中增加超时时间
    if [ "$CI_MODE" = "true" ]; then
        timeout=12
        connect_timeout=5
    fi
    
    # 使用curl测试，接受404、403等状态码作为服务就绪的标志
    local http_code
    local curl_exit_code
    
    http_code=$(curl -s --max-time "$timeout" --connect-timeout "$connect_timeout" \
                    -w "%{http_code}" -o /dev/null "$url" 2>/dev/null)
    curl_exit_code=$?
    
    # 如果curl命令成功执行且返回了HTTP状态码
    if [ $curl_exit_code -eq 0 ] && [ -n "$http_code" ] && [ "$http_code" != "000" ]; then
        # 检查HTTP状态码 - Vite开发服务器通常返回200
        case "$http_code" in
            200|201|204|301|302|304|404|403|500)
                # 这些状态码表示服务器正在响应
                return 0
                ;;
            *)
                return 1
                ;;
        esac
    else
        return 1  # 连接失败
    fi
}

# 检查Image-Tool服务是否就绪
test_image_tool_ready() {
    test_http_service 3300 "/"
}

# 检查PC-Tool服务是否就绪
test_pc_tool_ready() {
    test_http_service 3200 "/"
}

# 等待服务就绪
wait_for_service() {
    local service_name=$1
    local port=$2
    local timeout=${3:-60}
    
    print_info "等待 $service_name 服务就绪... (端口: $port, 超时: ${timeout}秒)"
    local elapsed=0
    local check_interval=3  # CI环境中增加检查间隔
    
    # CI环境中增加初始等待时间
    if [ "$CI_MODE" = "true" ]; then
        print_info "CI环境：增加初始等待时间..."
        sleep 5
    fi
    
    while [ $elapsed -lt $timeout ]; do
        printf "."
        
        # 根据服务类型选择检测方法（直接测试HTTP服务，不先检查端口）
        local service_ready=false
        case "$service_name" in
            "Image-Tool")
                if test_image_tool_ready; then
                    service_ready=true
                fi
                ;;
            "PC-Tool")
                if test_pc_tool_ready; then
                    service_ready=true
                fi
                ;;
            *)
                if test_http_service "$port"; then
                    service_ready=true
                fi
                ;;
        esac
        
        if [ "$service_ready" = "true" ]; then
            echo ""
            print_success "$service_name 服务已就绪 (用时: ${elapsed}秒)"
            
            # CI环境中额外验证
            if [ "$CI_MODE" = "true" ]; then
                print_info "CI环境：额外验证服务稳定性..."
                sleep 2
                # 再次检查服务是否仍然可用
                case "$service_name" in
                    "Image-Tool")
                        if ! test_image_tool_ready; then
                            print_warning "服务不稳定，继续等待..."
                            sleep $check_interval
                            elapsed=$((elapsed + check_interval))
                            continue
                        fi
                        ;;
                    "PC-Tool")
                        if ! test_pc_tool_ready; then
                            print_warning "服务不稳定，继续等待..."
                            sleep $check_interval
                            elapsed=$((elapsed + check_interval))
                            continue
                        fi
                        ;;
                esac
                print_success "服务稳定性验证通过"
            fi
            return 0
        fi
        
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
        
        # 每10秒显示一次进度
        if [ $((elapsed % 10)) -eq 0 ]; then
            echo ""
            print_info "仍在等待 $service_name 服务就绪... (已等待: ${elapsed}/${timeout}秒)"
            if [ "$CI_MODE" = "true" ]; then
                local port_status="未占用"
                local http_status="无响应"
                local http_code=""
                
                if check_port "$port"; then
                    port_status="占用"
                fi
                
                # 获取详细的HTTP响应码
                http_code=$(curl -s --max-time 3 --connect-timeout 2 \
                                -w "%{http_code}" -o /dev/null "http://localhost:$port/" 2>/dev/null)
                if [ $? -eq 0 ] && [ -n "$http_code" ] && [ "$http_code" != "000" ]; then
                    http_status="HTTP $http_code"
                fi
                
                print_info "端口状态: $port_status, HTTP状态: $http_status"
            fi
        fi
    done
    
    echo ""
    print_error "等待 $service_name 服务就绪超时 (${timeout}秒)"
    return 1
}

# 启动单个服务器
start_single_server() {
    local name=$1
    local port=$2
    local working_dir=$3
    
    print_info "启动 $name 开发服务器 (端口$port)..."
    print_info "工作目录: $working_dir"
    
    # 检查package.json是否存在
    if [ ! -f "$working_dir/package.json" ]; then
        print_error "package.json不存在: $working_dir/package.json"
        return 1
    fi
    
    # 检查npm run dev命令是否存在
    if ! grep -q '"dev"' "$working_dir/package.json"; then
        print_error "package.json中没有dev脚本"
        return 1
    fi
    
    print_info "启动进程: npm run dev"
    
    # 在CI环境中创建日志文件以便调试
    local log_file="/tmp/${name,,}-server.log"
    if [ "$CI_MODE" = "true" ]; then
        print_info "CI模式：启用日志记录 -> $log_file"
        print_info "当前环境变量状态:"
        env | grep -E "^(CI|NODE_|VITE_)" | head -5 || true
    fi
    
    # 启动服务器
    cd "$working_dir" || return 1
    
    # 确保环境变量传递给子进程 - CI模式下使用CI Mock配置
    if [ "$CI_MODE" = "true" ]; then
        export CI="true"
        export NODE_ENV="test"
        export VITE_CI="true"
        
        # CI模式下记录日志并确保环境变量传递
        echo "=== 启动时环境变量 ===" >> "$log_file" 2>&1
        env | grep -E "^(VITE_|NODE_|CI)" >> "$log_file" 2>&1
        echo "=== 开始启动服务（CI Mock模式）===" >> "$log_file" 2>&1
        print_info "使用环境变量: CI=true NODE_ENV=test VITE_CI=true"
        env CI="true" NODE_ENV="test" VITE_CI="true" npm run dev >> "$log_file" 2>&1 &
    else
        # 本地模式使用local配置（如果存在）
        export NODE_ENV="development"
        env NODE_ENV="development" npm run dev > /dev/null 2>&1 &
    fi
    local server_pid=$!
    cd - > /dev/null || true
    
    if [ -z "$server_pid" ]; then
        print_error "无法获取进程PID"
        return 1
    fi
    
    print_info "服务器进程PID: $server_pid"
    
    # 等待一下让进程启动
    sleep 2
    
    # 检查进程是否还在运行
    if kill -0 "$server_pid" 2>/dev/null; then
        print_info "✓ 服务器进程正在运行"
    else
        print_error "✗ 服务器进程已停止"
        if [ "$CI_MODE" = "true" ] && [ -f "$log_file" ]; then
            print_error "服务器启动日志:"
            cat "$log_file" | tail -20
        fi
        return 1
    fi
    
    # 将进程添加到服务器列表
    SERVERS_PID+=("$server_pid")
    
    # 给服务器一些时间启动
    print_info "等待服务器初始化..."
    sleep 8  # 增加等待时间以适应CI环境
    
    # 检查进程是否还在运行
    if ! kill -0 "$server_pid" 2>/dev/null; then
        print_error "$name 进程意外退出"
        if [ "$CI_MODE" = "true" ] && [ -f "$log_file" ]; then
            print_error "查看错误日志:"
            echo "=== Server Log Start ==="
            tail -30 "$log_file" || echo "无法读取日志文件"
            echo "=== Server Log End ==="
        fi
        return 1
    fi
    
    # 等待服务就绪
    if ! wait_for_service "$name" "$port" 90; then  # 增加超时时间
        print_error "$name 服务器启动失败 - 端口超时"
        if ! kill -0 "$server_pid" 2>/dev/null; then
            print_error "进程已退出"
        else
            print_warning "进程仍在运行，但端口未响应"
        fi
        
        if [ "$CI_MODE" = "true" ] && [ -f "$log_file" ]; then
            print_error "查看服务器日志:"
            echo "=== Server Log Start ==="
            tail -50 "$log_file" || echo "无法读取日志文件"
            echo "=== Server Log End ==="
        fi
        return 1
    fi
    
    print_success "$name 服务器启动成功"
    return 0
}

# 验证服务器是否正常运行
verify_servers_running() {
    print_info "验证服务器运行状态..."
    
    # 检查管理的进程状态
    print_info "检查管理的服务器进程状态..."
    local active_pids=0
    for pid in "${SERVERS_PID[@]}"; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            print_info "✅ 进程 $pid 仍在运行"
            ((active_pids++)) || true
        else
            print_warning "⚠️ 进程 $pid 已停止或不存在"
        fi
    done
    print_info "活跃进程数量: $active_pids/${#SERVERS_PID[@]}"
    
    # 检查端口状态
    print_info "检查端口状态..."
    
    # 检查Image-Tool (端口3300)
    print_info "检查Image-Tool服务..."
    if test_image_tool_ready; then
        print_success "✅ Image-Tool HTTP服务响应正常"
        # 额外检查端口状态用于调试
        if check_port 3300; then
            print_success "✅ Image-Tool端口 (3300) 也正常占用"
        else
            print_warning "⚠️ Image-Tool HTTP服务正常，但端口检测异常（可能是检测方法差异）"
        fi
    else
        print_error "❌ Image-Tool HTTP服务未响应"
        print_info "检查端口3300状态..."
        if check_port 3300; then
            print_warning "⚠️ 端口3300被占用但HTTP服务未响应"
            print_info "尝试获取端口3300的详细信息..."
            lsof -i :3300 2>/dev/null || print_info "无法获取端口详细信息"
        else
            print_info "端口3300完全未被占用"
        fi
        return 1
    fi
    
    # 检查PC-Tool (端口3200)
    print_info "检查PC-Tool服务..."
    if test_pc_tool_ready; then
        print_success "✅ PC-Tool HTTP服务响应正常"
        # 额外检查端口状态用于调试
        if check_port 3200; then
            print_success "✅ PC-Tool端口 (3200) 也正常占用"
        else
            print_warning "⚠️ PC-Tool HTTP服务正常，但端口检测异常（可能是检测方法差异）"
        fi
    else
        print_error "❌ PC-Tool HTTP服务未响应"
        print_info "检查端口3200状态..."
        if check_port 3200; then
            print_warning "⚠️ 端口3200被占用但HTTP服务未响应"
            print_info "尝试获取端口3200的详细信息..."
            lsof -i :3200 2>/dev/null || print_info "无法获取端口详细信息"
        else
            print_info "端口3200完全未被占用"
        fi
        return 1
    fi
    
    return 0
}

# 启动开发服务器
start_dev_servers() {
    local enable_mock=${1:-true}
    
    print_info "启动开发服务器..."
    register_cleanup
    
    # 清理端口上的残留进程
    print_info "清理端口上的残留进程..."
    clear_port 3300  # Image-Tool端口
    clear_port 3200  # PC-Tool端口
    
    # 设置环境变量
    set_environment "$enable_mock"
    
    # 获取绝对路径
    local current_dir=$(pwd)
    echo "PWD=$(pwd)"
    local image_tool_path="$current_dir/../frontend/image-tool"
    local pc_tool_path="$current_dir/../frontend/pc-tool"
    
    print_info "检查前端项目目录..."
    print_info "Image-Tool路径: $image_tool_path"
    print_info "PC-Tool路径: $pc_tool_path"
    
    # 检查目录是否存在
    if [ ! -d "$image_tool_path" ]; then
        print_error "Image-Tool目录不存在: $image_tool_path"
        exit 1
    fi
    if [ ! -d "$pc_tool_path" ]; then
        print_error "PC-Tool目录不存在: $pc_tool_path"
        exit 1
    fi
    
    print_success "前端项目目录检查通过"
    
    # 启动Image-Tool服务器
    print_info "检查Image-Tool端口状态..."
    if ! check_port 3300; then
        print_info "端口3300可用，启动Image-Tool服务器..."
        local image_tool_attempts=1
        local max_attempts=2
        
        if [ "$CI_MODE" = "true" ]; then
            max_attempts=3  # CI环境中允许更多重试
        fi
        
        while [ $image_tool_attempts -le $max_attempts ]; do
            print_info "Image-Tool启动尝试 $image_tool_attempts/$max_attempts"
            if start_single_server "Image-Tool" 3300 "$image_tool_path"; then
                break
            else
                if [ $image_tool_attempts -lt $max_attempts ]; then
                    print_warning "Image-Tool启动失败，准备重试..."
                    # 清理可能的残留进程
                    clear_port 3300
                    sleep 5
                    ((image_tool_attempts++)) || true
                else
                    print_error "Image-Tool服务器启动失败，已达到最大重试次数"
                    stop_all_servers
                    exit 1
                fi
            fi
        done
    else
        print_warning "端口3300已被占用，假设Image-Tool已在运行"
    fi
    
    # 启动PC-Tool服务器
    print_info "检查PC-Tool端口状态..."
    if ! check_port 3200; then
        print_info "端口3200可用，启动PC-Tool服务器..."
        local pc_tool_attempts=1
        local max_attempts=2
        
        if [ "$CI_MODE" = "true" ]; then
            max_attempts=3  # CI环境中允许更多重试
        fi
        
        while [ $pc_tool_attempts -le $max_attempts ]; do
            print_info "PC-Tool启动尝试 $pc_tool_attempts/$max_attempts"
            if start_single_server "PC-Tool" 3200 "$pc_tool_path"; then
                break
            else
                if [ $pc_tool_attempts -lt $max_attempts ]; then
                    print_warning "PC-Tool启动失败，准备重试..."
                    # 清理可能的残留进程
                    clear_port 3200
                    sleep 5
                    ((pc_tool_attempts++)) || true
                else
                    print_error "PC-Tool服务器启动失败，已达到最大重试次数"
                    stop_all_servers
                    exit 1
                fi
            fi
        done
    else
        print_warning "端口3200已被占用，假设PC-Tool已在运行"
    fi
    
    print_success "开发服务器启动完成"
    print_info "Image-Tool: http://localhost:3300"
    print_info "PC-Tool: http://localhost:3200"
    
    # 验证服务器运行状态
    if ! verify_servers_running; then
        print_error "服务器验证失败，请检查启动日志"
        
        # CI模式下显示服务器启动日志以便调试
        if [ "$CI_MODE" = "true" ]; then
            print_info "=== Image-Tool服务器日志 ==="
            if [ -f "/tmp/image-tool-server.log" ]; then
                cat "/tmp/image-tool-server.log"
            else
                print_warning "Image-Tool日志文件不存在"
            fi
            
            print_info "=== PC-Tool服务器日志 ==="
            if [ -f "/tmp/pc-tool-server.log" ]; then
                cat "/tmp/pc-tool-server.log"
            else
                print_warning "PC-Tool日志文件不存在"
            fi
        fi
        
        stop_all_servers
        exit 1
    fi
    
    print_success "所有服务器验证通过，可以开始测试"
    
    # CI模式下显示服务器启动日志的关键部分以确认Mock配置
    if [ "$CI_MODE" = "true" ]; then
        print_info "=== 检查CI Mock配置加载状态 ==="
        if [ -f "/tmp/image-tool-server.log" ]; then
            print_info "Image-Tool Vite配置日志："
            grep -E "(Loading.*CI.*mock|Vite Config Debug|CI config)" "/tmp/image-tool-server.log" || print_warning "未找到CI Mock加载信息"
        fi
        
        if [ -f "/tmp/pc-tool-server.log" ]; then
            print_info "PC-Tool Vite配置日志："
            grep -E "(Loading.*CI.*mock|Vite Config Debug|CI config)" "/tmp/pc-tool-server.log" || print_warning "未找到CI Mock加载信息"
        fi
        print_info "=== Mock配置检查完成 ==="
    fi
}

# 停止所有服务器
stop_all_servers() {
    print_info "停止所有开发服务器..."
    
    for pid in "${SERVERS_PID[@]}"; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            print_info "停止服务器进程: PID=$pid"
            kill -TERM "$pid" 2>/dev/null || true
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                kill -KILL "$pid" 2>/dev/null || true
            fi
        fi
    done
    
    # 清理残留的端口进程
    print_info "清理残留的端口进程..."
    clear_port 3300
    clear_port 3200
    
    SERVERS_PID=()
    print_success "服务器停止完成"
}

# 运行测试
run_tests() {
    local test_type=$1
    print_info "开始运行测试: $test_type"
    
    # 添加环境诊断信息
    if [ "$CI_MODE" = "true" ]; then
        print_info "=== CI环境诊断信息 ==="
        print_info "当前工作目录: $(pwd)"
        print_info "Node.js版本: $(node --version 2>/dev/null || echo '未安装')"
        print_info "npm版本: $(npm --version 2>/dev/null || echo '未安装')"
        print_info "Playwright版本: $(npx playwright --version 2>/dev/null || echo '未安装')"
        print_info "环境变量检查:"
        env | grep -E "^(CI|NODE_|VITE_|PLAYWRIGHT_)" || print_warning "未找到相关环境变量"
        print_info "=== 诊断信息结束 ==="
    fi
    
    local test_exit_code=0
    case "$test_type" in
        "all")
            print_info "运行所有测试..."
            npm run test:e2e
            test_exit_code=$?
            ;;
        "rect")
            print_info "运行2D矩形标注测试 (核心功能)..."
            npx playwright test tests/e2e/image-tool/rect-annotation.spec.ts --project=image-tool
            test_exit_code=$?
            ;;
        "core")
            print_info "运行核心功能测试 (矩形、折线、多边形)..."
            
            # 在CI模式下添加额外的检查
            if [ "$CI_MODE" = "true" ]; then
                print_info "=== 核心测试前置检查 ==="
                print_info "检查测试文件是否存在..."
                test_files=(
                    "tests/e2e/image-tool/rect-annotation.spec.ts"
                    "tests/e2e/image-tool/polyline-annotation.spec.ts"
                    "tests/e2e/image-tool/polygon-annotation.spec.ts"
                )
                for file in "${test_files[@]}"; do
                    if [ -f "$file" ]; then
                        print_info "✓ $file 存在"
                    else
                        print_error "✗ $file 不存在"
                    fi
                done
                
                print_info "检查Playwright配置..."
                if npx playwright config list >/dev/null 2>&1; then
                    print_info "✓ Playwright配置有效"
                else
                    print_error "✗ Playwright配置无效"
                fi
                
                print_info "检查image-tool项目配置..."
                if npx playwright test --list --project=image-tool >/dev/null 2>&1; then
                    test_count=$(npx playwright test --list --project=image-tool 2>/dev/null | wc -l)
                    print_info "✓ image-tool项目配置正确，发现 $test_count 个测试"
                else
                    print_error "✗ image-tool项目配置有问题"
                fi
                print_info "=== 前置检查完成 ==="
            fi
            
            print_info "执行核心测试命令..."
            npx playwright test tests/e2e/image-tool/rect-annotation.spec.ts tests/e2e/image-tool/polyline-annotation.spec.ts tests/e2e/image-tool/polygon-annotation.spec.ts --project=image-tool
            test_exit_code=$?
            ;;
        "iss")
            print_info "运行ISS工具测试 (语义分割)..."
            npx playwright test tests/e2e/image-tool/iss-tool-advanced.spec.ts --project=image-tool
            test_exit_code=$?
            ;;
        "iss-extended")
            print_info "运行ISS工具扩展测试 (包含基础和高级功能)..."
            npx playwright test tests/e2e/image-tool/iss-annotation.spec.ts tests/e2e/image-tool/iss-tool-advanced.spec.ts --project=image-tool
            test_exit_code=$?
            ;;
        "image-tool")
            print_info "运行Image-Tool测试..."
            npm run test:image-tool
            test_exit_code=$?
            ;;
        "pc-tool")
            print_info "运行PC-Tool测试..."
            npm run test:pc-tool
            test_exit_code=$?
            ;;
        "performance")
            print_info "运行性能测试..."
            npm run test:performance
            test_exit_code=$?
            ;;
        "visual")
            print_info "运行视觉回归测试..."
            npm run test:visual
            test_exit_code=$?
            ;;
        "debug")
            print_info "调试模式运行2D矩形标注测试..."
            npx playwright test tests/e2e/image-tool/rect-annotation.spec.ts --project=image-tool --debug
            test_exit_code=$?
            ;;
        "ui")
            print_info "交互式UI模式运行测试..."
            npm run test:e2e:ui
            test_exit_code=$?
            ;;
        *)
            print_error "未知的测试类型: $test_type"
            show_help
            exit 1
            ;;
    esac
    
    # 检查测试结果并设置适当的退出码
    if [ $test_exit_code -eq 0 ]; then
        print_success "测试执行完成: $test_type - 所有测试通过"
    else
        print_warning "测试执行完成: $test_type - 有测试失败 (退出码: $test_exit_code)"
        # 在CI模式下，测试失败应该导致脚本失败
        if [ "$CI_MODE" = "true" ]; then
            print_error "CI模式下检测到测试失败，脚本将以非零退出码结束"
            exit $test_exit_code
        fi
    fi
}

# CI模式完整测试流程
run_ci_tests() {
    print_info "开始CI模式完整测试流程..."
    
    # 1. 环境检查
    check_environment
    
    # 2. 启动服务器（使用Mock模式确保测试稳定性）
    start_dev_servers true
    
    # 3. 运行所有测试
    run_tests "all"
    
    # 4. 生成测试报告
    print_info "生成测试报告..."
    npm run report
    
    print_success "CI测试流程完成"
    
    # 5. 清理资源
    stop_all_servers
}

# 生成测试报告
generate_report() {
    print_info "生成测试报告..."
    npm run report
    if [ "$CI_MODE" != "true" ]; then
        print_success "测试报告已生成，浏览器将自动打开"
    else
        print_success "测试报告已生成"
    fi
}

# 清理测试结果
clean_results() {
    print_info "清理测试结果..."
    rm -rf test-results playwright-report html-report
    print_success "测试结果已清理"
}

# 主程序
main() {
    local command=${1:-help}
    
    # 显示CI模式状态
    if [ "$CI_MODE" = "true" ]; then
        print_info "🤖 CI模式已启用"
        print_info "环境变量CI: ${CI:-未设置}"
        print_info "命令行参数: $*"
    else
        print_info "💻 本地模式"
    fi
    
    case "$command" in
        "setup")
            check_environment
            install_dependencies
            ;;
        "all")
            check_environment
            if [ "$CI_MODE" = "true" ]; then
                print_info "🎯 CI模式：完整测试流程"
                run_ci_tests
            else
                print_info "💻 本地模式：检查服务器状态..."
                # 检查服务器是否已经运行
                if check_port 3300 && check_port 3200; then
                    print_info "检测到服务器已在运行，直接执行测试"
                    run_tests "all"
                else
                    print_info "服务器未运行，自动启动服务器并运行测试"
                    start_dev_servers true
                    run_tests "all"
                    print_info "测试完成，保持服务器运行以便后续测试"
                    print_info "如需停止服务器，请运行: ./run-tests.sh clean-ports"
                fi
            fi
            ;;
        "rect")
            check_environment
            if [ "$CI_MODE" = "true" ]; then
                print_info "🎯 CI模式：启动服务器 -> 运行矩形测试 -> 清理"
                print_info "步骤1: 启动开发服务器..."
                start_dev_servers true
                print_info "步骤2: 运行矩形测试..."
                run_tests "rect"
                        print_info "步骤3: 清理服务器..."
        # 在清理前显示重要的服务器日志信息
        if [ "$CI_MODE" = "true" ]; then
            print_info "=== 测试完成后的诊断信息 ==="
            if [ -f "/tmp/image-tool-server.log" ]; then
                print_info "Image-Tool启动日志摘要（最后50行）："
                tail -50 "/tmp/image-tool-server.log" | head -20
            fi
            
            if [ -f "/tmp/pc-tool-server.log" ]; then
                print_info "PC-Tool启动日志摘要（最后50行）："
                tail -50 "/tmp/pc-tool-server.log" | head -20  
            fi
            print_info "=== 诊断信息结束 ==="
        fi
        
        stop_all_servers
        print_success "CI模式矩形测试完成"
            else
                print_info "💻 本地模式：检查服务器状态..."
                # 检查服务器是否已经运行
                if check_port 3300 && check_port 3200; then
                    print_info "检测到服务器已在运行，直接执行测试"
                    run_tests "rect"
                else
                    print_info "服务器未运行，自动启动服务器并运行测试"
                    start_dev_servers true
                    run_tests "rect"
                    print_info "测试完成，保持服务器运行以便后续测试"
                    print_info "如需停止服务器，请运行: ./run-tests.sh clean-ports"
                fi
            fi
            ;;
        "core")
            check_environment
            if [ "$CI_MODE" = "true" ]; then
                print_info "🎯 CI模式：启动服务器 -> 运行核心功能测试 -> 清理"
                print_info "步骤1: 启动开发服务器..."
                start_dev_servers true
                print_info "步骤2: 运行核心功能测试（矩形、折线、多边形）..."
                run_tests "core"
                print_info "步骤3: 清理服务器..."
                # 在清理前显示重要的服务器日志信息
                if [ "$CI_MODE" = "true" ]; then
                    print_info "=== 测试完成后的诊断信息 ==="
                    if [ -f "/tmp/image-tool-server.log" ]; then
                        print_info "Image-Tool启动日志摘要（最后50行）："
                        tail -50 "/tmp/image-tool-server.log" | head -20
                    fi
                    
                    if [ -f "/tmp/pc-tool-server.log" ]; then
                        print_info "PC-Tool启动日志摘要（最后50行）："
                        tail -50 "/tmp/pc-tool-server.log" | head -20  
                    fi
                    print_info "=== 诊断信息结束 ==="
                fi
                
                stop_all_servers
                print_success "CI模式核心功能测试完成"
            else
                print_info "💻 本地模式：检查服务器状态..."
                # 检查服务器是否已经运行
                if check_port 3300 && check_port 3200; then
                    print_info "检测到服务器已在运行，直接执行测试"
                    run_tests "core"
                else
                    print_info "服务器未运行，自动启动服务器并运行测试"
                    start_dev_servers true
                    run_tests "core"
                    print_info "测试完成，保持服务器运行以便后续测试"
                    print_info "如需停止服务器，请运行: ./run-tests.sh clean-ports"
                fi
            fi
            ;;
        "image-tool")
            check_environment
            if [ "$CI_MODE" = "true" ]; then
                print_info "🎯 CI模式：启动服务器 -> 运行Image-Tool测试 -> 清理"
                start_dev_servers true
                run_tests "image-tool"
                stop_all_servers
            else
                print_info "💻 本地模式：检查服务器状态..."
                # 检查服务器是否已经运行
                if check_port 3300 && check_port 3200; then
                    print_info "检测到服务器已在运行，直接执行测试"
                    run_tests "image-tool"
                else
                    print_info "服务器未运行，自动启动服务器并运行测试"
                    start_dev_servers true
                    run_tests "image-tool"
                    print_info "测试完成，保持服务器运行以便后续测试"
                    print_info "如需停止服务器，请运行: ./run-tests.sh clean-ports"
                fi
            fi
            ;;
        "iss")
            check_environment
            if [ "$CI_MODE" = "true" ]; then
                print_info "🎯 CI模式：启动服务器 -> 运行ISS工具测试 -> 清理"
                start_dev_servers true
                run_tests "iss"
                stop_all_servers
            else
                print_info "💻 本地模式：检查服务器状态..."
                if check_port 3300 && check_port 3200; then
                    print_info "检测到服务器已在运行，直接执行ISS测试"
                    run_tests "iss"
                else
                    print_info "服务器未运行，自动启动服务器并运行ISS测试"
                    start_dev_servers true
                    run_tests "iss"
                    print_info "测试完成，保持服务器运行以便后续测试"
                fi
            fi
            ;;
        "iss-extended")
            check_environment
            if [ "$CI_MODE" = "true" ]; then
                print_info "🎯 CI模式：启动服务器 -> 运行ISS扩展测试 -> 清理"
                start_dev_servers true
                run_tests "iss-extended"
                stop_all_servers
            else
                print_info "💻 本地模式：检查服务器状态..."
                if check_port 3300 && check_port 3200; then
                    print_info "检测到服务器已在运行，直接执行ISS扩展测试"
                    run_tests "iss-extended"
                else
                    print_info "服务器未运行，自动启动服务器并运行ISS扩展测试"
                    start_dev_servers true
                    run_tests "iss-extended"
                    print_info "测试完成，保持服务器运行以便后续测试"
                fi
            fi
            ;;
        "pc-tool")
            check_environment
            if [ "$CI_MODE" = "true" ]; then
                start_dev_servers true
                run_tests "pc-tool"
                stop_all_servers
            else
                run_tests "pc-tool"
            fi
            ;;
        "performance")
            check_environment
            run_tests "performance"
            ;;
        "visual")
            check_environment
            run_tests "visual"
            ;;
        "debug")
            check_environment
            start_dev_servers true
            run_tests "debug"
            ;;
        "ui")
            check_environment
            start_dev_servers true
            run_tests "ui"
            ;;
        "report")
            generate_report
            ;;
        "clean")
            clean_results
            ;;
        "clean-ports")
            print_info "清理占用3200/3300端口的Node.js进程..."
            clear_port 3300
            clear_port 3200
            print_success "端口清理完成"
            ;;
        "dev")
            check_environment
            start_dev_servers true
            print_info "开发服务器正在运行..."
            print_info "PC-Tool: http://localhost:3200"
            print_info "Image-Tool: http://localhost:3300"
            print_info "按Ctrl+C停止脚本"
            
            # 保持脚本运行
            wait
            ;;
        "ci")
            run_ci_tests
            ;;
        "help"|"")
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 运行主程序
main "$@" 
