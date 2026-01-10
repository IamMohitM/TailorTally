@echo off
REM View Database Script
echo Generating Database View...
echo This will create an HTML file with your database contents and open it in your browser.

cd backend
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    python scripts/view_db.py
    deactivate
) else (
    echo Error: Virtual environment not found. 
    echo Please run setup.bat first to install dependencies.
    pause
)

cd ..
echo Done.
