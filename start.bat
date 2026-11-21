@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo ===================================================
echo               Starting SecureShip
echo ===================================================
echo.

set "PY=%~dp0backend\.venv\Scripts\python.exe"
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"
set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"

if not exist "!PY!" (
    echo [ERROR] Python environment not found at backend\.venv
    pause
    exit /b 1
)

:: Free port 8000 if occupied
for /f "tokens=5" %%p in ('netstat -aon ^| findstr /r ":8000.*LISTENING" 2^>nul') do (
    taskkill /F /PID %%p >nul 2>&1
)

:: Free port 5173 if occupied
for /f "tokens=5" %%p in ('netstat -aon ^| findstr /r ":5173.*LISTENING" 2^>nul') do (
    taskkill /F /PID %%p >nul 2>&1
)

echo Starting Backend server (http://localhost:8000)...
start "SecureShip Backend" cmd /k "cd /d "!BACKEND_DIR!" && "!PY!" -m uvicorn app.main:app --app-dir "!BACKEND_DIR!" --host 0.0.0.0 --port 8000"

echo Starting Frontend server (http://localhost:5173)...
start "SecureShip Frontend" cmd /k "cd /d "!FRONTEND_DIR!" && "!NPM_CMD!" run dev -- --host 0.0.0.0"

echo.
echo Waiting for servers to initialize...
ping 127.0.0.1 -n 4 >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo.
echo ===================================================
echo SecureShip is now running!
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8000 (Docs: /docs)
echo ===================================================
echo.
ping 127.0.0.1 -n 4 >nul
