const crypto = require('crypto');

const ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASS || '05082005';
const SECRET_KEY = process.env.ADMIN_SECRET || 'breezi_super_secret_20050805';

/**
 * Tạo token xác thực cho quản trị viên
 */
function generateToken() {
  return crypto.createHmac('sha256', SECRET_KEY).update(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`).digest('hex');
}

/**
 * Kiểm tra xem request có token quản trị viên hợp lệ không
 */
function checkAdminAuth(req, body = null) {
  const expectedToken = generateToken();

  // 1. Kiểm tra Authorization header (Bearer <token>)
  const authHeader = req.headers && (req.headers['authorization'] || req.headers['Authorization']);
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === expectedToken) return true;
  }

  // 2. Kiểm tra header x-admin-token
  const customHeader = req.headers && (req.headers['x-admin-token'] || req.headers['X-Admin-Token']);
  if (customHeader && customHeader.trim() === expectedToken) return true;

  // 3. Kiểm tra query param ?token=
  if (req.query && req.query.token === expectedToken) return true;

  // 4. Kiểm tra body nếu có field token
  if (body && body.token === expectedToken) return true;

  return false;
}

module.exports = {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  generateToken,
  checkAdminAuth
};
