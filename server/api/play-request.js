const { getDatabase } = require('../lib/db');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Phương thức không hợp lệ' });
    return;
  }

  // Parse body nếu là raw http request hoặc Vercel handler
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) {}
  } else if (!body) {
    body = await new Promise(resolve => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (_) { resolve({}); }
      });
    });
  }

  const db = getDatabase();
  const serverFiles = db.files || {};
  const clientVersion = (body && body.version) || '';
  const clientHashes = (body && body.client_hashes) || {};

  const clientExeHash = (clientHashes['breezi.exe'] || '').trim().toLowerCase();
  const clientDllHash = (clientHashes['breezi.dll'] || '').trim().toLowerCase();

  const outdated = [];

  // So sánh SHA-256 của breezi.exe
  if (serverFiles['breezi.exe'] && serverFiles['breezi.exe'].sha256) {
    const srvExeHash = serverFiles['breezi.exe'].sha256.toLowerCase();
    if (!clientExeHash || clientExeHash !== srvExeHash) {
      outdated.push('breezi.exe');
    }
  }

  // So sánh SHA-256 của breezi.dll
  if (serverFiles['breezi.dll'] && serverFiles['breezi.dll'].sha256) {
    const srvDllHash = serverFiles['breezi.dll'].sha256.toLowerCase();
    if (!clientDllHash || clientDllHash !== srvDllHash) {
      outdated.push('breezi.dll');
    }
  }

  console.log(`[Play Request] Client version: ${clientVersion} | Outdated files: ${outdated.join(', ') || 'None'} | DB status: ${db.status}`);

  // TH1: Máy chủ đang bật bảo trì toàn hệ thống -> Chặn chơi
  if (db.status === 'maintenance') {
    res.status(200).json({
      allow: false,
      status: 'maintenance',
      message: db.maintenance_message || 'Máy chủ đang đợi bản cập nhật mới, hiện không thể vào game!'
    });
    return;
  }

  // TH2: Phát hiện tệp của người chơi chưa khớp mã băm mới nhất -> Bắt buộc cập nhật
  if (outdated.length > 0) {
    const fileListStr = outdated.join(' và ');
    res.status(200).json({
      allow: false,
      status: 'update_available',
      needs_update: true,
      outdated_files: outdated,
      latest_version: db.latest_version,
      changelog: db.changelog,
      message: `Phát hiện ${fileListStr} trên máy bạn chưa đúng bản mới nhất từ máy chủ (mã SHA-256 không khớp). Vui lòng nhấn CẬP NHẬT trước khi vào game.`
    });
    return;
  }

  // TH3: Server OK & Mã băm khớp hoàn toàn -> Cho phép chơi
  res.status(200).json({
    allow: true,
    status: 'ok',
    needs_update: false,
    message: 'Xác thực mã băm SHA-256 thành công. Cho phép khởi chạy game!'
  });
};
