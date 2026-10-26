const { getDatabase, saveDatabase } = require('../lib/db');
const { checkAdminAuth } = require('../lib/auth');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Chỉ chấp nhận POST' });
    return;
  }

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

  // Kiểm tra xác thực quyền Admin
  if (!checkAdminAuth(req, body)) {
    res.status(401).json({ success: false, error: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn!' });
    return;
  }

  const { status, latest_version, maintenance_message, changelog } = body;
  const db = getDatabase();

  if (status && ['ok', 'maintenance', 'update_available'].includes(status)) {
    db.status = status;
  }
  if (latest_version) db.latest_version = latest_version.trim();
  if (maintenance_message) db.maintenance_message = maintenance_message.trim();
  if (changelog) db.changelog = changelog.trim();

  saveDatabase(db);
  console.log(`[Admin] Cập nhật trạng thái máy chủ: ${db.status} | Phiên bản: ${db.latest_version}`);

  res.status(200).json({
    success: true,
    config: db
  });
};
