param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'

$platformRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $platformRoot '.runtime'
$pidFile = Join-Path $runtimeDir 'processes.json'
$frontendUrl = 'http://127.0.0.1:5173'
$backendHealth = 'http://127.0.0.1:8080/api/v1/health'
$aiHealth = 'http://127.0.0.1:8000/api/v1/health'
$prepareScript = Join-Path $PSScriptRoot 'prepare-platform.ps1'

function Test-Url([string]$url) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
    } catch {
        return $false
    }
}

function Get-PortOwner([int]$port) {
    return Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty OwningProcess
}

function Stop-StartedProcesses($processes) {
    foreach ($process in $processes) {
        if ($process -and -not $process.HasExited) {
            try { & taskkill.exe /PID $process.Id /T /F 2>$null | Out-Null } catch { }
        }
    }
}

function Get-JavaHome {
    if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
        return (Resolve-Path $env:JAVA_HOME).Path
    }

    $javaCommand = Get-Command 'java.exe' -ErrorAction SilentlyContinue
    if ($javaCommand) {
        return Split-Path -Parent (Split-Path -Parent $javaCommand.Source)
    }

    return $null
}

try {
    New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

    $portsInUse = @(5173, 8000, 8080 | Where-Object { Get-PortOwner $_ })
    if ($portsInUse.Count -gt 0) {
        if ((Test-Url $frontendUrl) -and (Test-Url $backendHealth) -and (Test-Url $aiHealth)) {
            Write-Host 'The platform is already running. Opening the browser...' -ForegroundColor Green
            if (-not $NoBrowser) { Start-Process $frontendUrl }
            exit 0
        }
        throw "Port(s) $($portsInUse -join ', ') are already in use. Close the owning programs or run the stop launcher."
    }

    & $prepareScript
    if ($LASTEXITCODE -ne 0) { throw '项目环境准备失败。' }

    $python = Join-Path $platformRoot 'ai-service\.venv\Scripts\python.exe'
    $localMaven = Join-Path $platformRoot 'backend\.tools\apache-maven-3.9.9\bin\mvn.cmd'
    $systemMaven = Get-Command mvn.cmd -ErrorAction SilentlyContinue
    $maven = if (Test-Path $localMaven) { $localMaven } elseif ($systemMaven) { $systemMaven.Source } else { $null }
    $javaHome = Get-JavaHome
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    $required = @($python, $maven)
    if ($javaHome) { $required += Join-Path $javaHome 'bin\java.exe' }
    else { throw 'JDK 17 or newer was not found.' }
    foreach ($path in $required) {
        if (-not (Test-Path -LiteralPath $path)) { throw "Required runtime file is missing: $path" }
    }
    if (-not $npmCommand) { throw 'npm.cmd was not found. Make sure Node.js is installed.' }

    Get-ChildItem -LiteralPath $runtimeDir -Filter '*.log' -File -ErrorAction SilentlyContinue |
        Remove-Item -Force

    Write-Host 'Starting AI service, Java backend, and web frontend...' -ForegroundColor Cyan
    $started = @()
    $aiProcess = Start-Process -FilePath $python -ArgumentList @('-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000') `
        -WorkingDirectory (Join-Path $platformRoot 'ai-service') -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $runtimeDir 'ai-service.log') -RedirectStandardError (Join-Path $runtimeDir 'ai-service-error.log')
    $started += $aiProcess

    $oldJavaHome = $env:JAVA_HOME
    $oldPath = $env:Path
    $env:JAVA_HOME = $javaHome
    $env:Path = "$javaHome\bin;$oldPath"
    try {
        $backendProcess = Start-Process -FilePath $maven -ArgumentList @('-Dmaven.repo.local=.tools/m2','spring-boot:run') `
            -WorkingDirectory (Join-Path $platformRoot 'backend') -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $runtimeDir 'backend.log') -RedirectStandardError (Join-Path $runtimeDir 'backend-error.log')
        $started += $backendProcess
    } finally {
        $env:JAVA_HOME = $oldJavaHome
        $env:Path = $oldPath
    }

    $frontendProcess = Start-Process -FilePath $npmCommand.Source -ArgumentList @('run','dev','--','--host','127.0.0.1') `
        -WorkingDirectory (Join-Path $platformRoot 'frontend') -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $runtimeDir 'frontend.log') -RedirectStandardError (Join-Path $runtimeDir 'frontend-error.log')
    $started += $frontendProcess

    @{
        startedAt = (Get-Date).ToString('s')
        services = @(
            @{ name = 'ai-service'; pid = $aiProcess.Id; port = 8000 }
            @{ name = 'backend'; pid = $backendProcess.Id; port = 8080 }
            @{ name = 'frontend'; pid = $frontendProcess.Id; port = 5173 }
        )
    } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $pidFile -Encoding UTF8

    $deadline = (Get-Date).AddSeconds(90)
    do {
        if ($started | Where-Object HasExited) { throw 'A service exited early. Check the error logs in .runtime.' }
        $ready = (Test-Url $frontendUrl) -and (Test-Url $backendHealth) -and (Test-Url $aiHealth)
        if (-not $ready) { Start-Sleep -Seconds 1 }
    } until ($ready -or (Get-Date) -ge $deadline)

    if (-not $ready) { throw 'Startup timed out. Check the logs in .runtime.' }
    Write-Host 'Platform started successfully: http://localhost:5173' -ForegroundColor Green
    if (-not $NoBrowser) { Start-Process 'http://localhost:5173' }
    exit 0
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($started) { Stop-StartedProcesses $started }
    if (Test-Path -LiteralPath $pidFile) { Remove-Item -LiteralPath $pidFile -Force }
    exit 1
}
