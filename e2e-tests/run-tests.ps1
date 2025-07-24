# Xtreme1 GUI自动化测试运行脚本 (PowerShell版本)
# 使用方法: .\run-tests.ps1 [选项] [-CI]

param(
    [Parameter(Mandatory=$false)]
    [string]$Command = "help",
    [Parameter(Mandatory=$false)]
    [switch]$CI = $false
)

# 设置控制台编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 颜色定义
$ErrorActionPreference = "Stop"

# 全局变量
$SERVERS = @()
$CLEANUP_REGISTERED = $false

function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "[SUCCESS] $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "[WARNING] $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

# 显示使用帮助
function Show-Help {
    Write-Host "Xtreme1 GUI自动化测试运行脚本 (PowerShell版本)" -ForegroundColor White
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  .\run-tests.ps1 [选项] [-CI]"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  setup           - 安装依赖和浏览器"
    Write-Host "  all             - 运行所有测试"
    Write-Host "  rect            - 运行2D矩形标注测试 (核心功能)"
    Write-Host "  core            - 运行核心功能测试 (矩形、折线、多边形)"
    Write-Host "  image-tool      - 运行Image-Tool所有测试"
    Write-Host "  pc-tool         - 运行PC-Tool所有测试"
    Write-Host "  performance     - 运行性能测试"
    Write-Host "  visual          - 运行视觉回归测试"
    Write-Host "  debug           - 调试模式运行矩形测试"
    Write-Host "  ui              - 交互式UI模式运行测试"
    Write-Host "  report          - 生成并打开测试报告"
    Write-Host "  clean           - 清理测试结果"
    Write-Host "  clean-ports     - 清理占用3200/3300端口的进程"
    Write-Host "  dev             - 启动开发服务器"
    Write-Host "  ci              - CI模式：启动服务器->运行所有测试->清理"
    Write-Host "  help            - 显示此帮助信息"
    Write-Host ""
    Write-Host "参数:"
    Write-Host "  -CI             - CI模式标志，适用于持续集成环境"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\run-tests.ps1 setup       # 首次运行前的环境setup"
    Write-Host "  .\run-tests.ps1 rect        # 运行2D矩形标注测试"
    Write-Host "  .\run-tests.ps1 core        # 运行核心功能测试（矩形、折线、多边形）"
    Write-Host "  .\run-tests.ps1 ci          # CI模式完整测试"
    Write-Host "  .\run-tests.ps1 all -CI     # CI模式运行所有测试"
}

# 注册清理函数
function Register-Cleanup {
    if (-not $global:CLEANUP_REGISTERED) {
        Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
            Stop-AllServers
        }
        $global:CLEANUP_REGISTERED = $true
    }
}

# 设置环境变量
function Set-Environment {
    param([bool]$EnableMock = $true)
    
    Write-Info "设置环境变量..."
    
    # 禁用浏览器自动打开（静默启动）
    Write-Info "设置静默启动模式（禁用浏览器自动打开）"
    $env:BROWSER = "none"
    $env:VITE_SERVER_OPEN = "false"
    
    if ($EnableMock) {
        Write-Info "启用Mock API模式（适用于开发和调试）"
        $env:NODE_ENV = "development"
    } else {
        Write-Info "禁用Mock API模式（适用于集成测试）"
        $env:NODE_ENV = "test"
    }
    
    # CI特定环境变量
    if ($CI) {
        Write-Info "设置CI环境变量..."
        $env:CI = "true"
        $env:PLAYWRIGHT_BROWSERS_PATH = "0"  # 使用系统浏览器
        $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
        
        # CI环境使用专用的Mock配置文件
        Write-Info "CI环境：启用CI Mock配置..."
        $env:NODE_ENV = "test"  # 触发CI Mock配置加载
        
        # CI环境中的Vite特定配置
        Write-Info "CI环境：设置Vite特定配置..."
        $env:VITE_CI = "true"
        $env:VITE_SKIP_GIT_CHECKS = "true"
        $env:VITE_FORCE_COLOR = "0"  # 禁用颜色输出
        $env:TERM = "dumb"  # 设置终端类型
        
        # 确保服务器不自动打开浏览器
        $env:VITE_OPEN = "false"
        $env:VITE_HOST = "0.0.0.0"  # 在CI环境中绑定所有接口
        
        # 增加内存限制以防止OOM
        $env:NODE_OPTIONS = "--max-old-space-size=4096"
    }
    
    Write-Success "环境变量设置完成"
    
    # 在CI模式下显示所有相关环境变量
    if ($CI) {
        Write-Info "当前环境变量："
        Write-Host "  CI: $($env:CI)"
        Write-Host "  NODE_ENV: $($env:NODE_ENV) (触发CI Mock配置)"
        Write-Host "  BROWSER: $($env:BROWSER)"
        Write-Host "  VITE_SERVER_OPEN: $($env:VITE_SERVER_OPEN)"
        Write-Host "  VITE_CI: $($env:VITE_CI)"
        Write-Host "  VITE_HOST: $($env:VITE_HOST)"
        Write-Host "  NODE_OPTIONS: $($env:NODE_OPTIONS)"
    }
}

