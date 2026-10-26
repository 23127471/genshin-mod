#!/bin/bash
cd "$(dirname "$0")"

echo "[Breezi Launcher] Dang khoi chay..."

if [ -f "node_modules/.bin/electron" ]; then
    ./node_modules/.bin/electron --no-sandbox .
    exit 0
fi

if command -v electron &> /dev/null; then
    electron --no-sandbox .
    exit 0
fi

if command -v python3 &> /dev/null; then
    python3 launcher_server.py
    exit 0
fi

xdg-open index.html 2>/dev/null || sensible-browser index.html 2>/dev/null
