@echo off
REM STARTING SETUP

echo Setting up Backend...
cd backend
python -m venv venv
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install .
cd ..

echo Setting up Frontend...
cd frontend
call npm install
cd ..

echo SETUP FINISHED
pause
