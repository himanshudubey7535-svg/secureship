@echo off
title Stop SecureShip
setlocal

echo ===================================================
echo               Stopping SecureShip
echo ===================================================
echo.

:: Stop processes listening on port 8000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":8000.*LISTENING" 2^>nul') do (
    echo Stopping Backend process on port 8000 [PID %%a]
    taskkill /f /pid %%a >nul 2>&1
)

:: Stop processes listening on port 5173 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":5173.*LISTENING" 2^>nul') do (
    echo Stopping Frontend process on port 5173 [PID %%a]
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo All SecureShip processes have been stopped.
ping 127.0.0.1 -n 3 >nul
