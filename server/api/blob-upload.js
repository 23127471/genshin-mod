const { handleUpload } = require('@vercel/blob/client');
const { checkAdminAuth } = require('../lib/auth');
const { getBlobToken } = require('../lib/db');

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
    res.status(405).json({ error: 'Phương thức không hợp lệ' });
    return;
  }

  // Parse body
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

  // Kiểm tra xác thực Admin
  if (!checkAdminAuth(req, body)) {
    res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn' });
    return;
  }

  const activeToken = getBlobToken();
  if (!activeToken) {
    res.status(400).json({
      error: 'Chưa cấu hình BLOB_READ_WRITE_TOKEN! Vui lòng nhập token vào ô cài đặt trên trang Admin.'
    });
    return;
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      token: activeToken,
      onBeforeGenerateToken: async (pathname) => {
        console.log('[Vercel Blob] Đang tạo token tải lên cho file:', pathname);
        return {
          maximumSizeInBytes: 250 * 1024 * 1024, // 250 MB
          addRandomSuffix: true
        };
      }
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('[Blob Upload Error]:', error.message);
    return res.status(400).json({ error: error.message });
  }
};
