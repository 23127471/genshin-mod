/**
 * Breezi Launcher - Frontend Renderer Logic
 * Hỗ trợ cả Electron IPC và Python HTTP API
 */

// Sound effect synthesizer via Web Audio API
const audioCtx = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;

function playSfx(type = 'click') {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.05);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'launch') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.18);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    // Ignore audio error
  }
}

// State
let currentConfig = {
  GamePath: '',
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

// DOM Elements
const bgVideo = document.getElementById('bgVideo');
const bgVideoSource = document.getElementById('bgVideoSource');
const bgImage = document.getElementById('bgImage');
const promoCardVideo = document.getElementById('promoCardVideo');
const promoCardVideoSource = document.getElementById('promoCardVideoSource');

const launcherTitleText = document.getElementById('launcherTitleText');
const brandTitleText = document.getElementById('brandTitleText');
const brandSubtitleText = document.getElementById('brandSubtitleText');
const badgeText = document.getElementById('badgeText');
const displayGameExe = document.getElementById('displayGameExe');

const btnSettings = document.getElementById('btnSettings');
const btnQuickMenu = document.getElementById('btnQuickMenu');
const btnMinimize = document.getElementById('btnMinimize');
const btnClose = document.getElementById('btnClose');
const btnPlay = document.getElementById('btnPlay');

const settingsModal = document.getElementById('settingsModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const btnSaveConfig = document.getElementById('btnSaveConfig');
const btnCancelConfig = document.getElementById('btnCancelConfig');
const btnBrowseGame = document.getElementById('btnBrowseGame');

const cfgGamePath = document.getElementById('cfgGamePath');
const cfgAutoMinimize = document.getElementById('cfgAutoMinimize');

const engineStatusText = document.getElementById('engineStatusText');
const readinessStatusText = document.getElementById('readinessStatusText');
const toastContainer = document.getElementById('toastContainer');

// Universal API Adapter (Electron or Web Server)
const api = {
  async getConfig() {
    if (window.electronAPI && window.electronAPI.getConfig) {
      return await window.electronAPI.getConfig();
    }
    const res = await fetch('/api/config');
    return await res.json();
  },
  async saveConfig(data) {
    if (window.electronAPI && window.electronAPI.saveConfig) {
      return await window.electronAPI.saveConfig(data);
    }
    const res = await fetch('/api/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },
  async browseGamePath() {
    if (window.electronAPI && window.electronAPI.browseGamePath) {
      return await window.electronAPI.browseGamePath();
    }
    const res = await fetch('/api/browse');
    const data = await res.json();
    return data.path;
  },
  async launchGame() {
    if (window.electronAPI && window.electronAPI.launchGame) {
      return await window.electronAPI.launchGame();
    }
    const res = await fetch('/api/launch', { method: 'POST' });
    return await res.json();
  },
  async checkServerStatus() {
    if (window.electronAPI && window.electronAPI.checkServerStatus) {
      return await window.electronAPI.checkServerStatus();
    }
    const res = await fetch('https://genshin-mod.vercel.app/api/status');
    return await res.json();
  },
  async requestPlay() {
    if (window.electronAPI && window.electronAPI.requestPlay) {
      return await window.electronAPI.requestPlay();
    }
    const res = await fetch('https://genshin-mod.vercel.app/api/play-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 'v1.0.2' })
    });
    return await res.json();
  },
  async downloadUpdate() {
    if (window.electronAPI && window.electronAPI.downloadUpdate) {
      return await window.electronAPI.downloadUpdate();
    }
    return { success: false, message: 'Cập nhật tự động chỉ hỗ trợ trên ứng dụng Electron.' };
  },
  onUpdateProgress(callback) {
    if (window.electronAPI && window.electronAPI.onUpdateProgress) {
      window.electronAPI.onUpdateProgress(callback);
    }
  },
  minimize() {
    if (window.electronAPI && window.electronAPI.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  },
  close() {
    if (window.electronAPI && window.electronAPI.closeWindow) {
      window.electronAPI.closeWindow();
    } else {
      window.close();
    }
  }
};

// Toast notification helper
function showToast(message, type = 'success', duration = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Cập nhật giao diện từ đối tượng cấu hình
function applyConfig(cfg) {
  currentConfig = { ...currentConfig, ...cfg };

  // 1. Tiêu đề
  if (currentConfig.LauncherTitle) {
    launcherTitleText.textContent = currentConfig.LauncherTitle;
    document.title = currentConfig.LauncherTitle;
  }
  if (currentConfig.BrandTitle) brandTitleText.textContent = currentConfig.BrandTitle;
  if (currentConfig.BrandSubtitle) brandSubtitleText.textContent = currentConfig.BrandSubtitle;
  if (currentConfig.BadgeText) badgeText.textContent = currentConfig.BadgeText;

  // 2. Đường dẫn thực thi game
  if (currentConfig.GamePath && currentConfig.GamePath.trim()) {
    const parts = currentConfig.GamePath.replace(/\\/g, '/').split('/');
    const exeName = parts[parts.length - 1] || currentConfig.GamePath;
    displayGameExe.textContent = exeName;
    displayGameExe.title = currentConfig.GamePath;
    displayGameExe.style.color = '#fad67b';
  } else {
    displayGameExe.textContent = 'Chưa chọn (Nhấn ⚙ để cấu hình)';
    displayGameExe.style.color = '#9ba3b8';
  }

  // 3. Ảnh nền
  if (currentConfig.BackgroundImage && currentConfig.BackgroundImage.trim()) {
    bgImage.style.backgroundImage = `url('${currentConfig.BackgroundImage.trim()}')`;
  }

  // 4. Video nền (Direct Link)
  if (currentConfig.BackgroundVideo && currentConfig.BackgroundVideo.trim()) {
    const vUrl = currentConfig.BackgroundVideo.trim();
    if (bgVideoSource.src !== vUrl) {
      bgVideoSource.src = vUrl;
      bgVideo.load();
      bgVideo.play().catch(e => {
        console.log('[Notice] Không thể tự phát video nền:', e.message);
      });
    }
  }

  // 5. Video thẻ sự kiện (Event Card Video)
  const eventUrl = (currentConfig.EventVideo || 'hutao.mp4').trim();
  if (eventUrl) {
    if (promoCardVideoSource.getAttribute('src') !== eventUrl) {
      promoCardVideoSource.src = eventUrl;
      promoCardVideo.load();
      promoCardVideo.play().catch(e => {
        console.log('[Notice] Không thể tự phát video sự kiện:', e.message);
      });
    }
  }

  // Đồng bộ form modal (chỉ cấu hình game path)
  if (cfgGamePath) cfgGamePath.value = currentConfig.GamePath || '';
  if (cfgAutoMinimize) cfgAutoMinimize.checked = currentConfig.AutoMinimize === 'true' || currentConfig.AutoMinimize === true;
}

// Server State Management
let serverState = {
  status: 'ok',
  latest_version: 'v1.0.3',
  maintenance_message: 'Máy chủ đang đợi bản cập nhật mới, hiện không thể vào game.',
  changelog: ''
};
let isUpdating = false;

function applyServerStatus(info) {
  serverState = { ...serverState, ...info };
  const btnText = btnPlay.querySelector('.btn-play-text') || btnPlay;
  const dot = document.querySelector('.status-indicator-dot');

  if (serverState.status === 'maintenance') {
    btnText.textContent = 'BẢO TRÌ';
    btnPlay.classList.add('btn-maintenance');
    btnPlay.classList.remove('btn-update');
    engineStatusText.textContent = serverState.maintenance_message || 'Máy chủ đang đợi bản cập nhật mới (Không thể vào game)';
    readinessStatusText.textContent = 'Trạng thái: Đợi cập nhật';
    readinessStatusText.style.color = '#f59e0b';
    if (dot) {
      dot.style.background = '#f59e0b';
      dot.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.8)';
    }
  } else if (serverState.status === 'update_available') {
    btnText.textContent = 'CẬP NHẬT';
    btnPlay.classList.add('btn-update');
    btnPlay.classList.remove('btn-maintenance');
    engineStatusText.textContent = `Đã có bản cập nhật mới (${serverState.latest_version || 'Mới nhất'})`;
    readinessStatusText.textContent = 'Trạng thái: Cần cập nhật';
    readinessStatusText.style.color = '#60a5fa';
    if (dot) {
      dot.style.background = '#3b82f6';
      dot.style.boxShadow = '0 0 8px rgba(59, 130, 246, 0.8)';
    }
  } else {
    if (!isUpdating) {
      btnText.textContent = 'PLAY';
      btnPlay.classList.remove('btn-maintenance', 'btn-update');
      engineStatusText.textContent = 'Game Engine Ready (Injector Connected)';
      readinessStatusText.textContent = 'Trạng thái: Sẵn sàng';
      readinessStatusText.style.color = 'var(--text-yellow)';
      if (dot) {
        dot.style.background = '#10b981';
        dot.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.8)';
      }
    }
  }
}

// Khởi tạo và nạp cấu hình ban đầu
async function initLauncher() {
  try {
    const cfg = await api.getConfig();
    if (cfg) applyConfig(cfg);
  } catch (err) {
    console.error('[Init Error]:', err);
    showToast('Lỗi nạp cấu hình config.ini', 'error');
  }

  // Lắng nghe tiến trình tải cập nhật file từ server
  api.onUpdateProgress((data) => {
    const { filename, percent, received, total } = data;
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = `${percent}%`;
    const btnText = btnPlay.querySelector('.btn-play-text') || btnPlay;
    btnText.textContent = `TẢI ${percent}%`;
    engineStatusText.textContent = `Đang tải ${filename}: ${percent}% (${(received/1024/1024).toFixed(1)}MB / ${(total/1024/1024).toFixed(1)}MB)`;
  });

  // Kiểm tra trạng thái máy chủ
  async function checkServer() {
    try {
      const res = await api.checkServerStatus();
      if (res && res.connected !== false) {
        applyServerStatus(res);
      }
    } catch (_) {}
  }

  checkServer();
  setInterval(checkServer, 4000);
}

// Quản lý Modal Cài đặt
function openSettings() {
  playSfx('click');
  settingsModal.classList.add('open');
}

function closeSettings() {
  playSfx('click');
  settingsModal.classList.remove('open');
}

btnSettings.addEventListener('click', openSettings);
btnQuickMenu.addEventListener('click', openSettings);
modalCloseBtn.addEventListener('click', closeSettings);
btnCancelConfig.addEventListener('click', closeSettings);

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings();
});

// Duyệt file game
btnBrowseGame.addEventListener('click', async () => {
  playSfx('click');
  try {
    const selected = await api.browseGamePath();
    if (selected) {
      cfgGamePath.value = selected;
    }
  } catch (e) {
    console.error(e);
  }
});

// Lưu cấu hình (chỉ cập nhật đường dẫn game, giữ nguyên ảnh và video trong config.ini)
btnSaveConfig.addEventListener('click', async () => {
  playSfx('click');
  btnSaveConfig.disabled = true;
  btnSaveConfig.textContent = 'Đang lưu...';

  const newConfig = {
    ...currentConfig,
    GamePath: cfgGamePath.value.trim(),
    AutoMinimize: cfgAutoMinimize ? (cfgAutoMinimize.checked ? 'true' : 'false') : currentConfig.AutoMinimize
  };

  try {
    const res = await api.saveConfig(newConfig);
    if (res.success || res.config) {
      applyConfig(res.config || newConfig);
      showToast('Đã lưu cấu hình thành công!');
      closeSettings();
    } else {
      showToast(`Lỗi lưu: ${res.error || 'Thất bại'}`, 'error');
    }
  } catch (e) {
    showToast(`Lỗi: ${e.message}`, 'error');
  } finally {
    btnSaveConfig.disabled = false;
    btnSaveConfig.textContent = 'Lưu cấu hình';
  }
});

// Chuyển Tab (Events / Notices / Info)
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    playSfx('click');
    const target = btn.dataset.tab;

    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const pane = document.getElementById(`tab-${target}`);
    if (pane) pane.classList.add('active');
  });
});

