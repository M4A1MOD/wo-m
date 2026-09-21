param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$platformRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $platformRoot 'frontend'
$backendRoot = Join-Path $platformRoot 'backend'
$aiRoot = Join-Path $platformRoot 'ai-service'
$venvRoot = Join-Path $aiRoot '.venv'
$venvPython = Join-Path $venvRoot 'Scripts\python.exe'
$toolsRoot = Join-Path $backendRoot '.tools'
$mavenVersion = '3.9.9'
$localMaven = Join-Path $toolsRoot "apache-maven-$mavenVersion\bin\mvn.cmd"
$localTemp = Join-Path $platformRoot '.runtime\temp'

New-Item -ItemType Directory -Path $localTemp -Force | Out-Null
$env:TEMP = $localTemp
$env:TMP = $localTemp

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory
    )

    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code ${LASTEXITCODE}: $FilePath"
        }
    }
    finally {
        Pop-Location
    }
}

function Get-JavaHome {
    if ($env:JAVA_HOME) {
        $configuredJava = Join-Path $env:JAVA_HOME 'bin\java.exe'
        if (Test-Path $configuredJava) {
            return (Resolve-Path $env:JAVA_HOME).Path
        }
    }

    $javaCommand = Get-Command 'java.exe' -ErrorAction SilentlyContinue
    if ($javaCommand) {
        return Split-Path -Parent (Split-Path -Parent $javaCommand.Source)
    }

    throw '未检测到 JDK。请安装 JDK 17 或更高版本，并设置 JAVA_HOME 或把 java.exe 加入 PATH。'
}

