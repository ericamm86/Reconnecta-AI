param(
  [switch]$TailLogs
)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Ports = @(4100, 5173)

function Write-Section {
  param([string]$Title)
  Write-Host ""
  Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Test-Url {
  param([string]$Url)
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    [pscustomobject]@{
      Url = $Url
      Status = $response.StatusCode
      Result = "OK"
    }
  } catch {
    [pscustomobject]@{
      Url = $Url
      Status = "-"
      Result = $_.Exception.Message
    }
  }
}

Write-Section "Project Paths"
[pscustomobject]@{
  Root = $Root
  Backend = $Backend
  Frontend = $Frontend
} | Format-List

Write-Section "Node And NPM"
try { node --version } catch { Write-Host "node not found: $($_.Exception.Message)" -ForegroundColor Red }
try { npm --version } catch { Write-Host "npm not found: $($_.Exception.Message)" -ForegroundColor Red }
try { Get-Command node | Select-Object Source } catch {}
try { Get-Command npm.cmd | Select-Object Source } catch {}

Write-Section "Dependency Folders"
[pscustomobject]@{
  BackendNodeModules = Test-Path (Join-Path $Backend "node_modules")
  FrontendNodeModules = Test-Path (Join-Path $Frontend "node_modules")
  BackendPackageLock = Test-Path (Join-Path $Backend "package-lock.json")
  FrontendPackageLock = Test-Path (Join-Path $Frontend "package-lock.json")
} | Format-List

Write-Section "Localhost Resolution"
try {
  Resolve-DnsName localhost -ErrorAction Stop |
    Select-Object Name, Type, IPAddress |
    Format-Table -AutoSize
} catch {
  Write-Host "Resolve-DnsName localhost failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Section "Hosts File Localhost Entries"
$HostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
try {
  Get-Content $HostsPath |
    Where-Object { $_ -match "localhost|127\.0\.0\.1|::1" } |
    ForEach-Object { Write-Host $_ }
} catch {
  Write-Host "Could not read hosts file: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Section "Listening Ports"
foreach ($Port in $Ports) {
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Host "Port ${Port}: NOT LISTENING" -ForegroundColor Yellow
    continue
  }

  foreach ($connection in $connections) {
    $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
    [pscustomobject]@{
      Port = $Port
      LocalAddress = $connection.LocalAddress
      State = $connection.State
      PID = $connection.OwningProcess
      Process = $process.ProcessName
      Path = $process.Path
    } | Format-List
  }
}

Write-Section "HTTP Checks"
@(
  "http://localhost:4100/health",
  "http://127.0.0.1:4100/health",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
) | ForEach-Object { Test-Url $_ } | Format-Table -AutoSize

Write-Section "Recent Existing Logs"
$logFiles = @(
  (Join-Path $Root "backend-start.log"),
  (Join-Path $Root "backend-start.err"),
  (Join-Path $Root "frontend-preview.log"),
  (Join-Path $Root "frontend-preview.err")
)

foreach ($logFile in $logFiles) {
  if (Test-Path $logFile) {
    $item = Get-Item $logFile
    Write-Host ""
    Write-Host "$($item.Name) - $($item.Length) bytes - $($item.LastWriteTime)" -ForegroundColor Gray
    Get-Content $logFile -Tail 40 -ErrorAction SilentlyContinue
  } else {
    Write-Host "$logFile not found" -ForegroundColor Yellow
  }
}

Write-Section "Foreground Startup Commands For Capturing Errors"
Write-Host "Backend:"
Write-Host "  cd `"$Backend`""
Write-Host "  npm start"
Write-Host ""
Write-Host "Frontend:"
Write-Host "  cd `"$Frontend`""
Write-Host "  npm run dev -- --host 127.0.0.1 --port 5173"
Write-Host ""
Write-Host "If a command exits immediately, the visible output is the real startup error."

if ($TailLogs) {
  Write-Section "Live Log Tail"
  Write-Host "Press Ctrl+C to stop tailing logs."
  Get-Content $logFiles -Tail 20 -Wait -ErrorAction SilentlyContinue
}
