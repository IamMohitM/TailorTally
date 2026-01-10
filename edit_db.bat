@echo off
REM Edit Database Script
echo Starting Database Editor...
echo This will open a web interface to edit your database.

cd backend
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    echo Installing/Updating sqlite-web...
    pip install sqlite-web
    
    echo Starting sqlite-web...
    echo Your browser should open automatically.
    echo Press Ctrl+C in this window to stop the editor.
    
    python scripts/edit_db.py
    
    deactivate
) else (
    echo Error: Virtual environment not found. 
    echo Please run setup.bat first to install dependencies.
    pause
)

cd ..
echo Done.
