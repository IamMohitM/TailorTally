@echo off
setlocal EnableDelayedExpansion

REM STARTING APP

echo ---------------------------------------
echo Checking for updates...
echo Current Branch:
git branch --show-current
echo ---------------------------------------

REM Capture initial HEAD
for /f "delims=" %%i in ('git rev-parse HEAD') do set PREV_HEAD=%%i

REM Try to pull
call git pull
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo [ERROR] GIT PULL FAILED!
    echo The application could not be updated.
    echo Common causes:
    echo 1. You have local changes ^(stash or discard them^).
    echo 2. Network issues or authentication failure.
    echo.
    echo Launching existing version in 10 seconds...
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo.
    timeout /t 10
)

REM Capture new HEAD
for /f "delims=" %%i in ('git rev-parse HEAD') do set NEW_HEAD=%%i

if "%PREV_HEAD%" == "%NEW_HEAD%" (
    echo.
    echo No changes from git (or pull failed).
    echo.
) else (
    echo.
    echo Updates received. Checking for file changes...
    
    git diff --name-only %PREV_HEAD% %NEW_HEAD% | findstr "backend/pyproject.toml" >nul
    if !ERRORLEVEL! EQU 0 (
        echo ---------------------------------------
        echo backend/pyproject.toml changed.
        echo Updating backend environment...
        echo ---------------------------------------
        cd backend
        call venv\Scripts\activate.bat
        call pip install .
        cd ..
    )

    git diff --name-only %PREV_HEAD% %NEW_HEAD% | findstr "frontend/package.json" >nul
    if !ERRORLEVEL! EQU 0 (
        echo ---------------------------------------
        echo frontend/package.json changed.
        echo Updating frontend environment...
        echo ---------------------------------------
        cd frontend
        call npm install
        cd ..
    )
)

set NODE_SKIP_PLATFORM_CHECK=1

echo Starting Backend...
start "Backend" cmd /k "cd backend && venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo Opening Browser...
timeout /t 5 >nul
start http://localhost:5173

echo APP IS STARTING
pause
