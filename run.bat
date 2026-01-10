@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo Tailor Tally - Startup & Update
echo ==========================================

:: 1. Check for Git and Pull Changes
git --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [Update] Pulling latest changes from Git...
    git pull
) else (
    echo [Skip] Git not found, skipping auto-update.
)

:: 2. Ensure Virtual Environment exists
if not exist "backend\.venv" (
    echo [Error] Backend virtual environment not found. 
    echo Please run 'setup.bat' first.
    pause
    exit /b 1
)

:: 3. Update dependencies (Fast check)
echo [Update] Syncing dependencies...
call backend\.venv\Scripts\activate
cd backend
pip install . --quiet
cd ..

cd frontend
call npm install --loglevel error
cd ..

:: 4. Start Backend
echo [Run] Starting Backend Server...
:: Using 'start' to run in a separate window so logs don't mix and both run concurrently
start "Tailor Tally Backend" cmd /k "cd backend && .venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"

:: 5. Start Frontend
echo [Run] Starting Frontend Server...
start "Tailor Tally Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo Application is starting!
echo ==========================================
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Keep the new terminal windows open while using the app.
echo.
pause
