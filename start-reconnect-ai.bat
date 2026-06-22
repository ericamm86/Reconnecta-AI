@echo off
setlocal

set "ROOT=%~dp0"

echo Starting Reconnect AI services...
echo Root: %ROOT%
echo.

cd /d "%ROOT%"
node scripts\start-local.cjs
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo Reconnect AI local runner exited with code %EXIT_CODE%.
echo Logs are in: %ROOT%logs
echo Press any key to close this window.
pause >nul
exit /b %EXIT_CODE%

endlocal
