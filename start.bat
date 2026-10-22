@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title ☕ Smart Coffee Management - All-in-One Launcher

echo =====================================================================
echo    ☕ SMART COFFEE MANAGEMENT & AI SYSTEM - AUTO LAUNCHER
echo =====================================================================
echo.

:: 1. Xác định đường dẫn thư mục backend và frontend
set "ROOT_DIR=%~dp0"
if exist "%ROOT_DIR%Cafe\backend" (
    set "ROOT_DIR=%ROOT_DIR%Cafe\"
)

set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

:: 2. Kiểm tra cài đặt Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Không tìm thấy Python trong hệ thống!
    echo Vui lòng cài đặt Python 3.10+ và tích chọn "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

:: 3. Kiểm tra cài đặt Node.js
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Không tìm thấy Node.js / npm trong hệ thống!
    echo Vui lòng cài đặt Node.js 18+ từ https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 4. Tự động kiểm tra & Setup Backend
echo [*] Đang kiểm tra môi trường Backend...
if not exist "%BACKEND_DIR%\.env" (
    if exist "%BACKEND_DIR%\.env.example" (
        copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" > nul
        echo   -> Đã tạo backend\.env từ file mẫu.
    )
)

if not exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
    echo [*] Đang tạo môi trường ảo Python (.venv)...
    python -m venv "%BACKEND_DIR%\.venv"
    echo [*] Đang cài đặt các thư viện Python (requirements.txt)...
    "%BACKEND_DIR%\.venv\Scripts\python.exe" -m pip install --upgrade pip
    "%BACKEND_DIR%\.venv\Scripts\python.exe" -m pip install -r "%BACKEND_DIR%\requirements.txt"
)

:: 5. Tự động kiểm tra & Setup Frontend
echo [*] Đang kiểm tra môi trường Frontend...
if not exist "%FRONTEND_DIR%\.env" (
    if exist "%FRONTEND_DIR%\.env.example" (
        copy "%FRONTEND_DIR%\.env.example" "%FRONTEND_DIR%\.env" > nul
        echo   -> Đã tạo frontend\.env từ file mẫu.
    )
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo [*] Đang cài đặt thư viện Frontend (npm install)...
    cd /d "%FRONTEND_DIR%"
    call npm install
)

echo.
echo =====================================================================
echo    🚀 ĐANG KHỞI ĐỘNG CẢ BACKEND VÀ FRONTEND...
echo =====================================================================
echo.
echo   [1] Backend API:  http://127.0.0.1:5000 (Flask RESTful)
echo   [2] Frontend App: http://localhost:3000 (React Vite SPA)
echo.
echo   Tài khoản đăng nhập:
echo     - Quản trị:  admin          / password123 (SUPER_ADMIN)
echo     - Quản lý:   manager_sontay / password123 (BRANCH_MANAGER)
echo     - Thu ngân:  staff_sontay1  / password123 (STAFF)
echo.
echo =====================================================================

:: Khởi động Flask Backend trong cửa sổ riêng
start "☕ Smart Coffee - Backend API (Port 5000)" cmd /k "cd /d "%BACKEND_DIR%" && call .venv\Scripts\activate.bat && set PYTHONIOENCODING=utf-8 && python run.py"

:: Chờ 2 giây để backend khởi tạo
timeout /t 2 /nobreak > nul

:: Khởi động React Vite Frontend trong cửa sổ riêng
start "☕ Smart Coffee - Frontend UI (Port 3000)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

:: Chờ 3 giây rồi mở thẳng trình duyệt
timeout /t 3 /nobreak > nul
start http://localhost:3000

echo [*] Cả Backend và Frontend đã được khởi chạy thành công!
echo [*] Trình duyệt đang được mở tại http://localhost:3000
echo [*] Nhấn phím bất kỳ để đóng cửa sổ này.
pause > nul
