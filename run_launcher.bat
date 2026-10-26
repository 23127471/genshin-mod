@echo off
title Breezi Launcher
cd /d "%~dp0"

echo [INFO] Dang kiem tra moi truong khoi chay...

if exist "node_modules\.bin\electron.cmd" (
    echo [INFO] Khoi chay Electron Launcher...
    start "" "node_modules\.bin\electron.cmd" .
    exit /b
)

where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Khoi chay qua npm start...
    start "" npm start
    exit /b
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Khoi chay qua Python Launcher Server...
    start "" python launcher_server.py
    exit /b
)

echo [INFO] Mo index.html tren trinh duyet...
start "" index.html
