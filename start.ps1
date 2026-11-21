# SecureShip One-Click PowerShell Launcher
$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "             Starting SecureShip Platform          " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$PythonExe = Join-Path $Root "backend\.venv\Scripts\python.exe"
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"

if (-not (Test-Path $PythonExe)) {
    Write-Host "[ERROR] Python environment not found at backend\.venv!" -ForegroundColor Red
    pause
    exit 1
}

# Free ports 8000 and 5173 if already busy
foreach ($port in @(8000, 5173)) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            Write-Host "Stopping existing process on port $port (PID $($c.OwningProcess))..." -ForegroundColor Yellow
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

# Start Backend
Write-Host "Starting FastAPI Backend (http://localhost:8000)..." -ForegroundColor Green
Start-Process -FilePath $PythonExe `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--app-dir", "`"$BackendDir`"", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory $BackendDir

# Start Frontend
Write-Host "Starting Vite Frontend (http://localhost:5173)..." -ForegroundColor Green
$npmCmd = "C:\Program Files\nodejs\npm.cmd"
if (-not (Test-Path $npmCmd)) {
    $npmCmd = (Get-Command npm -ErrorAction SilentlyContinue).Source
}
Start-Process -FilePath $npmCmd `
    -ArgumentList "run", "dev", "--", "--host", "0.0.0.0" `
    -WorkingDirectory $FrontendDir

# Wait for servers
Start-Sleep -Seconds 3

# Open Browser
Write-Host "Opening browser at http://localhost:5173..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "SecureShip is running successfully!" -ForegroundColor Green
Write-Host " - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host " - Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Green
Start-Sleep -Seconds 4
