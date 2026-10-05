"""Build the self-contained Windows release with PyInstaller."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
ASSETS = [
    "index_v3.html", "login.html", "app_v3.js", "login.js", "styles_v3.css",
]


def main():
    missing = [name for name in ASSETS if not (ROOT / name).is_file()]
    if missing:
        raise SystemExit("缺少发布资源：" + ", ".join(missing))
    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        raise SystemExit("未安装 PyInstaller。请先执行：python -m pip install pyinstaller")
    separator = ";" if sys.platform == "win32" else ":"
    command = [
        sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean",
        "--name", "园之助GEO增长系统", "--console", "--onefile",
    ]
    for name in ASSETS:
        command.extend(["--add-data", f"{ROOT / name}{separator}."])
    command.append(str(ROOT / "production_server.py"))
    subprocess.run(command, cwd=ROOT, check=True)
    print(f"发布完成：{ROOT / 'dist' / '园之助GEO增长系统.exe'}")


if __name__ == "__main__":
    main()
