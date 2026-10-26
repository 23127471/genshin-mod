const fs = require('fs');
const { getLatestFileInfo, getDatabase } = require('../lib/db');

module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Lấy filename từ query string hoặc URL
  let filename = (req.query && req.query.file) || '';
  if (!filename) {
    const urlParts = (req.url || '').split('?')[0].split('/');
    filename = urlParts[urlParts.length - 1];
  }
  filename = filename.trim();

  if (!['breezi.dll', 'breezi.exe'].includes(filename)) {
    res.status(403).send('Tệp yêu cầu không hợp lệ. Chỉ chấp nhận breezi.dll và breezi.exe');
    return;
  }

  // 1. Kiểm tra nếu có link CDN trực tiếp từ Vercel Blob
  const db = getDatabase();
  const fileMeta = db.files && db.files[filename];
  if (fileMeta && fileMeta.blobUrl) {
    console.log(`[Download] Chuyển hướng ${filename} đến Vercel Blob CDN: ${fileMeta.blobUrl}`);
    res.writeHead(302, { Location: fileMeta.blobUrl });
    res.end();
    return;
  }

  const fileInfo = getLatestFileInfo(filename);
  if (!fileInfo.exists || !fileInfo.filePath) {
    res.status(404).send(`Tệp ${filename} chưa được tải lên cơ sở dữ liệu.`);
    return;
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', fileInfo.size);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  console.log(`[Download] Đang truyền file ${filename} (${(fileInfo.size / 1024 / 1024).toFixed(2)} MB)...`);
  const stream = fs.createReadStream(fileInfo.filePath);
  stream.pipe(res);
};
