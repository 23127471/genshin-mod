const { ADMIN_USERNAME, ADMIN_PASSWORD, generateToken } = require('../lib/auth');

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

  const { username, password } = body || {};

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = generateToken();
    console.log(`[Auth] Đăng nhập quản trị viên thành công: ${username}`);
    res.status(200).json({
      success: true,
      token,
      message: 'Đăng nhập thành công!',
      user: { username: ADMIN_USERNAME }
    });
  } else {
    console.warn(`[Auth] Đăng nhập thất bại với tài khoản: ${username}`);
    res.status(401).json({
      success: false,
      error: 'Tên đăng nhập hoặc mật khẩu không chính xác!'
    });
  }
};
