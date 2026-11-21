@echo off
title SecureShip Launcher
setlocal

cd /d "%~dp0"

echo ===================================================
echo               Starting SecureShip Platform
echo ===================================================
echo.

:: Check Backend Venv
if not exist "%~dp0backend\.venv\Scripts\python.exe" (
    echo [ERROR] Backend virtualenv not found at backend\.venv!
    pause
    exit /b 1
)

:: Kill existing instances on ports 8000 and 5173 to avoid conflicts
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING 2^>nul') do (
    echo Stopping old process on port 8000 (PID %%a)...
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    echo Stopping old process on port 5173 (PID %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

:: Start Backend
echo Starting FastAPI Backend (http://localhost:8000)...
start "SecureShip Backend" cmd /k "cd /d %~dp0backend && title SecureShip Backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

:: Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak >nul

:: Start Frontend
echo Starting Vite Frontend (http://localhost:5173)...
start "SecureShip Frontend" cmd /k "cd /d %~dp0frontend && title SecureShip Frontend && npm run dev -- --host 0.0.0.0"

:: Wait 3 seconds then open browser
timeout /t 3 /nobreak >nul
echo.
echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo.
echo ===================================================
echo SecureShip is now running!
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:8000 (API docs: /docs)
echo.
echo (Keep the backend and frontend terminal windows open.
echo  Run stop.bat whenever you want to shut them down.)
echo ===================================================
timeout /t 5 >nul
