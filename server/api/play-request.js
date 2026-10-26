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
  const clientVersion = (body && body.version) || '';
  console.log(`[Play Request] Client version: ${clientVersion} | DB status: ${db.status}`);

  // TH1: Máy chủ đang báo đợi bản cập nhật mới / bảo trì -> Chặn chơi
  if (db.status === 'maintenance') {
    res.status(200).json({
      allow: false,
      status: 'maintenance',
      message: db.maintenance_message || 'Máy chủ đang đợi bản cập nhật mới, hiện không thể vào game!'
    });
    return;
  }

  // TH2: Máy chủ báo có bản cập nhật mới -> Bắt buộc cập nhật trước khi chơi
  if (db.status === 'update_available') {
    res.status(200).json({
      allow: false,
      status: 'update_available',
      latest_version: db.latest_version,
      changelog: db.changelog,
      message: `Đã có bản cập nhật mới (${db.latest_version}). Vui lòng cập nhật trước khi vào game.`
    });
    return;
  }

  // TH3: Server OK -> Cho phép chơi
  res.status(200).json({
    allow: true,
    status: 'ok',
    message: 'Xác thực thành công. Cho phép khởi chạy game!'
  });
};
