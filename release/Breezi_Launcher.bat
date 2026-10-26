@echo off
title Breezi Launcher
cd /d "%~dp0"

echo [Breezi Launcher] Dang khoi chay he thong...

:: 1. Uu tien khoi chay qua Electron neu da co san
if exist "node_modules\.bin\electron.cmd" (
    start "" "node_modules\.bin\electron.cmd" --no-sandbox .
    exit /b
)

where electron >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" electron --no-sandbox .
    exit /b
)

:: 2. Neu co Python (Windows 10/11 thuong co san), khoi chay che do App Window sieu nhanh (< 0.2s)
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" /b python launcher_server.py
    exit /b
)

where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" /b py launcher_server.py
    exit /b
)

:: 3. Neu co Node/NPM
where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" npm start
    exit /b
)

:: 4. Chay truc tiep bang Microsoft Edge / Chrome che do Desktop App (Khong can cai bat ky runtime nao)
where msedge >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" msedge --app="%~dp0index.html" --window-size=1280,720
    exit /b
)

where chrome >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start "" chrome --app="%~dp0index.html" --window-size=1280,720
    exit /b
)

:: 5. Fallback mo tren trinh duyet mac dinh
start "" "%~dp0index.html"
exit /b
