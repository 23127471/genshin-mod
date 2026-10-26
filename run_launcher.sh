#!/usr/bin/env bash
# ==============================================================================
# Breezi Launcher Starter (Linux / Cross-Platform)
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f "./node_modules/.bin/electron" ]; then
    echo "[INFO] Khởi chạy Breezi Electron Launcher (Native UI)..."
    ./node_modules/.bin/electron --no-sandbox .
elif command -v npm &>/dev/null; then
    echo "[INFO] Khởi chạy qua npm start..."
    npm start
elif command -v python3 &>/dev/null; then
    echo "[INFO] Khởi chạy qua Python Web Launcher Server..."
    python3 launcher_server.py
else
    echo "[INFO] Mở index.html..."
    xdg-open index.html
fi