# 检查环境
function Test-Environment {
    Write-Info "检查环境依赖..."
    
    # 检查Node.js
    try {
        $nodeVersion = node --version
        $versionNumber = [int]($nodeVersion.Substring(1).Split('.')[0])
        if ($versionNumber -lt 18) {
            throw "Node.js版本过低，需要18+，当前版本: $nodeVersion"
        }
        Write-Info "Node.js版本检查通过: $nodeVersion"
    }
    catch {
        Write-Error "Node.js未安装或版本过低，请先安装Node.js 18+"
        exit 1
    }
    
    # 检查npm
    try {
        $npmVersion = npm --version
        Write-Info "npm版本: $npmVersion"
    }
    catch {
        Write-Error "npm未安装"
        exit 1
    }
    
    Write-Success "环境检查通过"
}

# 安装依赖
function Install-Dependencies {
    Write-Info "安装测试依赖..."
    
    # 安装根目录依赖
    Write-Info "安装根目录依赖..."
    npm install
    
    # 安装前端项目依赖
    Write-Info "安装PC-Tool依赖..."
    Push-Location "..\frontend\pc-tool"
    npm install
    Pop-Location
    
    Write-Info "安装Image-Tool依赖..."
    Push-Location "..\frontend\image-tool"
    npm install
    Pop-Location
    
    # 安装Playwright浏览器
    Write-Info "安装Playwright浏览器..."
    if ($CI) {
        # CI环境中不安装浏览器依赖，假设已预装
        npx playwright install --with-deps chromium
    } else {
        npx playwright install --with-deps
    }
    
    Write-Success "依赖安装完成"
}

# 检查端口占用
function Test-Port($port) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet
        return $connection.TcpTestSucceeded
    }
    catch {
        return $false
    }
}

# 检查HTTP服务是否可用
function Test-HttpService($port, $path = "/") {
    try {
        $url = "http://localhost:$port$path"
        # 使用try-catch来捕获HTTP错误状态码
        try {
            $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 5
            return $true
        }
        catch [System.Net.WebException] {
            # 检查是否是HTTP错误（如404），这也表明服务器正在运行
            if ($_.Exception.Response) {
                $statusCode = $_.Exception.Response.StatusCode.value__
                # 404、403等状态码表明服务器正在运行
                return ($statusCode -eq 404) -or ($statusCode -eq 403) -or ($statusCode -eq 200)
            }
            return $false
        }
    }
    catch {
        return $false
    }
}

# 检查Image-Tool服务是否就绪
function Test-ImageToolReady {
    try {
        $url = "http://localhost:3300/"
        # 使用try-catch来捕获HTTP错误状态码
        try {
            $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 5
            # 200状态码表示成功
            return $true
        }
        catch [System.Net.WebException] {
            # 检查是否是HTTP错误（如404），这也表明服务器正在运行
            if ($_.Exception.Response) {
                $statusCode = $_.Exception.Response.StatusCode.value__
                # 404、403等状态码表明服务器正在运行，只是路径不存在
                return ($statusCode -eq 404) -or ($statusCode -eq 403) -or ($statusCode -eq 200)
            }
            return $false
        }
    }
    catch {
        return $false
    }
}

# 检查PC-Tool服务是否就绪
function Test-PcToolReady {
    try {
        $url = "http://localhost:3200/"
        # 使用try-catch来捕获HTTP错误状态码
        try {
            $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 5
            # 200状态码表示成功
            return $true
        }
        catch [System.Net.WebException] {
            # 检查是否是HTTP错误（如404），这也表明服务器正在运行
            if ($_.Exception.Response) {
                $statusCode = $_.Exception.Response.StatusCode.value__
                # 404、403等状态码表明服务器正在运行，只是路径不存在
                return ($statusCode -eq 404) -or ($statusCode -eq 403) -or ($statusCode -eq 200)
            }
            return $false
        }
    }
    catch {
        return $false
    }
}

