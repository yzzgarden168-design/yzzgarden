# Windows 可执行版

## 直接运行

双击 `启动系统Pro.bat`。首次启动会在控制台显示临时管理员密码，数据写入 `runtime_data`。

## 构建 EXE

```powershell
python -m pip install pyinstaller
python build_windows.py
```

成品位于 `dist\园之助GEO增长系统.exe`。首次启动时，程序会自动打开浏览器；控制台窗口必须保持开启。业务数据保存在 EXE 同目录的 `runtime_data`，升级 EXE 不会覆盖数据。

正式部署建议预先配置：

- `AIGEO_ADMIN_USER`
- `AIGEO_ADMIN_PASSWORD`（至少 10 位）
- `AIGEO_SESSION_SECRET`（高强度随机值）
- `AIGEO_AI_API_KEY` / `AIGEO_AI_MODEL` / `AIGEO_AI_BASE_URL`（可选）

不要使用 `启动演示版.bat` 的演示账号和固定密钥承载真实数据。
