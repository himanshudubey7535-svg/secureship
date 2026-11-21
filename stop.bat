@echo off
title Stop SecureShip
setlocal

echo ===================================================
echo               Stopping SecureShip
echo ===================================================
echo.

:: Stop processes listening on port 8000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING 2^>nul') do (
    echo Stopping Backend process on port 8000 (PID %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

:: Stop processes listening on port 5173 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    echo Stopping Frontend process on port 5173 (PID %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo All SecureShip processes have been stopped.
timeout /t 3 >nul
