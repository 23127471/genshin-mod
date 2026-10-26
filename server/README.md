# Breezi Auth & Update Server (Vercel Serverless Edition)

Hệ thống máy chủ phân phối bản cập nhật và xác thực khởi chạy mod **Breezi (Genshin Impact Mod)**, được tối ưu hóa đặc biệt để triển khai trên nền tảng **Vercel Serverless**.

---

## 🚀 Tính Năng Chính

1. **Chuẩn Vercel Serverless Functions**:
   - Thư mục `api/` chứa các endpoint độc lập: `/api/status`, `/api/play-request`, `/api/download`, `/api/upload`, `/api/admin-status`.
   - Cấu hình sẵn trong [`vercel.json`](file:///home/tantayen/Reverse%20App/breezi-v1.0.2/server/vercel.json) với thời gian chờ 60s và RAM 1024MB cho tác vụ tải/ghép file.

2. **Giao diện Quản trị Admin Hiện Đại (`/admin`)**:
   - Tông màu Dark Gold HoYoverse đồng bộ với Launcher.
   - Cho phép chọn 3 chế độ máy chủ:
     - 🟢 **Cho phép chơi (OK)**
     - 🟡 **Đợi cập nhật mới (Bảo trì - Chặn chơi)**
     - 🔵 **Đã có bản cập nhật mới (Bắt buộc cập nhật)**
   - **Khu vực tải lên `breezi.dll` (~43.5MB) và `breezi.exe` (~1.17MB)**.

3. **Cơ Chế Chunked Upload (Vượt giới hạn 4.5MB của Vercel)**:
   - Vercel giới hạn body tối đa 4.5MB cho mỗi request.
   - Client tự động cắt nhỏ file thành các khối 2.5MB và gửi tuần tự.
   - Server nhận đủ các phần sẽ ghép lại thành file hoàn chỉnh.

4. **Nguyên Tắc "Chỉ Lưu Bản Upload Mới Nhất"**:
   - Khi tải lên phiên bản mới của `breezi.dll` hoặc `breezi.exe`, hệ thống sẽ **tự động xóa bản cũ** trên ổ đĩa / Blob CDN.
   - Database metadata chỉ lưu duy nhất 1 bản ghi mới nhất cho từng file (kèm kích thước, hash SHA-256 và thời gian cập nhật).

5. **Tùy Chọn Tích Hợp Vercel Blob CDN (Khuyên dùng)**:
   - Nếu bạn kích hoạt Vercel Blob trong dự án Vercel (`BLOB_READ_WRITE_TOKEN`), các tệp tải lên sẽ được chuyển lên hạ tầng CDN toàn cầu của Vercel.
   - Launcher sẽ được chuyển hướng (HTTP 302) để tải trực tiếp từ CDN với băng thông tối đa và không tốn tài nguyên Serverless.

---

## 🛠️ Hướng Dẫn Triển Khai Lên Vercel

### Cách 1: Triển khai qua GitHub (Đơn giản nhất)

1. Đẩy thư mục `server/` (hoặc toàn bộ repo) lên GitHub của bạn.
2. Truy cập [vercel.com](https://vercel.com) và đăng nhập.
3. Nhấn **"Add New Project"** -> Chọn Repository GitHub của bạn.
4. Nếu repo chứa cả Launcher và Server, tại mục **Root Directory**, nhấn `Edit` và chọn thư mục `server`.
5. Nhấn **Deploy**.
6. Sau khi deploy xong, bạn sẽ nhận được đường dẫn như: `https://your-project.vercel.app`.

### Cách 2: Triển khai trực tiếp bằng Vercel CLI

```bash
# Cài đặt Vercel CLI (nếu chưa có)
npm install -g vercel

# Di chuyển vào thư mục server
cd server

# Đăng nhập và triển khai
vercel
```

---

## ⚡ Bật Vercel Blob CDN (Để lưu file vĩnh viễn trên Cloud)

Trên Vercel Serverless, thư mục tạm `/tmp` chỉ tồn tại trong vòng đời của container. Để lưu trữ file tải lên vĩnh viễn:

1. Vào Dashboard của Project trên Vercel.
2. Chọn tab **Storage** -> Nhấn **Create Database** -> Chọn **Blob**.
3. Đặt tên (ví dụ: `breezi-storage`) và bấm **Create**.
4. Biến môi trường `BLOB_READ_WRITE_TOKEN` sẽ được Vercel tự động liên kết với dự án.
5. Từ lúc này, mỗi khi bạn vào `/admin` và upload `breezi.dll` hoặc `breezi.exe`, server sẽ tự đẩy lên Blob CDN và xóa bản cũ!

---

## 💻 Chạy Thử Nghiệm Tại Máy Cục Bộ (Local)

Bạn hoàn toàn có thể chạy máy chủ ngay trên máy của mình để kiểm tra trước khi deploy:

```bash
cd server
node server.js
```

- **Giao diện quản trị Admin**: [http://localhost:5000/admin](http://localhost:5000/admin)
- **API Trạng thái**: [http://localhost:5000/api/status](http://localhost:5000/api/status)
- **Tải tệp**: [http://localhost:5000/api/download?file=breezi.dll](http://localhost:5000/api/download?file=breezi.dll)

---

## 🔗 Cấu Hình Launcher Kết Nối Đến Vercel

Mở file [`config.ini`](file:///home/tantayen/Reverse%20App/breezi-v1.0.2/config.ini) của Launcher và trỏ `ServerUrl` về link Vercel của bạn:

```ini
[Launcher]
ServerUrl = https://your-project.vercel.app
GamePath = C:\Program Files\Genshin Impact\Genshin Impact game\GenshinImpact.exe
AutoMinimize = true
```