# 清理占用端口的进程
function Clear-Port($port) {
    Write-Info "清理端口 $port 上的进程..."
    
    $processesKilled = 0
    $foundProcesses = @()
    
    # 方法1: 使用Get-NetTCPConnection (Windows 8+, 更准确)
    Write-Info "使用Get-NetTCPConnection检查端口 $port..."
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        
        if ($connections) {
            Write-Info "发现 $($connections.Count) 个连接占用端口 $port"
            foreach ($conn in $connections) {
                $processId = $conn.OwningProcess
                Write-Info "连接状态: $($conn.State), 拥有进程: $processId"
                
                try {
                    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    if ($process) {
                        $foundProcesses += @{
                            PID = $processId
                            Name = $process.ProcessName
                            Path = $process.Path
                            Method = "Get-NetTCPConnection"
                        }
                        Write-Info "发现进程: PID=$processId, Name=$($process.ProcessName), Path=$($process.Path)"
                    }
                } catch {
                    Write-Warning "无法获取PID $processId 的进程信息: $($_.Exception.Message)"
                }
            }
        }
    } catch {
        Write-Warning "Get-NetTCPConnection失败: $($_.Exception.Message)"
    }
    
    # 方法2: 使用netstat作为备用方法
    if ($foundProcesses.Count -eq 0) {
        Write-Info "使用netstat作为备用方法检查端口 $port..."
        try {
            $netstatOutput = netstat -ano | findstr ":$port "
            
            if ($netstatOutput) {
                Write-Info "netstat发现占用端口 $port 的连接"
                $netstatOutput | ForEach-Object {
                    Write-Info "netstat输出: $_"
                    
                    # 更严格的PID提取
                    if ($_ -match '\s+(\d+)$') {
                        $processId = $matches[1]
                        Write-Info "从netstat提取PID: $processId"
                        
                        try {
                            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                            if ($process) {
                                $foundProcesses += @{
                                    PID = $processId
                                    Name = $process.ProcessName
                                    Path = $process.Path
                                    Method = "netstat"
                                }
                                Write-Info "发现进程: PID=$processId, Name=$($process.ProcessName)"
                            }
                        } catch {
                            Write-Warning "无法获取PID $processId 的进程信息"
                        }
                    }
                }
            }
        } catch {
            Write-Warning "netstat检查失败: $($_.Exception.Message)"
        }
    }
    
    # 终止找到的进程
    if ($foundProcesses.Count -gt 0) {
        Write-Info "找到 $($foundProcesses.Count) 个占用端口 $port 的进程"
        
        foreach ($proc in $foundProcesses) {
            $shouldKill = $false
            $reason = ""
            
            # 检查是否应该终止此进程
            if ($proc.Name -eq "node") {
                $shouldKill = $true
                $reason = "Node.js进程"
            } elseif ($proc.Name -eq "npm") {
                $shouldKill = $true
                $reason = "npm进程"
            } elseif ($proc.Name -eq "cmd") {
                $shouldKill = $true
                $reason = "可能是npm启动的cmd进程"
            } elseif ($proc.Path -and $proc.Path.Contains("node")) {
                $shouldKill = $true
                $reason = "Node.js相关进程"
            } elseif ($proc.Path -and $proc.Path.Contains("npm")) {
                $shouldKill = $true
                $reason = "npm相关进程"
            }
            
            if ($shouldKill) {
                try {
                    Write-Info "终止进程: PID=$($proc.PID), Name=$($proc.Name) ($reason)"
                    Stop-Process -Id $proc.PID -Force -ErrorAction Stop
                    $processesKilled++
                    Write-Success "已终止PID $($proc.PID)"
                } catch {
                    Write-Warning "终止PID $($proc.PID) 失败: $($_.Exception.Message)"
                    
                    # 尝试更强制的方法
                    try {
                        Write-Info "尝试使用taskkill强制终止PID $($proc.PID)..."
                        $result = taskkill /F /PID $proc.PID 2>&1
                        if ($LASTEXITCODE -eq 0) {
                            Write-Success "taskkill成功终止PID $($proc.PID)"
                            $processesKilled++
                        } else {
                            Write-Warning "taskkill也失败了: $result"
                        }
                    } catch {
                        Write-Warning "taskkill失败: $($_.Exception.Message)"
                    }
                }
            } else {
                Write-Warning "跳过非Node.js相关进程: PID=$($proc.PID), Name=$($proc.Name), Path=$($proc.Path)"
            }
        }
    }
    
    if ($processesKilled -gt 0) {
        Write-Success "已终止 $processesKilled 个占用端口 $port 的进程"
        # 等待进程完全终止
        Write-Info "等待进程完全清理..."
        Start-Sleep -Seconds 3
        
        # 验证端口是否已释放
        $stillOccupied = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet
        if ($stillOccupied) {
            Write-Warning "端口 $port 仍被占用，可能需要手动检查"
        } else {
            Write-Success "端口 $port 已成功释放"
        }
    } else {
        Write-Info "端口 $port 未被占用或未发现需要清理的进程"
    }
}