// Xử lý nút PLAY / CẬP NHẬT / BẢO TRÌ
btnPlay.addEventListener('click', async () => {
  // TH1: Người dùng nhấn "CẬP NHẬT" khi server báo đã có bản cập nhật mới
  if (serverState.status === 'update_available') {
    playSfx('launch');
    if (isUpdating) return;
    isUpdating = true;
    btnPlay.style.pointerEvents = 'none';

    const btnText = btnPlay.querySelector('.btn-play-text') || btnPlay;
    btnText.textContent = 'ĐANG TẢI...';
    engineStatusText.textContent = `Đang kết nối máy chủ để tải breezi.dll và breezi.exe mới nhất...`;
    showToast(`Bắt đầu tải bản cập nhật ${serverState.latest_version}...`, 'info');

    try {
      const res = await api.downloadUpdate();
      if (res.success) {
        showToast(res.message, 'success', 6000);
        serverState.status = 'ok';
        applyServerStatus({ status: 'ok' });
        const progressFill = document.getElementById('progressFill');
        if (progressFill) progressFill.style.width = '100%';
      } else {
        showToast(res.message, 'error', 6000);
      }
    } catch (err) {
      showToast(`Lỗi tải cập nhật: ${err.message}`, 'error');
    } finally {
      isUpdating = false;
      btnPlay.style.pointerEvents = 'auto';
    }
    return;
  }

  // TH2: Máy chủ đang đợi cập nhật mới / bảo trì -> KHÔNG CHO CHƠI
  if (serverState.status === 'maintenance') {
    playSfx('click');
    const msg = serverState.maintenance_message || 'Máy chủ đang đợi bản cập nhật mới, hiện không thể vào game!';
    showToast(msg, 'error', 5000);
    engineStatusText.textContent = msg;
    readinessStatusText.textContent = 'Trạng thái: Đợi cập nhật';
    return;
  }

  // TH3: Người dùng nhấn PLAY -> Gửi yêu cầu xác thực đến máy chủ trước khi chạy
  playSfx('launch');

  if (!currentConfig.GamePath || !currentConfig.GamePath.trim()) {
    showToast('Chưa cấu hình đường dẫn game! Vui lòng chọn tệp game trước.', 'error');
    openSettings();
    cfgGamePath.focus();
    return;
  }

  btnPlay.style.pointerEvents = 'none';
  btnPlay.style.filter = 'brightness(0.85)';
  engineStatusText.textContent = 'Đang gửi yêu cầu xác thực đến máy chủ...';
  readinessStatusText.textContent = 'Trạng thái: Xác thực...';

  try {
    const perm = await api.requestPlay();

    // Nếu máy chủ từ chối
    if (!perm.allow) {
      if (perm.status === 'maintenance') {
        applyServerStatus({ status: 'maintenance', maintenance_message: perm.message });
        showToast(perm.message || 'Máy chủ đang đợi bản cập nhật mới, không thể chơi!', 'error', 6000);
      } else if (perm.status === 'update_available') {
        applyServerStatus({ status: 'update_available', latest_version: perm.latest_version, changelog: perm.changelog });
        showToast(perm.message || 'Đã có bản cập nhật mới! Nhấn CẬP NHẬT để tải file mới về máy.', 'info', 6000);
      } else {
        showToast(perm.message || 'Máy chủ từ chối yêu cầu khởi chạy.', 'error', 5000);
      }
      return;
    }

    // Máy chủ chấp thuận (Server OK) -> Cho phép chạy file lib/breezi.exe
    engineStatusText.textContent = 'Máy chủ xác thực thành công. Đang khởi chạy Breezi...';
    readinessStatusText.textContent = 'Trạng thái: Đang khởi chạy';
    readinessStatusText.style.color = '#10b981';

    const result = await api.launchGame();
    if (result.success) {
      showToast(result.message || 'Đã khởi chạy Breezi thành công!', 'success', 5000);
      engineStatusText.textContent = 'Breezi đã gắn kết vào game (Active)';
      readinessStatusText.textContent = 'Trạng thái: Hoạt động';
    } else {
      showToast(result.message || 'Lỗi khởi chạy game', 'error', 5000);
      engineStatusText.textContent = 'Game Engine Ready (Injector Connected)';
      readinessStatusText.textContent = 'Trạng thái: Sẵn sàng';
      readinessStatusText.style.color = 'var(--text-yellow)';
      if (result.message && result.message.includes('Chưa cấu hình')) {
        openSettings();
      }
    }
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, 'error');
    engineStatusText.textContent = 'Game Engine Ready (Injector Connected)';
    readinessStatusText.textContent = 'Trạng thái: Sẵn sàng';
  } finally {
    setTimeout(() => {
      btnPlay.style.pointerEvents = 'auto';
      btnPlay.style.filter = '';
    }, 2000);
  }
});

// Điều khiển cửa sổ
btnMinimize.addEventListener('click', () => {
  playSfx('click');
  api.minimize();
});

btnClose.addEventListener('click', () => {
  playSfx('click');
  api.close();
});

// Khởi chạy
initLauncher();
