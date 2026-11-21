@echo off
title Configure SecureShip Autostart
setlocal

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\SecureShip.lnk"
set "TARGET_BAT=%~dp0start.bat"

echo ===================================================
echo       Configure SecureShip Windows Auto-Start
echo ===================================================
echo.

if "%1"=="remove" goto REMOVE

:: Create shortcut in Startup folder using powershell
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%~dp0'; $s.WindowStyle = 7; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [SUCCESS] SecureShip has been added to Windows Startup!
    echo It will now automatically launch in the background whenever you log into Windows.
    echo.
    echo To disable autostart in the future, run:
    echo   setup_autostart.bat remove
) else (
    echo [ERROR] Failed to create shortcut in %STARTUP_FOLDER%.
)
echo.
pause
exit /b 0

:REMOVE
if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%"
    echo [SUCCESS] SecureShip removed from Windows Startup.
) else (
    echo SecureShip was not configured for autostart.
)
echo.
pause
