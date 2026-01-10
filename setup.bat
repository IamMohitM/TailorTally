@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo Tailor Tally - Windows Setup
echo ==========================================

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.11+ (x86 for 32-bit system).
    echo Download from: https://www.python.org/downloads/windows/
    pause
    exit /b 1
)

:: Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js (x86 for 32-bit system).
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [1/2] Setting up Backend (Python)...
if not exist "backend\.venv" (
    echo Creating virtual environment...
    python -m venv backend\.venv
)

echo Installing backend dependencies...
call backend\.venv\Scripts\activate
python -m pip install --upgrade pip
:: Install dependencies directly from pyproject.toml using pip install .
cd backend
pip install .
cd ..

echo.
echo [2/2] Setting up Frontend (Node.js)...
cd frontend
echo Installing frontend dependencies (this may take a few minutes)...
call npm install
cd ..

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
echo Use 'run.bat' to start the application.
echo.
pause
