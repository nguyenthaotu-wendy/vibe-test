# Đập Chim Cánh Cụt

Mini game phản xạ 30 giây trên trình duyệt, chủ đề "Đêm cực quang Bắc Cực", dùng tại các sự kiện.

| Thư mục / file | Nội dung |
|---|---|
| `app/` | Code game: `index.html`, `style.css`, `game.js` |
| `design/` | Design system: `tokens.css`, logo |
| `docs/` | Tài liệu thiết kế (mở `docs/index.html`) |
| `server/` | Server Node.js nhỏ phục vụ `app/` và `design/` |
| `YEU-CAU.md` | Yêu cầu gốc |

## Cách chạy bằng Docker

**Cần có:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (đã kèm Docker Compose).

1. Mở terminal ở thư mục gốc của dự án (nơi có `compose.yaml`).
2. Build và khởi động:

   ```bash
   docker compose up -d --build
   ```

3. Mở trình duyệt: **http://localhost:3000**

### Lệnh thường dùng

| Việc cần làm | Lệnh |
|---|---|
| Xem trạng thái (cột STATUS hiện `healthy` là ổn) | `docker compose ps` |
| Xem log | `docker compose logs -f app` |
| Dừng game | `docker compose down` |
| Cập nhật sau khi sửa code | `docker compose up -d --build` |

### Ghi chú

- Image chỉ chứa `server/`, `app/` và `design/`. Server dùng module có sẵn của Node.js, không cần cài gói nào.
- Đổi cổng trên máy: sửa dòng `"3000:3000"` trong `compose.yaml`, ví dụ `"8080:3000"` rồi mở http://localhost:8080.
- Kiểm tra server còn sống: http://localhost:3000/healthz trả về `ok`.
- Bảng điểm cao và tuỳ chọn âm thanh lưu trong trình duyệt (localStorage), không lưu trên server.
- Phông Baloo 2 tải từ Google Fonts. Khi máy không có mạng, game dùng phông dự phòng.

## Chạy không cần Docker

Cần Node.js 20 trở lên:

```bash
node server/server.js
```