try {
    Write-Host '[1/5] 检查基础运行环境...' -ForegroundColor Cyan

    $nodeCommand = Get-Command 'node.exe' -ErrorAction SilentlyContinue
    $npmCommand = Get-Command 'npm.cmd' -ErrorAction SilentlyContinue
    if (-not $nodeCommand -or -not $npmCommand) {
        throw '未检测到 Node.js/npm。请安装 Node.js 20 或更高版本。'
    }

    $nodeVersionText = (& $nodeCommand.Source --version).TrimStart('v')
    $nodeMajorVersion = [int]($nodeVersionText.Split('.')[0])
    if ($nodeMajorVersion -lt 20) {
        throw "当前 Node.js 版本为 $nodeVersionText，请升级到 Node.js 20 或更高版本。"
    }

    $javaHome = Get-JavaHome
    $javaVersionOutput = (& (Join-Path $javaHome 'bin\java.exe') -version 2>&1 | Out-String)
    if ($javaVersionOutput -notmatch 'version "(?<major>\d+)') {
        throw '无法识别当前 JDK 版本。'
    }
    if ([int]$Matches.major -lt 17) {
        throw "当前 JDK 主版本为 $($Matches.major)，请升级到 JDK 17 或更高版本。"
    }
    $env:JAVA_HOME = $javaHome

    Write-Host '[2/5] 准备本地环境配置...' -ForegroundColor Cyan
    $envFile = Join-Path $platformRoot '.env'
    $envExample = Join-Path $platformRoot '.env.example'
    if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
        Copy-Item -LiteralPath $envExample -Destination $envFile
    }

    Write-Host '[3/5] 准备 Python AI 服务依赖...' -ForegroundColor Cyan
    $pythonLauncher = $null
    $pythonPrefix = @()
    $pyCommand = Get-Command 'py.exe' -ErrorAction SilentlyContinue
    $pythonCommand = Get-Command 'python.exe' -ErrorAction SilentlyContinue
    if ($pyCommand) {
        $pythonLauncher = $pyCommand.Source
        $pythonPrefix = @('-3')
    }
    elseif ($pythonCommand) {
        $pythonLauncher = $pythonCommand.Source
    }
    else {
        throw '未检测到 Python。请安装 Python 3.11 或更高版本。'
    }

    if (-not (Test-Path $venvPython)) {
        Invoke-CheckedCommand -FilePath $pythonLauncher -Arguments @($pythonPrefix + @('-m', 'venv', $venvRoot)) -WorkingDirectory $aiRoot
    }

    $pythonVersionText = (& $venvPython -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")').Trim()
    $pythonVersionParts = $pythonVersionText.Split('.')
    if ([int]$pythonVersionParts[0] -lt 3 -or ([int]$pythonVersionParts[0] -eq 3 -and [int]$pythonVersionParts[1] -lt 11)) {
        throw "当前 Python 版本为 $pythonVersionText，请升级到 Python 3.11 或更高版本后删除 ai-service\.venv 并重试。"
    }

    $requirementsFile = Join-Path $aiRoot 'requirements.txt'
    $requirementsHash = (Get-FileHash -LiteralPath $requirementsFile -Algorithm SHA256).Hash
    $requirementsMarker = Join-Path $venvRoot '.requirements.sha256'
    $installedRequirementsHash = if (Test-Path $requirementsMarker) { (Get-Content -LiteralPath $requirementsMarker -Raw).Trim() } else { '' }
    if ($Force -or $installedRequirementsHash -ne $requirementsHash) {
        if (Test-Path (Join-Path $venvRoot 'Lib\site-packages\pip')) {
            $pipExecutable = $venvPython
            $pipPrefix = @('-m', 'pip')
        }
        else {
            & $pythonLauncher @pythonPrefix -m pip --version *> $null
            if ($LASTEXITCODE -ne 0) {
                throw '当前 Python 未包含 pip，请重新安装 Python 并勾选 pip 组件。'
            }
            $pipExecutable = $pythonLauncher
            $pipPrefix = @($pythonPrefix + @('-m', 'pip', '--python', $venvPython))
        }
        Invoke-CheckedCommand -FilePath $pipExecutable -Arguments @($pipPrefix + @('install', '--disable-pip-version-check', '-r', $requirementsFile)) -WorkingDirectory $aiRoot
        Set-Content -LiteralPath $requirementsMarker -Value $requirementsHash -Encoding ASCII
    }

    Write-Host '[4/5] 准备 Vue 前端依赖...' -ForegroundColor Cyan
    $packageLock = Join-Path $frontendRoot 'package-lock.json'
    $packageHash = (Get-FileHash -LiteralPath $packageLock -Algorithm SHA256).Hash
    $nodeModulesRoot = Join-Path $frontendRoot 'node_modules'
    $frontendMarker = Join-Path $nodeModulesRoot '.package-lock.sha256'
    $installedPackageHash = if (Test-Path $frontendMarker) { (Get-Content -LiteralPath $frontendMarker -Raw).Trim() } else { '' }
    $viteCommand = Join-Path $nodeModulesRoot '.bin\vite.cmd'
    $needsFrontendInstall = $Force -or -not (Test-Path $viteCommand) -or ($installedPackageHash -and $installedPackageHash -ne $packageHash)
    if (-not $Force -and -not $installedPackageHash -and (Test-Path $viteCommand)) {
        Push-Location $frontendRoot
        try {
            & $npmCommand.Source ls --depth=0 --silent *> $null
            $needsFrontendInstall = $LASTEXITCODE -ne 0
        }
        finally {
            Pop-Location
        }
    }
    if ($needsFrontendInstall) {
        $npmCache = Join-Path $frontendRoot '.npm-cache'
        Invoke-CheckedCommand -FilePath $npmCommand.Source -Arguments @('ci', '--cache', $npmCache, '--prefer-offline', '--no-audit') -WorkingDirectory $frontendRoot
    }
    Set-Content -LiteralPath $frontendMarker -Value $packageHash -Encoding ASCII

    Write-Host '[5/5] 准备 Maven...' -ForegroundColor Cyan
    $systemMaven = Get-Command 'mvn.cmd' -ErrorAction SilentlyContinue
    if (-not (Test-Path $localMaven) -and -not $systemMaven) {
        New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
        $mavenArchive = Join-Path $toolsRoot "apache-maven-$mavenVersion-bin.zip"
        $mavenUrl = "https://archive.apache.org/dist/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
        Write-Host "正在下载 Maven $mavenVersion 到项目目录..."
        Invoke-WebRequest -Uri $mavenUrl -OutFile $mavenArchive -UseBasicParsing
        Expand-Archive -LiteralPath $mavenArchive -DestinationPath $toolsRoot -Force
    }

    if (-not (Test-Path $localMaven) -and -not (Get-Command 'mvn.cmd' -ErrorAction SilentlyContinue)) {
        throw 'Maven 准备失败，请检查网络后重试。'
    }

    Write-Host '项目环境已准备完成。' -ForegroundColor Green
}
catch {
    Write-Host "环境准备失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
