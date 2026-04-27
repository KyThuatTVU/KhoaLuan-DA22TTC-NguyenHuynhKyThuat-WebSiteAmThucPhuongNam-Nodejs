@echo off
chcp 65001 >nul
echo ===============================================================
echo 🚀 KHOI DONG HE THONG KHOA LUAN TOT NGHIEP (NODE.JS + PYTHON AI)
echo ===============================================================
echo.

echo Dang khoi dong AI Service (Python) o cong 5000...
start "AI Microservice (Python)" cmd /k "cd ai_service && C:\Users\ACER\AppData\Local\Python\pythoncore-3.14-64\python.exe app.py"

echo Dang khoi dong Backend API (Node.js) o cong 3000...
start "Backend (Node.js)" cmd /k "cd backend && npm run dev"

echo.
echo ✅ Da mo 2 cua so cho Backend va AI Service!
echo Thong bao: Ban co the mo file frontend/index.html bang Live Server ngay bay gio.
echo ===============================================================
pause
