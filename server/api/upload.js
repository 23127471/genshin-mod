const { saveChunk, assembleChunks, saveLatestFile, getDatabase, saveDatabase } = require('../lib/db');

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

  const { action, uploadId, filename, chunkIndex, totalChunks, chunkData, newVersion, changelog } = body;

  try {
    // 1. Nhận từng chunk (giúp vượt qua giới hạn 4.5MB payload của Vercel)
    if (action === 'chunk') {
      if (!uploadId || chunkIndex === undefined || !chunkData) {
        res.status(400).json({ error: 'Thiếu dữ liệu chunk (uploadId, chunkIndex, chunkData)' });
        return;
      }

      const chunkBuffer = Buffer.from(chunkData, 'base64');
      saveChunk(uploadId, chunkIndex, totalChunks, chunkBuffer);

      res.status(200).json({
        success: true,
        chunkIndex,
        receivedBytes: chunkBuffer.length,
        message: `Đã nhận chunk ${chunkIndex + 1}/${totalChunks}`
      });
      return;
    }

    // 2. Nối tất cả các chunk và lưu bản mới nhất vào Database (tự xóa bản cũ)
    if (action === 'assemble') {
      if (!uploadId || !filename || !totalChunks) {
        res.status(400).json({ error: 'Thiếu tham số ghép file (uploadId, filename, totalChunks)' });
        return;
      }

      console.log(`[Upload] Bắt đầu ghép ${totalChunks} chunks cho file ${filename}...`);
      const fileRecord = await assembleChunks(uploadId, filename, totalChunks);

      // Nếu quản trị viên cung cấp version mới hoặc changelog, cập nhật luôn vào DB
      const db = getDatabase();
      if (newVersion) db.latest_version = newVersion.trim();
      if (changelog) db.changelog = changelog.trim();
      db.status = 'update_available'; // Tự chuyển trạng thái sang "Đã có bản cập nhật mới"
      saveDatabase(db);

      res.status(200).json({
        success: true,
        file: fileRecord,
        status: db.status,
        latest_version: db.latest_version,
        message: `Đã tải lên và lưu thành công bản mới nhất của ${filename} vào Database (Bản cũ đã được xóa)!`
      });
      return;
    }

    // 3. Hỗ trợ upload trực tiếp nếu file nhỏ (< 4MB như breezi.exe)
    if (action === 'direct' && filename && chunkData) {
      const buffer = Buffer.from(chunkData, 'base64');
      const fileRecord = await saveLatestFile(filename, buffer);

      const db = getDatabase();
      if (newVersion) db.latest_version = newVersion.trim();
      if (changelog) db.changelog = changelog.trim();
      saveDatabase(db);

      res.status(200).json({
        success: true,
        file: fileRecord,
        message: `Đã lưu bản mới nhất của ${filename} vào Database!`
      });
      return;
    }

    res.status(400).json({ error: 'Action không hợp lệ. Sử dụng "chunk", "assemble" hoặc "direct"' });
  } catch (err) {
    console.error('[Upload Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
