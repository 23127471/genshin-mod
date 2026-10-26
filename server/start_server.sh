#!/usr/bin/env bash
# ==============================================================================
# Start Breezi Auth & Update Server
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[INFO] Khởi chạy Breezi Update & Auth Server..."
node server.js
