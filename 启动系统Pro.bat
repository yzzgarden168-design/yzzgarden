@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动园之助 GEO Growth OS...
python --version >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Python，请先安装 Python 3.10 或更高版本。
  pause
  exit /b 1
)
set "AIGEO_HOST=127.0.0.1"
set "AIGEO_PORT=8765"
set "AIGEO_DATA_DIR=%~dp0runtime_data"
set "AIGEO_DEMO_MODE=0"
set "AIGEO_COOKIE_SECURE=0"
python production_server.py
echo.
echo 服务已停止。按任意键关闭窗口。
pause >nul
