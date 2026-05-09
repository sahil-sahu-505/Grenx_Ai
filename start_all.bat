@echo off
echo Starting Voice AI SaaS Platform...
echo.

echo Starting Backend Server...
start "Backend" cmd /k "cd backend && C:\Users\Dell\AppData\Local\Programs\Python\Python311\python.exe start_server.py"

timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
start "Frontend" cmd /k "cd frontend-react && set PATH=C:\Program Files\nodejs;%PATH% && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause
