#!/usr/bin/env python3
"""
Breezi Launcher - Python Web Server & Bridge
Cho phép chạy Launcher siêu nhanh qua trình duyệt hoặc làm backend cục bộ.
"""

import http.server
import socketserver
import os
import sys
import json
import webbrowser
import subprocess

PORT = 4879
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LIB_DIR = os.path.join(BASE_DIR, 'lib')
CONFIG_PATH = os.path.join(BASE_DIR, 'config.ini')
BREEZI_EXE = os.path.join(LIB_DIR, 'breezi.exe')
BREEZI_JSON = os.path.join(LIB_DIR, 'breezi.json')

def read_config():
    config = {
        "GamePath": "",
        "AutoMinimize": "true",
        "BackgroundImage": "https://raw.githubusercontent.com/Zeal-L/Honkai-Star-Rail-Wallpaper/main/Offcial/1313143.jpg",
        "BackgroundVideo": "https://raw.githubusercontent.com/adiambassador/wallpapers/main/honkai/march-7th-honkai-star-rail-adventure.1920x1080.mp4",
        "EventVideo": "hutao.mp4",
        "LauncherTitle": "Genshin Impact Mod x Tấn Cutos 1.0.2",
        "BrandTitle": "IMPACT",
        "BrandSubtitle": "MAY THIS JOURNEY LEAD US STARWARD",
        "BadgeText": "MOD x TẤN CUTOS",
        "UseLoadLibrary": "false"
    }
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith(';') or line.startswith('#'):
                        continue
                    if '=' in line:
                        k, v = line.split('=', 1)
                        config[k.strip()] = v.strip()
        except Exception as e:
            print(f"[Error] Đọc config.ini: {e}")
    return config

def sync_breezi_json(game_path, use_loadlibrary=False):
    try:
        data = {
            "target_path": game_path or "",
            "use_loadlibrary": str(use_loadlibrary).lower() in ("true", "1")
        }
        with open(BREEZI_JSON, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"[Sync] Đã cập nhật {BREEZI_JSON}")
    except Exception as e:
        print(f"[Error] Ghi lib/breezi.json: {e}")

def write_config(data):
    current = read_config()
    current.update(data)
    lines = [
        "; ==============================================================================",
        "; Breezi Launcher Configuration x Tấn Cutos",
        "; Cấu hình duy nhất cho cả Launcher và Breezi Injector",
        "; ==============================================================================",
        "",
        "; Đường dẫn tệp thực thi game (GenshinImpact.exe)",
        f"GamePath={current.get('GamePath', '')}",
        "",
        "; Tự động thu nhỏ launcher khi bấm Play (true / false)",
        f"AutoMinimize={'true' if str(current.get('AutoMinimize')).lower() in ('true', '1') else 'false'}",
        "",
        "; Đường dẫn trực tiếp (Direct URL) ảnh nền launcher",
        f"BackgroundImage={current.get('BackgroundImage', '')}",
        "",
        "; Đường dẫn trực tiếp (Direct URL) video nền launcher",
        f"BackgroundVideo={current.get('BackgroundVideo', '')}",
        "",
        "; Đường dẫn video thẻ sự kiện (.mp4 hoặc direct URL)",
        f"EventVideo={current.get('EventVideo', 'hutao.mp4')}",
        "",
        "; Tiêu đề hiển thị trên thanh tiêu đề Launcher",
        f"LauncherTitle={current.get('LauncherTitle', 'Genshin Impact Mod x Tấn Cutos 1.0.2')}",
        "",
        "; Tiêu đề thương hiệu",
        f"BrandTitle={current.get('BrandTitle', 'IMPACT')}",
        f"BrandSubtitle={current.get('BrandSubtitle', 'MAY THIS JOURNEY LEAD US STARWARD')}",
        f"BadgeText={current.get('BadgeText', 'MOD x TẤN CUTOS')}",
        "",
        "; Tùy chọn nạp DLL (false = Manual Mapping tàng hình, true = LoadLibrary)",
        f"UseLoadLibrary={'true' if str(current.get('UseLoadLibrary')).lower() in ('true', '1') else 'false'}",
        ""
    ]
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    sync_breezi_json(current.get('GamePath', ''), current.get('UseLoadLibrary', False))
    return current

class LauncherHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        if self.path == '/api/config':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(read_config()).encode('utf-8'))
            return
        elif self.path == '/api/browse':
            selected = self.pick_file()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"path": selected or ""}).encode('utf-8'))
            return
        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/save-config':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            try:
                data = json.loads(body)
                saved = write_config(data)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "config": saved}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
            return
        elif self.path == '/api/launch':
            res = self.launch_breezi()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode('utf-8'))
            return
        self.send_error(404)

    def pick_file(self):
        # Hỗ trợ mở File Dialog trên Windows PowerShell hoặc Linux zenity
        if sys.platform == 'win32':
            ps_cmd = (
                "[System.Reflection.Assembly]::LoadWithPartialName('System.windows.forms') | Out-Null; "
                "$f = New-Object System.Windows.Forms.OpenFileDialog; "
                "$f.Filter = 'Game Executable (*.exe)|*.exe|All files (*.*)|*.*'; "
                "if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.FileName }"
            )
            try:
                out = subprocess.check_output(["powershell", "-Command", ps_cmd]).decode().strip()
                return out
            except Exception:
                return None
        elif sys.platform.startswith('linux'):
            try:
                out = subprocess.check_output(["zenity", "--file-selection", "--file-filter=Game (*.exe) | *.exe"]).decode().strip()
                return out
            except Exception:
                return None
        return None

    def launch_breezi(self):
        config = read_config()
        game_path = config.get('GamePath', '').strip()
        if not game_path:
            return {
                "success": False,
                "message": "Chưa cấu hình đường dẫn game! Vui lòng chọn tệp game trước khi chơi."
            }
        if not os.path.exists(BREEZI_EXE):
            return {
                "success": False,
                "message": f"Không tìm thấy tệp {BREEZI_EXE}"
            }

        sync_breezi_json(game_path, config.get('UseLoadLibrary', False))

        try:
            if sys.platform == 'win32':
                subprocess.Popen([BREEZI_EXE], cwd=LIB_DIR, creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP)
            else:
                if os.path.exists('/usr/bin/wine'):
                    subprocess.Popen(['wine', 'breezi.exe'], cwd=LIB_DIR)
                else:
                    print(f"[Linux Info] Cần Wine để chạy breezi.exe: {BREEZI_EXE}")
            return {
                "success": True,
                "message": "Khởi chạy Breezi Injector thành công!"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Lỗi khởi chạy: {str(e)}"
            }

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), LauncherHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"==================================================")
        print(f"  Breezi Launcher Server đang chạy tại: {url}")
        print(f"==================================================")
        try:
            webbrowser.open(url)
        except Exception:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã tắt Launcher Server.")

if __name__ == '__main__':
    run()