# 等待服务就绪
function Wait-ForService($serviceName, $port, $timeout = 60) {
    Write-Info "等待 $serviceName 服务就绪... (端口: $port, 超时: ${timeout}秒)"
    $elapsed = 0
    $checkInterval = 3  # CI环境中增加检查间隔
    
    # CI环境中增加初始等待时间
    if ($CI) {
        Write-Info "CI环境：增加初始等待时间..."
        Start-Sleep -Seconds 5
    }
    
    while ($elapsed -lt $timeout) {
        Write-Host "." -NoNewline  # 显示进度点
        
        # 根据服务类型选择检测方法
        $serviceReady = $false
        switch ($serviceName) {
            "Image-Tool" {
                $serviceReady = Test-ImageToolReady
            }
            "PC-Tool" {
                $serviceReady = Test-PcToolReady
            }
            default {
                # 默认使用简单的HTTP检测
                $serviceReady = Test-HttpService $port
            }
        }
        
        if ($serviceReady) {
            Write-Host ""  # 换行
            Write-Success "$serviceName 服务已就绪 (用时: ${elapsed}秒)"
            
            # CI环境中额外验证
            if ($CI) {
                Write-Info "CI环境：额外验证服务稳定性..."
                Start-Sleep -Seconds 2
                # 再次检查服务是否仍然可用
                $stillReady = $false
                switch ($serviceName) {
                    "Image-Tool" {
                        $stillReady = Test-ImageToolReady
                    }
                    "PC-Tool" {
                        $stillReady = Test-PcToolReady
                    }
                }
                
                if (-not $stillReady) {
                    Write-Warning "服务不稳定，继续等待..."
                    Start-Sleep -Seconds $checkInterval
                    $elapsed += $checkInterval
                    continue
                }
                Write-Success "服务稳定性验证通过"
            }
            return $true
        }
        
        Start-Sleep -Seconds $checkInterval
        $elapsed += $checkInterval
        
        # 每10秒显示一次进度
        if ($elapsed % 10 -eq 0) {
            Write-Host ""  # 换行
            Write-Info "仍在等待 $serviceName 服务就绪... (已等待: ${elapsed}/${timeout}秒)"
            if ($CI) {
                try {
                    $portOccupied = Test-Port $port
                    Write-Info "端口状态: $(if ($portOccupied) { '占用' } else { '未占用' })"
                } catch {
                    Write-Info "端口状态: 无法检测"
                }
            }
        }
    }
    
    Write-Host ""  # 换行
    Write-Error "等待 $serviceName 服务就绪超时 (${timeout}秒)"
    return $false
}

