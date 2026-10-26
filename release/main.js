const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;

function getConfigPath() {
  return path.join(__dirname, 'config.ini');
}

function getLibDir() {
  return path.join(__dirname, 'lib');
}

function getBreeziExePath() {
  return path.join(getLibDir(), 'breezi.exe');
}

function getBreeziJsonPath() {
  return path.join(getLibDir(), 'breezi.json');
}

// Đọc cấu hình từ config.ini
function readConfig() {
  const cfgPath = getConfigPath();
  const config = {
    GamePath: '',
    ServerUrl: 'https://genshin-mod.vercel.app',
    AutoMinimize: 'true',
    BackgroundImage: 'https://raw.githubusercontent.com/Zeal-L/Honkai-Star-Rail-Wallpaper/main/Offcial/1313143.jpg',
    BackgroundVideo: 'https://raw.githubusercontent.com/adiambassador/wallpapers/main/honkai/march-7th-honkai-star-rail-adventure.1920x1080.mp4',
    LauncherTitle: 'Genshin Impact Mod x Tấn Cutos 1.0.2',
    BrandTitle: 'IMPACT',
    BrandSubtitle: 'MAY THIS JOURNEY LEAD US STARWARD',
    BadgeText: 'MOD x TẤN CUTOS',
    EventVideo: 'hutao.mp4',
    UseLoadLibrary: 'false'
  };

  if (fs.existsSync(cfgPath)) {
    try {
      const content = fs.readFileSync(cfgPath, 'utf-8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.substring(0, eqIdx).trim();
          const val = trimmed.substring(eqIdx + 1).trim();
          if (key) {
            config[key] = val;
          }
        }
      }
    } catch (e) {
      console.error('[Error] Không thể đọc config.ini:', e);
    }
  }

  return config;
}

// Đồng bộ cấu hình vào lib/breezi.json cho breezi.exe
function syncBreeziJson(gamePath, useLoadLibrary = false) {
  try {
    const jsonPath = getBreeziJsonPath();
    const payload = {
      target_path: gamePath || '',
      use_loadlibrary: useLoadLibrary === true || useLoadLibrary === 'true'
    };
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf-8');
    console.log('[Info] Đã cập nhật lib/breezi.json thành công:', payload);
  } catch (e) {
    console.error('[Error] Lỗi ghi lib/breezi.json:', e);
  }
}

// Ghi cấu hình vào config.ini
function writeConfig(data) {
  const current = readConfig();
  const updated = { ...current, ...data };
  const cfgPath = getConfigPath();

  const lines = [
    '; ==============================================================================',
    '; Breezi Launcher Configuration x Tấn Cutos',
    '; Cấu hình duy nhất cho cả Launcher và Breezi Injector',
    '; ==============================================================================',
    '',
    `; Đường dẫn tệp thực thi game (GenshinImpact.exe)`,
    `GamePath=${updated.GamePath || ''}`,
    '',
    `; Địa chỉ máy chủ xác thực và cập nhật`,
    `ServerUrl=${updated.ServerUrl || 'https://genshin-mod.vercel.app'}`,
    '',
    `; Tự động thu nhỏ launcher khi bấm Play (true / false)`,
    `AutoMinimize=${updated.AutoMinimize === 'true' || updated.AutoMinimize === true ? 'true' : 'false'}`,
    '',
    `; Đường dẫn trực tiếp (Direct URL) ảnh nền launcher`,
    `BackgroundImage=${updated.BackgroundImage || ''}`,
    '',
    `; Đường dẫn trực tiếp (Direct URL) video nền launcher`,
    `BackgroundVideo=${updated.BackgroundVideo || ''}`,
    '',
    `; Đường dẫn video thẻ sự kiện (.mp4 hoặc direct URL)`,
    `EventVideo=${updated.EventVideo || 'hutao.mp4'}`,
    '',
    `; Tiêu đề hiển thị trên thanh tiêu đề Launcher`,
    `LauncherTitle=${updated.LauncherTitle || 'Genshin Impact Mod x Tấn Cutos 1.0.2'}`,
    '',
    `; Tiêu đề thương hiệu`,
    `BrandTitle=${updated.BrandTitle || 'IMPACT'}`,
    `BrandSubtitle=${updated.BrandSubtitle || 'MAY THIS JOURNEY LEAD US STARWARD'}`,
    `BadgeText=${updated.BadgeText || 'MOD x TẤN CUTOS'}`,
    '',
    `; Tùy chọn nạp DLL (false = Manual Mapping tàng hình, true = LoadLibrary)`,
    `UseLoadLibrary=${updated.UseLoadLibrary === 'true' || updated.UseLoadLibrary === true ? 'true' : 'false'}`,
    ''
  ];

  fs.writeFileSync(cfgPath, lines.join('\n'), 'utf-8');

  // Luôn đồng bộ đồng thời sang lib/breezi.json
  syncBreeziJson(updated.GamePath, updated.UseLoadLibrary);

  return updated;
}

function createWindow() {
  const config = readConfig();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    minWidth: 1024,
    minHeight: 600,
    frame: false,
    show: false,
    backgroundColor: '#090a0f',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Cho phép nạp trực tiếp video/ảnh từ URL bên ngoài
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Tùy chọn mở devtools khi phát triển
  // mainWindow.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-config', async () => {
  return readConfig();
});

