@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动园之助 AIGEO 优化与监控系统...
where python >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Python，请先安装 Python 3.10 或更高版本。
  pause
  exit /b 1
)
start "" "http://127.0.0.1:8765"
python aigeo_server.py
pause
