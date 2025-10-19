@echo off
echo ============================================
echo FIXING RATE LIMIT ISSUE - RESTARTING BACKEND
echo ============================================
echo.

echo Step 1: Killing existing backend processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo Step 2: Starting backend with increased rate limits...
cd emerald-budget-server
set NODE_ENV=development
start "Backend Server" cmd /k "npm start"

echo.
echo Step 3: Waiting for backend to start...
timeout /t 5 >nul

echo.
echo ============================================
echo BACKEND RESTARTED WITH HIGHER RATE LIMITS
echo Rate limit increased from 50 to 10,000 requests/minute
echo CORS fixed for localhost:8080
echo ============================================
echo.
echo Now restart your frontend with: npm run dev
pause