# 启动单个服务器
function Start-SingleServer($name, $port, $workingDir) {
    Write-Info "启动 $name 开发服务器 (端口$port)..."
    Write-Info "工作目录: $workingDir"
    
    # 检查package.json是否存在
    $packageJsonPath = Join-Path $workingDir "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        Write-Error "package.json不存在: $packageJsonPath"
        return $false
    }
    
    try {
        # 先检查npm run dev命令是否存在
        Write-Info "检查npm脚本..."
        $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
        if (-not $packageJson.scripts.dev) {
            Write-Error "package.json中没有dev脚本"
            return $false
        }
        
        Write-Info "启动进程: npm run dev"
        
        # 找到npm的完整路径
        $npmPath = where.exe npm 2>$null
        if (-not $npmPath) {
            # 尝试常见的npm路径
            $possiblePaths = @(
                "npm.cmd",
                "$env:ProgramFiles\nodejs\npm.cmd",
                "$env:APPDATA\npm\npm.cmd"
            )
            
            foreach ($path in $possiblePaths) {
                if (Get-Command $path -ErrorAction SilentlyContinue) {
                    $npmPath = $path
                    break
                }
            }
            
            if (-not $npmPath) {
                Write-Error "找不到npm命令"
                return $false
            }
        }
        
        Write-Info "使用npm路径: $npmPath"
        
        # 确保环境变量传递给子进程 - CI模式下使用CI Mock配置
        if ($CI) {
            # CI模式下明确设置环境变量并传递给子进程
            Write-Info "CI模式：设置环境变量用于启动..."
            $envVars = @{
                "CI" = "true"
                "NODE_ENV" = "test"
                "VITE_CI" = "true"
                "VITE_HOST" = "0.0.0.0"
                "VITE_OPEN" = "false"
                "NODE_OPTIONS" = "--max-old-space-size=4096"
            }
            
            Write-Info "CI环境变量："
            foreach ($key in $envVars.Keys) {
                Write-Host "  $key = $($envVars[$key])"
                [System.Environment]::SetEnvironmentVariable($key, $envVars[$key], "Process")
            }
        } else {
            # 本地模式使用development配置
            [System.Environment]::SetEnvironmentVariable("NODE_ENV", "development", "Process")
        }
        
        # 使用ProcessStartInfo来确保环境变量正确传递
        try {
            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = "cmd.exe"
            $psi.Arguments = "/c npm run dev"
            $psi.WorkingDirectory = $workingDir
            $psi.UseShellExecute = $false
            $psi.CreateNoWindow = $true
            $psi.RedirectStandardOutput = $false
            $psi.RedirectStandardError = $false
            
            # 复制当前进程的环境变量到新进程
            foreach ($envVar in [System.Environment]::GetEnvironmentVariables()) {
                $psi.EnvironmentVariables[$envVar.Key] = $envVar.Value
            }
            
            $process = [System.Diagnostics.Process]::Start($psi)
            
            if ($process -eq $null) {
                Write-Error "无法启动进程"
                return $false
            }
        }
        catch {
            Write-Error "启动进程失败: $($_.Exception.Message)"
            # 尝试备用方法
            Write-Info "尝试备用启动方法..."
            try {
                $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"npm run dev`"" -WorkingDirectory $workingDir -WindowStyle Hidden -PassThru
                
                if ($process -eq $null) {
                    Write-Error "备用方法也失败了"
                    return $false
                }
            }
            catch {
                Write-Error "备用方法也失败: $($_.Exception.Message)"
                return $false
            }
        }
        
        Write-Info "进程已启动，PID: $($process.Id)"
        
        # 将进程添加到服务器列表
        $global:SERVERS += @{
            Name = $name
            Port = $port
            Process = $process
        }
        
        # 给服务器一些时间启动
        Write-Info "等待服务器初始化..."
        Start-Sleep -Seconds 5
        
        # 检查进程是否还在运行
        if ($process.HasExited) {
            Write-Error "$name 进程意外退出，退出码: $($process.ExitCode)"
            return $false
        }
        
        # 等待服务就绪 (增加超时时间到90秒，CI环境首次启动可能需要更多时间)
        if (-not (Wait-ForService $name $port 90)) {
            Write-Error "$name 服务器启动失败 - 端口超时"
            # 输出一些调试信息
            Write-Info "检查进程状态..."
            if (-not $process.HasExited) {
                Write-Warning "进程仍在运行，但端口未响应"
            } else {
                Write-Error "进程已退出，退出码: $($process.ExitCode)"
            }
            return $false
        }
        
        Write-Success "$name 服务器启动成功"
        return $true
    }
    catch {
        Write-Error "启动 $name 服务器时出错: $($_.Exception.Message)"
        Write-Error "错误详情: $($_.Exception.StackTrace)"
        return $false
    }
}

