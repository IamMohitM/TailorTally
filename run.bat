@echo off
REM STARTING APP

echo Checking for updates...
for /f "delims=" %%i in ('git rev-parse HEAD') do set PREV_HEAD=%%i
call git pull
for /f "delims=" %%i in ('git rev-parse HEAD') do set NEW_HEAD=%%i

if "%PREV_HEAD%" == "%NEW_HEAD%" (
    echo No changes from git.
) else (
    echo Updates received. Checking for file changes...
    
    git diff --name-only %PREV_HEAD% %NEW_HEAD% | findstr "backend/pyproject.toml"
    if not errorlevel 1 (
        echo ---------------------------------------
        echo backend/pyproject.toml changed.
        echo Updating backend environment...
        echo ---------------------------------------
        cd backend
        call venv\Scripts\activate.bat
        call pip install .
        cd ..
    )

    git diff --name-only %PREV_HEAD% %NEW_HEAD% | findstr "frontend/package.json"
    if not errorlevel 1 (
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

start "Backend" cmd /k "cd backend && venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000"

start "Frontend" cmd /k "cd frontend && npm run dev"

echo APP IS STARTING
pause
