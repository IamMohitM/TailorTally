@echo off
REM STARTING APP

set NODE_SKIP_PLATFORM_CHECK=1

start "Backend" cmd /k "cd backend && venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000"

start "Frontend" cmd /k "cd frontend && npm run dev"

echo APP IS STARTING
pause