# 启动开发服务器
function Start-DevServers {
    param([bool]$EnableMock = $true)
    
    Write-Info "启动开发服务器..."
    Register-Cleanup
    
    # 清理端口上的残留进程
    Write-Info "清理端口上的残留进程..."
    Clear-Port 3300  # Image-Tool端口
    Clear-Port 3200  # PC-Tool端口
    
    # 设置环境变量
    Set-Environment -EnableMock $EnableMock
    
    # 获取绝对路径
    $currentDir = Get-Location
    $imageToolPath = Join-Path $currentDir "..\frontend\image-tool"
    $pcToolPath = Join-Path $currentDir "..\frontend\pc-tool"
    
    # 检查目录是否存在
    if (-not (Test-Path $imageToolPath)) {
        Write-Error "Image-Tool目录不存在: $imageToolPath"
        exit 1
    }
    if (-not (Test-Path $pcToolPath)) {
        Write-Error "PC-Tool目录不存在: $pcToolPath"
        exit 1
    }
    
    # 启动Image-Tool服务器
    if (-not (Test-Port 3300)) {
        if (-not (Start-SingleServer "Image-Tool" 3300 $imageToolPath)) {
            Stop-AllServers
            exit 1
        }
    } else {
        Write-Warning "端口3300已被占用，假设Image-Tool已在运行"
    }
    
    # 启动PC-Tool服务器
    if (-not (Test-Port 3200)) {
        if (-not (Start-SingleServer "PC-Tool" 3200 $pcToolPath)) {
            Stop-AllServers
            exit 1
        }
    } else {
        Write-Warning "端口3200已被占用，假设PC-Tool已在运行"
    }
    
    Write-Success "开发服务器启动完成"
    Write-Info "Image-Tool: http://localhost:3300"
    Write-Info "PC-Tool: http://localhost:3200"
}

# 停止所有服务器
function Stop-AllServers {
    Write-Info "停止所有开发服务器..."
    
    foreach ($server in $global:SERVERS) {
        try {
            if ($server.Process -and -not $server.Process.HasExited) {
                Write-Info "停止 $($server.Name) 服务器..."
                $server.Process.Kill()
                $server.Process.WaitForExit(5000)
            }
        }
        catch {
            Write-Warning "停止 $($server.Name) 服务器时出错: $($_.Exception.Message)"
        }
    }
    
    # 使用统一的端口清理功能
    Write-Info "清理残留的端口进程..."
    Clear-Port 3300
    Clear-Port 3200
    
    $global:SERVERS = @()
    Write-Success "服务器停止完成"
}

# 运行测试
function Invoke-Tests($testType) {
    Write-Info "开始运行测试: $testType"
    
    try {
        $testExitCode = 0
        switch ($testType) {
            "all" {
                Write-Info "运行所有测试..."
                npm run test:e2e
                $testExitCode = $LASTEXITCODE
            }
            "rect" {
                Write-Info "运行2D矩形标注测试 (核心功能)..."
                npx playwright test tests/e2e/image-tool/rect-annotation.spec.ts --project=image-tool
                $testExitCode = $LASTEXITCODE
            }
            "core" {
                Write-Info "运行核心功能测试 (矩形、折线、多边形)..."
                npx playwright test tests/e2e/image-tool/rect-annotation.spec.ts tests/e2e/image-tool/polyline-annotation.spec.ts tests/e2e/image-tool/polygon-annotation.spec.ts --project=image-tool
                $testExitCode = $LASTEXITCODE
            }
            "iss" {
                Write-Info "运行ISS工具测试 (语义分割)..."
                npx playwright test tests/e2e/image-tool/iss-tool-advanced.spec.ts --project=image-tool
                $testExitCode = $LASTEXITCODE
            }
            "iss-extended" {
                Write-Info "运行ISS工具扩展测试 (基础+高级功能)..."
                npx playwright test tests/e2e/image-tool/iss-annotation.spec.ts tests/e2e/image-tool/iss-tool-advanced.spec.ts --project=image-tool
                $testExitCode = $LASTEXITCODE
            }
            "image-tool" {
                Write-Info "运行Image-Tool测试..."
                npm run test:image-tool
                $testExitCode = $LASTEXITCODE
            }
            "pc-tool" {
                Write-Info "运行PC-Tool测试..."
                npm run test:pc-tool
                $testExitCode = $LASTEXITCODE
            }
            "performance" {
                Write-Info "运行性能测试..."
                npm run test:performance
                $testExitCode = $LASTEXITCODE
            }
            "visual" {
                Write-Info "运行视觉回归测试..."
                npm run test:visual
                $testExitCode = $LASTEXITCODE
            }
            "debug" {
                Write-Info "调试模式运行2D矩形标注测试..."
                npx playwright test tests/e2e/image-tool/rect-annotation.spec.ts --project=image-tool --debug
                $testExitCode = $LASTEXITCODE
            }
            "ui" {
                Write-Info "交互式UI模式运行测试..."
                npm run test:e2e:ui
                $testExitCode = $LASTEXITCODE
            }
            default {
                Write-Error "未知的测试类型: $testType"
                Show-Help
                exit 1
            }
        }
        
        # 检查测试结果并设置适当的退出码
        if ($testExitCode -eq 0) {
            Write-Success "测试执行完成: $testType - 所有测试通过"
        } else {
            Write-Warning "测试执行完成: $testType - 有测试失败 (退出码: $testExitCode)"
            # 在CI模式下，测试失败应该导致脚本失败
            if ($CI) {
                Write-Error "CI模式下检测到测试失败，脚本将以非零退出码结束"
                throw "测试失败，退出码: $testExitCode"
            }
        }
    }
    catch {
        Write-Error "测试执行失败: $($_.Exception.Message)"
        throw
    }
}

