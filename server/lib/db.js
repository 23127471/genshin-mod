const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// Xác định môi trường chạy (Vercel Serverless hay Local Machine)
const IS_VERCEL = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Đường dẫn lưu trữ: Trên Vercel sử dụng /tmp, trên local dùng thư mục dự án
const STORAGE_DIR = IS_VERCEL
  ? path.join(os.tmpdir(), 'breezi_storage')
  : path.resolve(__dirname, '..', 'latest');

const DB_FILE = IS_VERCEL
  ? path.join(os.tmpdir(), 'breezi_db.json')
  : path.resolve(__dirname, '..', 'server_config.json');

const CHUNKS_DIR = path.join(os.tmpdir(), 'breezi_chunks');

// Đảm bảo các thư mục lưu trữ tồn tại
function ensureDirs() {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
  if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });

  // Nếu trên Vercel chưa có db file thì khởi tạo từ template local nếu có
  if (IS_VERCEL && !fs.existsSync(DB_FILE)) {
    const templatePath = path.resolve(__dirname, '..', 'server_config.json');
    if (fs.existsSync(templatePath)) {
      try {
        fs.copyFileSync(templatePath, DB_FILE);
      } catch (_) {}
    }
  }
}
ensureDirs();

function getDefaultConfig() {
  return {
    port: 5000,
    status: 'ok',
    latest_version: 'v1.0.3',
    maintenance_message: 'Máy chủ đang đợi bản cập nhật mới, hiện không thể vào game.',
    changelog: 'Cập nhật bản vá v1.0.3 mới nhất cho breezi.dll và breezi.exe',
    updated_at: new Date().toISOString(),
    files: {}
  };
}

function getDatabase() {
  ensureDirs();
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('[DB] Lỗi đọc database:', e.message);
  }
  const def = getDefaultConfig();
  saveDatabase(def);
  return def;
}

function saveDatabase(data) {
  ensureDirs();
  try {
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[DB] Lỗi ghi database:', e.message);
    return false;
  }
}

let vercelBlob = null;
try {
  vercelBlob = require('@vercel/blob');
} catch (_) {}

/**
 * Lưu file mới nhất và tự động XÓA bản cũ (chỉ lưu duy nhất bản mới nhất)
 */
async function saveLatestFile(filename, buffer) {
  ensureDirs();
  const allowed = ['breezi.dll', 'breezi.exe'];
  if (!allowed.includes(filename)) {
    throw new Error(`File ${filename} không hợp lệ. Chỉ chấp nhận breezi.dll và breezi.exe`);
  }

  const targetPath = path.join(STORAGE_DIR, filename);

  // 1. Xóa bản cũ trên disk/tmp nếu đã tồn tại để giải phóng dung lượng (chỉ lưu 1 bản duy nhất)
  if (fs.existsSync(targetPath)) {
    try {
      fs.unlinkSync(targetPath);
      console.log(`[DB] Đã xóa bản cũ trên disk của ${filename}`);
    } catch (e) {
      console.warn(`[DB] Cảnh báo khi dọn file cũ ${filename}:`, e.message);
    }
  }

  // 2. Ghi file mới nhất vào database storage
  fs.writeFileSync(targetPath, buffer);

  // 3. Tính toán SHA-256 hash và dung lượng
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const size = buffer.length;

  const db = getDatabase();
  if (!db.files) db.files = {};

  // 4. Hỗ trợ Vercel Blob Storage nếu có BLOB_READ_WRITE_TOKEN
  let blobUrl = null;
  if (process.env.BLOB_READ_WRITE_TOKEN && vercelBlob) {
    try {
      if (db.files[filename] && db.files[filename].blobUrl) {
        console.log(`[Vercel Blob] Xóa bản cũ trên Blob CDN: ${db.files[filename].blobUrl}`);
        await vercelBlob.del(db.files[filename].blobUrl);
      }
      console.log(`[Vercel Blob] Tải bản mới nhất của ${filename} lên Blob CDN...`);
      const blobResult = await vercelBlob.put(`latest/${filename}`, buffer, {
        access: 'public',
        addRandomSuffix: false
      });
      blobUrl = blobResult.url;
      console.log(`[Vercel Blob] Upload thành công CDN URL: ${blobUrl}`);
    } catch (blobErr) {
      console.warn(`[Vercel Blob] Cảnh báo lỗi Blob storage:`, blobErr.message);
    }
  }

  // 5. Cập nhật metadata trong database (Ghi đè bản ghi cũ, chỉ lưu duy nhất bản mới nhất)
  db.files[filename] = {
    filename,
    size,
    sha256: hash,
    updated_at: new Date().toISOString(),
    blobUrl: blobUrl || (db.files[filename] ? db.files[filename].blobUrl : null),
    download_url: `/api/download?file=${filename}`
  };

  saveDatabase(db);
  console.log(`[DB] Đã lưu thành công bản mới nhất của ${filename} (${(size / 1024 / 1024).toFixed(2)} MB, hash: ${hash.substring(0, 10)}...)`);

  return db.files[filename];
}

/**
 * Lấy thông tin và đường dẫn file mới nhất để tải về
 */
function getLatestFileInfo(filename) {
  ensureDirs();
  const targetPath = path.join(STORAGE_DIR, filename);

  if (fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    return {
      exists: true,
      filePath: targetPath,
      size: stat.size
    };
  }

  // Fallback: Kiểm tra thư mục server/latest nếu ở local
  const localFallback = path.resolve(__dirname, '..', 'latest', filename);
  if (fs.existsSync(localFallback)) {
    const stat = fs.statSync(localFallback);
    return {
      exists: true,
      filePath: localFallback,
      size: stat.size
    };
  }

  return { exists: false, filePath: null, size: 0 };
}

/**
 * Quản lý Chunked Upload (giúp upload file lớn > 45MB mà không bị lỗi 4.5MB Payload limit của Vercel)
 */
function saveChunk(uploadId, chunkIndex, totalChunks, chunkBuffer) {
  ensureDirs();
  const chunkFile = path.join(CHUNKS_DIR, `${uploadId}_chunk_${chunkIndex}`);
  fs.writeFileSync(chunkFile, chunkBuffer);
  return { success: true, chunkIndex };
}

async function assembleChunks(uploadId, filename, totalChunks) {
  ensureDirs();
  const chunks = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkFile = path.join(CHUNKS_DIR, `${uploadId}_chunk_${i}`);
    if (!fs.existsSync(chunkFile)) {
      throw new Error(`Thiếu chunk số ${i} trong quá trình tải lên!`);
    }
    chunks.push(fs.readFileSync(chunkFile));
  }

  // Nối các chunk thành 1 file hoàn chỉnh
  const completeBuffer = Buffer.concat(chunks);

  // Xóa dọn dẹp các chunk tạm thời
  for (let i = 0; i < totalChunks; i++) {
    const chunkFile = path.join(CHUNKS_DIR, `${uploadId}_chunk_${i}`);
    try { fs.unlinkSync(chunkFile); } catch (_) {}
  }

  // Lưu file bản mới nhất và cập nhật database
  return await saveLatestFile(filename, completeBuffer);
}

module.exports = {
  getDatabase,
  saveDatabase,
  saveLatestFile,
  getLatestFileInfo,
  saveChunk,
  assembleChunks,
  STORAGE_DIR,
  IS_VERCEL
};
