# Đập Chim Cánh Cụt

Mini game phản xạ 30 giây trên trình duyệt, chủ đề "Đêm cực quang Bắc Cực", dùng tại các sự kiện.
Bản chạy Docker có thêm **đăng ký người chơi** (họ tên, email, số điện thoại) và **trang quản trị** `/admin`.

| Thư mục / file | Nội dung |
|---|---|
| `app/` | Code game: `index.html`, `style.css`, `game.js` (có form đăng ký khi chạy cùng server) |
| `admin/` | Trang quản trị: đăng nhập, danh sách người chơi, tìm kiếm, xoá, xuất CSV |
| `design/` | Design system: `tokens.css`, logo |
| `docs/` | Tài liệu thiết kế (mở `docs/index.html`) |
| `server/` | Server Node.js: phục vụ game, API đăng ký, API quản trị, kết nối PostgreSQL |
| `compose.yaml` | 2 dịch vụ: `app` (Node.js) và `db` (PostgreSQL 16) |
| `.env.example` | Mẫu cấu hình mật khẩu database và admin |
| `YEU-CAU.md` | Yêu cầu gốc |

## Cách chạy bằng Docker

**Cần có:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (đã kèm Docker Compose).

1. Mở terminal ở thư mục gốc của dự án (nơi có `compose.yaml`).
2. Tạo file cấu hình từ mẫu:

   ```bash
   cp .env.example .env
   ```

3. Mở `.env`, đổi `POSTGRES_PASSWORD` và `ADMIN_PASSWORD` thành mật khẩu riêng. Mật khẩu admin **tối thiểu 12 ký tự**, nếu không server sẽ không khởi động. Không commit file `.env`.
4. Build và khởi động:

   ```bash
   docker compose up -d --build
   ```

5. Mở trình duyệt:
   - Game: **http://localhost:3000**
   - Trang quản trị: **http://localhost:3000/admin**, đăng nhập bằng `ADMIN_USER` / `ADMIN_PASSWORD` trong `.env`

### Lệnh thường dùng

| Việc cần làm | Lệnh |
|---|---|
| Xem trạng thái (cả `app` và `db` hiện `healthy` là ổn) | `docker compose ps` |
| Xem log | `docker compose logs -f app` |
| Dừng game, **giữ** dữ liệu | `docker compose down` |
| Dừng game và **xoá hết** dữ liệu người chơi | `docker compose down -v` |
| Cập nhật sau khi sửa code | `docker compose up -d --build` |
| Sao lưu database ra file | `docker exec dap-chim-canh-cut-db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > sao-luu.sql` |

### Ghi chú

- Dữ liệu người chơi nằm trong volume Docker `dap-chim-canh-cut_du-lieu-db`, còn nguyên khi tạo lại container. Database không mở cổng ra máy, chỉ dịch vụ `app` kết nối được.
- Email và số điện thoại đều không được trùng. Người chơi cũ nhập lại đúng cả email và số điện thoại thì dùng lại hồ sơ cũ.
- Nội dung điều khoản đồng ý hiện là **nội dung giữ chỗ**. Trước khi dùng thật, đặt biến `NOI_DUNG_DIEU_KHOAN` và `PHIEN_BAN_DIEU_KHOAN` (xem `server/lib/api.js`, docs QT-13).
- Khi chạy sau HTTPS (máy chủ thật, ngrok), đặt `COOKIE_SECURE=1` trong `.env`.
- File CSV xuất từ trang quản trị chứa dữ liệu cá nhân: lưu giữ an toàn, xoá khi hết mục đích.
- Đổi cổng trên máy: sửa dòng `"3000:3000"` trong `compose.yaml`, ví dụ `"8080:3000"` rồi mở http://localhost:8080.
- Kiểm tra server còn sống: http://localhost:3000/healthz trả về `ok` (trả 503 khi không kết nối được database).
- Bảng điểm cao trên máy và tuỳ chọn âm thanh vẫn lưu trong trình duyệt (localStorage).
- Link GitHub Pages là bản tĩnh, không có server nên **không có đăng ký**, game chơi như bản v1.
- Phông Baloo 2 tải từ Google Fonts. Khi máy không có mạng, game dùng phông dự phòng.