# CI模式完整测试流程
function Invoke-CITests {
    Write-Info "开始CI模式完整测试流程..."
    
    try {
        # 1. 环境检查
        Test-Environment
        
        # 2. 启动服务器（使用Mock模式确保测试稳定性）
        Start-DevServers -EnableMock $true
        
        # 3. 运行所有测试
        Invoke-Tests "all"
        
        # 4. 生成测试报告
        Write-Info "生成测试报告..."
        npm run report
        
        Write-Success "CI测试流程完成"
    }
    catch {
        Write-Error "CI测试流程失败: $($_.Exception.Message)"
        throw
    }
    finally {
        # 5. 清理资源
        Stop-AllServers
    }
}

# 生成测试报告
function New-Report {
    Write-Info "生成测试报告..."
    npm run report
    if (-not $CI) {
        Write-Success "测试报告已生成，浏览器将自动打开"
    } else {
        Write-Success "测试报告已生成"
    }
}

# 清理测试结果
function Clear-Results {
    Write-Info "清理测试结果..."
    if (Test-Path "test-results") {
        Remove-Item -Recurse -Force "test-results"
    }
    if (Test-Path "playwright-report") {
        Remove-Item -Recurse -Force "playwright-report"
    }
    if (Test-Path "html-report") {
        Remove-Item -Recurse -Force "html-report"
    }
    Write-Success "测试结果已清理"
}

