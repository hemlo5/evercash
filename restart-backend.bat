@echo off
echo ============================================
echo RESTARTING BACKEND SERVER WITH FIXED CORS
echo ============================================
echo.

cd emerald-budget-server

echo Killing existing Node processes on port 5006...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5006"') do (
    taskkill /F /PID %%a 2>nul
)

echo.
echo Starting backend server with CORS fixed...
echo.

REM Start the server
npm start

pause
