@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动园之助 GEO 完整模拟系统...
where python >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Python，请先安装 Python 3.10 或更高版本。
  pause
  exit /b 1
)
set "AIGEO_HOST=127.0.0.1"
set "AIGEO_PORT=8767"
set "AIGEO_DATA_DIR=%~dp0runtime_data"
set "AIGEO_ADMIN_USER=testadmin"
set "AIGEO_ADMIN_PASSWORD=Test-Only-Password-9082"
set "AIGEO_SESSION_SECRET=yuanzhizhu-local-demo-session-secret-2026"
set "AIGEO_DEMO_MODE=1"
set "AIGEO_COOKIE_SECURE=0"
start "" "http://127.0.0.1:8767"
python production_server.py
echo.
echo 服务已停止。按任意键关闭窗口。
pause >nul
