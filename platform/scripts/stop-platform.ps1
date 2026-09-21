$ErrorActionPreference = 'Stop'

$platformRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $platformRoot '.runtime'
$pidFile = Join-Path $runtimeDir 'processes.json'
$processIds = New-Object 'System.Collections.Generic.HashSet[int]'

try {
    if (Test-Path -LiteralPath $pidFile) {
        $saved = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
        foreach ($service in $saved.services) { [void]$processIds.Add([int]$service.pid) }
    }

    foreach ($port in @(5173, 8000, 8080)) {
        $connections = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
        foreach ($connection in $connections) {
            $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction SilentlyContinue
            if ($process.CommandLine -and $process.CommandLine.IndexOf($platformRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
                [void]$processIds.Add([int]$connection.OwningProcess)
            }
        }
    }

    Get-Process -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            if ($_.Path -and $_.Path.StartsWith($platformRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                [void]$processIds.Add([int]$_.Id)
            }
        } catch { }
    }

    Get-CimInstance Win32_Process -Filter "Name = 'java.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.CommandLine -and $_.CommandLine.IndexOf($platformRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            [void]$processIds.Add([int]$_.ProcessId)
        }
    }

    if ($processIds.Count -eq 0) {
        Write-Host 'The platform is not running.' -ForegroundColor Yellow
    } else {
        foreach ($processId in $processIds) {
            if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
                try { & taskkill.exe /PID $processId /T /F 2>$null | Out-Null } catch { }
            }
        }
        Write-Host 'All platform services have stopped.' -ForegroundColor Green
    }
    if (Test-Path -LiteralPath $pidFile) { Remove-Item -LiteralPath $pidFile -Force }
    exit 0
} catch {
    Write-Host "Failed to stop the platform: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