ipcMain.handle('save-config', async (event, data) => {
  try {
    const saved = writeConfig(data);
    return { success: true, config: saved };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('browse-game-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn tệp thực thi Game (GenshinImpact.exe hoặc StarRail.exe)',
    properties: ['openFile'],
    filters: [
      { name: 'Tệp thực thi Windows (*.exe)', extensions: ['exe'] },
      { name: 'Mọi tệp', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('launch-game', async () => {
  const config = readConfig();
  const gamePath = (config.GamePath || '').trim();

  if (!gamePath) {
    return {
      success: false,
      message: 'Chưa cấu hình đường dẫn game! Vui lòng nhấn vào biểu tượng bánh răng (⚙) để chọn tệp game.'
    };
  }

  const breeziExe = getBreeziExePath();
  if (!fs.existsSync(breeziExe)) {
    return {
      success: false,
      message: `Không tìm thấy tệp thực thi tại: ${breeziExe}`
    };
  }

  // Đảm bảo lib/breezi.json chứa đúng target_path trước khi chạy breezi.exe
  syncBreeziJson(gamePath, config.UseLoadLibrary);

  const libDir = getLibDir();
  console.log(`[Launch] Đang chạy breezi.exe tại thư mục: ${libDir}`);
  console.log(`[Launch] Mục tiêu game: ${gamePath}`);

  try {
    if (process.platform === 'win32') {
      const child = spawn(breeziExe, [], {
        cwd: libDir,
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    } else {
      // Trên Linux, thử chạy qua wine nếu có
      const hasWine = fs.existsSync('/usr/bin/wine') || fs.existsSync('/usr/local/bin/wine');
      if (hasWine) {
        const child = spawn('wine', ['breezi.exe'], {
          cwd: libDir,
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      } else {
        // Thông báo cho người dùng Linux hoặc mô phỏng lệnh
        console.log('[Notice] Hệ điều hành Linux phát hiện. File breezi.exe là PE Windows, cần Wine/Proton trên Windows/Linux.');
      }
    }

    if (config.AutoMinimize === 'true' || config.AutoMinimize === true) {
      if (mainWindow) {
        setTimeout(() => {
          mainWindow.minimize();
        }, 1500);
      }
    }

    return {
      success: true,
      message: 'Khởi chạy Breezi Injector thành công! Game đang được nạp...'
    };
  } catch (err) {
    console.error('[Launch Error]:', err);
    return {
      success: false,
      message: `Lỗi khi khởi chạy breezi.exe: ${err.message}`
    };
  }
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.close();
});

// 1. Kiểm tra trạng thái máy chủ
ipcMain.handle('check-server-status', async () => {
  const config = readConfig();
  const serverUrl = (config.ServerUrl || 'https://genshin-mod.vercel.app').replace(/\/+$/, '');
  try {
    const res = await fetch(`${serverUrl}/api/status`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { connected: true, ...data };
  } catch (err) {
    return { connected: false, message: `Không thể kết nối đến máy chủ (${err.message})` };
  }
});

// 2. Gửi yêu cầu quyền chơi game đến máy chủ
ipcMain.handle('request-play', async () => {
  const config = readConfig();
  const serverUrl = (config.ServerUrl || 'https://genshin-mod.vercel.app').replace(/\/+$/, '');
  try {
    const res = await fetch(`${serverUrl}/api/play-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 'v1.0.2' }),
      signal: AbortSignal.timeout(4000)
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return {
      allow: false,
      status: 'error',
      message: `Lỗi kết nối máy chủ xác thực: ${err.message}`
    };
  }
});

// 3. Tải bản cập nhật mới nhất (breezi.dll và breezi.exe)
ipcMain.handle('download-update', async () => {
  const config = readConfig();
  const serverUrl = (config.ServerUrl || 'https://genshin-mod.vercel.app').replace(/\/+$/, '');
  const libDir = getLibDir();
  const filesToDownload = ['breezi.dll', 'breezi.exe'];

  try {
    for (const filename of filesToDownload) {
      const fileUrl = `${serverUrl}/api/download/${filename}`;
      const destPath = path.join(libDir, filename);
      console.log(`[Update] Đang tải ${fileUrl} vào ${destPath}...`);

      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`Tải ${filename} thất bại (HTTP ${res.status})`);

      const total = parseInt(res.headers.get('content-length') || '0', 10);
      const fileStream = fs.createWriteStream(destPath);
      let received = 0;

      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fileStream.write(value);
        received += value.length;

        const percent = total > 0 ? Math.round((received / total) * 100) : 0;
        if (mainWindow) {
          mainWindow.webContents.send('update-progress', {
            filename,
            percent,
            received,
            total
          });
        }
      }
      fileStream.end();
      await new Promise(r => fileStream.on('finish', r));
      console.log(`[Update] Đã tải xong ${filename}`);
    }

    return {
      success: true,
      message: 'Đã tải và cập nhật thành công breezi.dll và breezi.exe mới nhất!'
    };
  } catch (err) {
    console.error('[Update Error]:', err);
    return {
      success: false,
      message: `Lỗi cập nhật: ${err.message}`
    };
  }
});
