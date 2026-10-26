/**
 * Breezi Auth & Update Server (Local & Development Runner)
 * Đồng bộ 100% với môi trường Vercel Serverless
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('./lib/db');

// Import các Serverless Handler từ thư mục api/
const handleStatus = require('./api/status');
const handlePlayRequest = require('./api/play-request');
const handleDownload = require('./api/download');
const handleUpload = require('./api/upload');
const handleAdminStatus = require('./api/admin-status');

const PUBLIC_DIR = path.join(__dirname, 'public');

/**
 * Polyfill helper để tương thích với Serverless Function trên Vercel
 */
function wrapResponse(res) {
  if (!res.status) {
    res.status = function (code) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = function (data) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(data));
      return res;
    };
  }
  if (!res.send) {
    res.send = function (data) {
      if (typeof data === 'object') return res.json(data);
      res.end(data);
      return res;
    };
  }
  return res;
}

const server = http.createServer(async (req, res) => {
  wrapResponse(res);

  // Parse URL & Query params bằng chuẩn WHATWG
  const host = req.headers.host || 'localhost:5000';
  const reqUrl = new URL(req.url, `http://${host}`);
  const pathname = reqUrl.pathname;
  req.query = Object.fromEntries(reqUrl.searchParams);

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Phục vụ giao diện Quản trị Admin
  if (pathname === '/admin' || pathname === '/admin/' || pathname === '/' || pathname === '/admin.html') {
    const adminPath = path.join(PUBLIC_DIR, 'admin.html');
    if (fs.existsSync(adminPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(adminPath).pipe(res);
      return;
    }
  }

  // 2. API: Kiểm tra trạng thái Server (GET /api/status)
  if (pathname === '/api/status') {
    return handleStatus(req, res);
  }

  // 3. API: Yêu cầu quyền chơi game từ Launcher (POST /api/play-request)
  if (pathname === '/api/play-request') {
    return handlePlayRequest(req, res);
  }

  // 4. API: Tải tệp cập nhật mới nhất (GET /api/download hoặc /api/download/:file)
  if (pathname === '/api/download' || pathname.startsWith('/api/download/')) {
    return handleDownload(req, res);
  }

  // 5. API: Upload tệp mới nhất với Chunking (POST /api/upload)
  if (pathname === '/api/upload') {
    return handleUpload(req, res);
  }

  // 6. API: Quản trị viên cập nhật trạng thái (POST /api/admin-status hoặc POST /api/admin/set-status)
  if (pathname === '/api/admin-status' || pathname === '/api/admin/set-status') {
    return handleAdminStatus(req, res);
  }

  // Fallback 404
  res.status(404).json({
    error: 'Endpoint không tồn tại',
    pathname
  });
});

const db = getDatabase();
const PORT = process.env.PORT || db.port || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  Breezi Auth & Update Server đang chạy tại port: ${PORT}`);
  console.log(`  Trạng thái máy chủ: ${db.status}`);
  console.log(`  Trang quản trị (Admin UI): http://localhost:${PORT}/admin`);
  console.log(`=======================================================`);
});
