@echo off
echo 🚀 AI Voice Agent - Quick Start Setup
echo ====================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.9+
    exit /b 1
)
echo ✓ Python found

echo.
echo Setting up backend...
cd backend

REM Create virtual environment
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing Python dependencies...
pip install -q -r requirements.txt

REM Copy env file if not exists
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo ⚠️  Please edit backend\.env with your API keys!
)

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Edit backend\.env with your API keys (see docs\SETUP.md)
echo 2. Run: cd backend ^&^& venv\Scripts\activate
echo 3. Test: python test_voice.py
echo 4. Start server: python -m app.main
echo.
echo 📚 Full setup guide: docs\SETUP.md

pause
