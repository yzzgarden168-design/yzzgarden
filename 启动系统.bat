@echo off
chcp 65001 >nul
title 园之助AIGEO监控系统

echo.
echo ==========================================
echo    🌳 园之助AIGEO监控系统
echo ==========================================
echo.
echo 正在启动监控系统...
echo.

cd /d "%~dp0"

start index.html

echo.
echo ✅ 监控系统已启动！
echo.
echo 如果浏览器没有自动打开，请手动打开 index.html 文件
echo.
echo 按任意键关闭此窗口...
pause >nul