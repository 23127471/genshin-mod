const { getDatabase } = require('../lib/db');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Parse body nếu có POST request
  let body = req.body;
  if (req.method === 'POST') {
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
  }

  const query = req.query || {};
  const clientHashes = (body && body.client_hashes) || {};

  const clientExeHash = (query.exe_hash || clientHashes['breezi.exe'] || '').trim().toLowerCase();
  const clientDllHash = (query.dll_hash || clientHashes['breezi.dll'] || '').trim().toLowerCase();

  const db = getDatabase();
  const serverFiles = db.files || {};
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

  // Xác định trạng thái trả về cho từng người chơi cụ thể:
  // 1. Nếu admin bật bảo trì toàn hệ thống -> maintenance
  // 2. Nếu người chơi có file bị lệch mã băm (chưa cập nhật) -> update_available
  // 3. Nếu người chơi đã có đủ mã băm mới nhất -> ok
  let effectiveStatus = db.status;
  let needsUpdate = false;

  if (db.status === 'maintenance') {
    effectiveStatus = 'maintenance';
  } else if (outdated.length > 0) {
    effectiveStatus = 'update_available';
    needsUpdate = true;
  } else {
    effectiveStatus = 'ok';
    needsUpdate = false;
  }

  res.status(200).json({
    status: effectiveStatus,
    needs_update: needsUpdate,
    outdated_files: outdated,
    server_global_status: db.status,
    latest_version: db.latest_version,
    maintenance_message: db.maintenance_message,
    changelog: db.changelog,
    updated_at: db.updated_at,
    files: serverFiles
  });
};
