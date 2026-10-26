@echo off
cd /d "%~dp0"
title Breezi Launcher x Tan Cutos

:: 1. Uu tien chay qua Electron neu da co san
if exist "node_modules\.bin\electron.cmd" (
    start "" "node_modules\.bin\electron.cmd" --no-sandbox .
    exit /b
)

:: 2. Khoi chay Native Windows Engine qua PowerShell (Co san 100% tren Windows 10/11)
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0launcher_engine.ps1"
exit /b
