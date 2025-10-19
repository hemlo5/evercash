@echo off
echo ============================================
echo Starting Actual Budget Server with CORS enabled
echo ============================================
echo.

REM Check if actual-server is installed
where actual-server >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: actual-server is not installed!
    echo.
    echo Please install it first:
    echo npm install -g @actual-app/api @actual-app/web
    echo.
    pause
    exit /b 1
)

echo Starting Actual Budget server on port 5006...
echo.

REM Set CORS environment variable
set ACTUAL_CORS_ENABLED=true
set ACTUAL_CORS_ORIGIN=http://localhost:3000

REM Start the server
actual-server --port 5006 --cors

echo.
echo ============================================
echo Server should be running at http://localhost:5006
echo Your app at http://localhost:3000 can now connect!
echo ============================================
pause
