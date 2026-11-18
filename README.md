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

## Deploy miễn phí: Render + Neon (có gắn tên miền)

Không cần Google Cloud, không cần nạp tiền. Server chạy trên **Render** (gói Free, dùng `Dockerfile` và `render.yaml` có sẵn), database là **Neon** (PostgreSQL gói Free).

**Hạn chế của gói miễn phí:** server Render "ngủ" sau khoảng 15 phút không có ai vào, người đầu tiên vào sau đó chờ 30–60 giây. Database Neon cũng tự ngủ khi rảnh. Dữ liệu người chơi nằm trên máy chủ của Render và Neon (chọn vùng Singapore). Giới hạn gói miễn phí do hai dịch vụ quyết định và có thể thay đổi.

### 1. Tạo database trên Neon
1. Vào https://neon.tech, đăng ký hoặc đăng nhập (bằng GitHub được), chọn gói **Free**.
2. **Create project**: đặt tên `dap-chim-canh-cut`, chọn PostgreSQL **16**, vùng **AWS Asia Pacific (Singapore)**.
3. Ở màn hình **Connection details**, chọn **Pooled connection** và copy chuỗi dạng `postgresql://…neon.tech/neondb?sslmode=require`. **Không gửi chuỗi này cho ai**, nó chứa mật khẩu database.

### 2. Tạo web service trên Render
1. Vào https://render.com, đăng ký hoặc đăng nhập bằng GitHub, cho phép Render đọc repo `vibe-test`.
2. **New → Blueprint**, chọn repo `vibe-test`, nhánh `feat/deploy-render`. Render đọc `render.yaml` và đề xuất dịch vụ `dap-chim-canh-cut` (gói Free, vùng Singapore).
3. Render hỏi các biến chưa có giá trị:
   - `DATABASE_URL`: dán chuỗi kết nối Neon ở bước 1.
   - `NOI_DUNG_DIEU_KHOAN`: nội dung điều khoản thật (hoặc để trống tạm thời → dùng nội dung giữ chỗ).
4. Bấm **Apply**. Render build `Dockerfile` (vài phút) rồi chạy. Thấy trạng thái **Live** là xong, link dạng `https://dap-chim-canh-cut.onrender.com`.
5. **Mật khẩu admin**: Render tự tạo chuỗi ngẫu nhiên cho `ADMIN_PASSWORD`. Xem ở **Render → dịch vụ → Environment**. Tên đăng nhập là `quantri`.

### 3. Gắn tên miền
1. Render → dịch vụ → **Settings → Custom Domains → Add**: nhập ví dụ `game.tenmien.vn`.
2. Ở nơi quản lý DNS của tên miền, tạo bản ghi theo hướng dẫn Render hiển thị:
   - Tên miền con: **CNAME** `game` → `dap-chim-canh-cut.onrender.com`
   - Tên miền gốc: bản ghi **A** về IP Render cung cấp (hoặc ALIAS/ANAME nếu nhà cung cấp hỗ trợ)
3. Chờ DNS cập nhật, Render báo **Verified** và tự cấp chứng chỉ HTTPS. Mở `https://game.tenmien.vn`.

### 4. Kiểm tra sau khi chạy
- `https://<tên miền>/healthz` trả `ok`; trang chủ có form đăng ký; `/admin` chuyển về trang đăng nhập.
- Đăng ký thử bằng dữ liệu giả, chơi 1 lượt, đăng nhập `/admin` thấy người vừa đăng ký, rồi **xoá** dòng thử.
- Sai mật khẩu admin 5 lần từ điện thoại (4G): chỉ điện thoại đó bị khoá, máy khác vẫn đăng nhập được. Server đọc IP thật từ header `cf-connecting-ip` (Render đứng sau Cloudflare, `TRUST_PROXY_HEADER` trong `render.yaml`).

### Xoá sạch sau khoá học
Xuất CSV nếu cần giữ dữ liệu, gỡ bản ghi DNS, xoá dịch vụ trên Render (**Settings → Delete Web Service**), xoá project trên Neon (**Settings → Delete project**).

## Chạy thật trên máy chủ (HTTPS)

Kế hoạch đầy đủ cho Google Cloud Free Tier: `docs/06-ke-hoach-deploy.html`.

| File | Vai trò |
|---|---|
| `compose.prod.yaml` | Chồng lên `compose.yaml`: thêm Caddy (HTTPS tự động), giới hạn RAM cho máy 1 GB, tinh chỉnh PostgreSQL, xoay vòng log, không mở cổng 3000 |
| `Caddyfile` | Tên miền lấy từ biến `DOMAIN`, Caddy tự xin và gia hạn chứng chỉ Let's Encrypt |
| `.env.production.example` | Mẫu `.env` cho máy chủ: `DOMAIN`, mật khẩu mới, `COOKIE_SECURE=1`, nội dung điều khoản |
| `scripts/sao-luu.sh` | Sao lưu database (`pg_dump` nén), giữ 7 bản, chạy bằng cron |

Trên máy chủ, sau khi bản ghi DNS của tên miền đã trỏ về IP máy:

```bash
cp .env.production.example .env && chmod 600 .env   # rồi sửa .env
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
```

- Chỉ Caddy mở cổng 80 và 443. App đọc IP thật của người dùng từ Caddy (`TRUST_PROXY=1`), nên giới hạn tần suất và khoá đăng nhập vẫn tính theo từng người.
- Thử trên máy cá nhân: đặt `DOMAIN=localhost` rồi mở `https://localhost` (Caddy dùng chứng chỉ nội bộ nên trình duyệt sẽ cảnh báo).
- Sao lưu hằng ngày: `crontab -e` rồi thêm `0 2 * * * cd $HOME/dcc && ./scripts/sao-luu.sh >> $HOME/sao-luu/sao-luu.log 2>&1`.
