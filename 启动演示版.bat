@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动园之助 GEO 演示环境...
python --version >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Python，请先安装 Python 3.10 或更高版本。
  pause
  exit /b 1
)
set "AIGEO_HOST=127.0.0.1"
set "AIGEO_PORT=8767"
set "AIGEO_DATA_DIR=%~dp0runtime_demo"
set "AIGEO_ADMIN_USER=demo"
set "AIGEO_ADMIN_PASSWORD=Demo-Only-Password-9082"
set "AIGEO_SESSION_SECRET=local-demo-session-secret-not-for-production"
set "AIGEO_DEMO_MODE=1"
set "AIGEO_COOKIE_SECURE=0"
python production_server.py
echo.
echo 服务已停止。按任意键关闭窗口。
pause >nul