# 主程序
function Main($command) {
    try {
        # 检查环境变量中的CI设置
        if ($env:CI -eq "true" -and -not $CI) {
            $script:CI = $true
            Write-Info "检测到CI环境变量，启用CI模式"
        }
        
        # 显示CI模式状态
        if ($CI) {
            Write-Info "🤖 CI模式已启用"
            Write-Info "环境变量CI: $($env:CI)"
            Write-Info "命令行参数CI: $CI"
        } else {
            Write-Info "💻 本地模式"
        }
        
        switch ($command.ToLower()) {
            "setup" {
                Test-Environment
                Install-Dependencies
            }
            "all" {
                Test-Environment
                if ($CI) {
                    Invoke-CITests
                } else {
                    Start-DevServers -EnableMock $true
                    Invoke-Tests "all"
                }
            }
            "rect" {
                Test-Environment
                if ($CI) {
                    Write-Info "🎯 CI模式：启动服务器 -> 运行矩形测试 -> 清理"
                    Write-Info "步骤1: 启动开发服务器..."
                    Start-DevServers -EnableMock $true
                    Write-Info "步骤2: 运行矩形测试..."
                    try {
                        Invoke-Tests "rect"
                    }
                    finally {
                        Write-Info "步骤3: 清理服务器..."
                        Stop-AllServers
                    }
                    Write-Success "CI模式矩形测试完成"
                } else {
                    Write-Info "💻 本地模式：检查服务器状态..."
                    if ((Test-Port 3300) -and (Test-Port 3200)) {
                        Write-Info "检测到服务器已在运行，直接执行测试"
                        Invoke-Tests "rect"
                    } else {
                        Write-Info "服务器未运行，自动启动服务器并运行测试"
                        Start-DevServers -EnableMock $true
                        Invoke-Tests "rect"
                        Write-Info "测试完成，保持服务器运行以便后续测试"
                        Write-Info "如需停止服务器，请运行: .\run-tests.ps1 clean-ports"
                    }
                }
            }
            "core" {
                Test-Environment
                if ($CI) {
                    Write-Info "🎯 CI模式：启动服务器 -> 运行核心功能测试 -> 清理"
                    Write-Info "步骤1: 启动开发服务器..."
                    Start-DevServers -EnableMock $true
                    Write-Info "步骤2: 运行核心功能测试（矩形、折线、多边形）..."
                    try {
                        Invoke-Tests "core"
                    }
                    finally {
                        Write-Info "步骤3: 清理服务器..."
                        Stop-AllServers
                    }
                    Write-Success "CI模式核心功能测试完成"
                } else {
                    Write-Info "💻 本地模式：检查服务器状态..."
                    if ((Test-Port 3300) -and (Test-Port 3200)) {
                        Write-Info "检测到服务器已在运行，直接执行测试"
                        Invoke-Tests "core"
                    } else {
                        Write-Info "服务器未运行，自动启动服务器并运行测试"
                        Start-DevServers -EnableMock $true
                        Invoke-Tests "core"
                        Write-Info "测试完成，保持服务器运行以便后续测试"
                        Write-Info "如需停止服务器，请运行: .\run-tests.ps1 clean-ports"
                    }
                }
            }
            "image-tool" {
                Test-Environment
                if ($CI) {
                    Start-DevServers -EnableMock $true
                    try {
                        Invoke-Tests "image-tool"
                    }
                    finally {
                        Stop-AllServers
                    }
                } else {
                    Invoke-Tests "image-tool"
                }
            }
            "iss" {
                Test-Environment
                if ($CI) {
                    Write-Info "🎯 CI模式：启动服务器 -> 运行ISS工具测试 -> 清理"
                    Start-DevServers -EnableMock $true
                    try {
                        Invoke-Tests "iss"
                    }
                    finally {
                        Stop-AllServers
                    }
                } else {
                    Write-Info "💻 本地模式：检查服务器状态..."
                    if ((Test-Port 3300) -and (Test-Port 3200)) {
                        Write-Info "检测到服务器已在运行，直接执行ISS测试"
                        Invoke-Tests "iss"
                    } else {
                        Write-Info "服务器未运行，自动启动服务器并运行ISS测试"
                        Start-DevServers -EnableMock $true
                        Invoke-Tests "iss"
                        Write-Info "测试完成，保持服务器运行以便后续测试"
                    }
                }
            }
            "iss-extended" {
                Test-Environment
                if ($CI) {
                    Write-Info "🎯 CI模式：启动服务器 -> 运行ISS扩展测试 -> 清理"
                    Start-DevServers -EnableMock $true
                    try {
                        Invoke-Tests "iss-extended"
                    }
                    finally {
                        Stop-AllServers
                    }
                } else {
                    Write-Info "💻 本地模式：检查服务器状态..."
                    if ((Test-Port 3300) -and (Test-Port 3200)) {
                        Write-Info "检测到服务器已在运行，直接执行ISS扩展测试"
                        Invoke-Tests "iss-extended"
                    } else {
                        Write-Info "服务器未运行，自动启动服务器并运行ISS扩展测试"
                        Start-DevServers -EnableMock $true
                        Invoke-Tests "iss-extended"
                        Write-Info "测试完成，保持服务器运行以便后续测试"
                    }
                }
            }
            "pc-tool" {
                Test-Environment
                if ($CI) {
                    Start-DevServers -EnableMock $true
                    try {
                        Invoke-Tests "pc-tool"
                    }
                    finally {
                        Stop-AllServers
                    }
                } else {
                    Invoke-Tests "pc-tool"
                }
            }
            "performance" {
                Test-Environment
                Invoke-Tests "performance"
            }
            "visual" {
                Test-Environment
                Invoke-Tests "visual"
            }
            "debug" {
                Test-Environment
                Start-DevServers -EnableMock $true
                Invoke-Tests "debug"
            }
            "ui" {
                Test-Environment
                Start-DevServers -EnableMock $true
                Invoke-Tests "ui"
            }
            "report" {
                New-Report
            }
            "clean" {
                Clear-Results
            }
            "clean-ports" {
                Write-Info "清理占用3200/3300端口的Node.js进程..."
                Clear-Port 3300
                Clear-Port 3200
                Write-Success "端口清理完成"
            }
            "dev" {
                Test-Environment
                Start-DevServers -EnableMock $true
                Write-Info "开发服务器正在运行..."
                Write-Info "PC-Tool: http://localhost:3200"
                Write-Info "Image-Tool: http://localhost:3300"
                Write-Info "按Ctrl+C停止脚本"
                
                # 保持脚本运行
                try {
                    while ($true) {
                        Start-Sleep -Seconds 1
                    }
                }
                catch {
                    Write-Info "停止开发服务器..."
                }
                finally {
                    Stop-AllServers
                }
            }
            "ci" {
                Invoke-CITests
            }
            "help" {
                Show-Help
            }
            default {
                Write-Error "未知命令: $command"
                Show-Help
                exit 1
            }
        }
    }
    catch {
        Write-Error "执行过程中发生错误: $($_.Exception.Message)"
        exit 1
    }
}

# 运行主程序
Main $Command 