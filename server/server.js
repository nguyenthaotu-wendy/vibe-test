/* =====================================================================
   Server game "Đập Chim Cánh Cụt" (v1.1)

   /                    → app/      (game)
   /design/...          → design/   (tokens.css, logo)
   /api/...             → API người chơi (đăng ký, gửi lượt)
   /admin, /admin/...   → trang quản trị (phải đăng nhập), file trong admin/
   /api/admin/...       → API quản trị (phải đăng nhập)
   /healthz             → "ok" khi database truy cập được, 503 nếu không
   ===================================================================== */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const db = require('./lib/db');
const api = require('./lib/api');
const auth = require('./lib/admin-auth');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '..'));
const APP_DIR = path.join(ROOT, 'app');
const DESIGN_DIR = path.join(ROOT, 'design');
const ADMIN_DIR = path.join(ROOT, 'admin');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

const HEADER_CHUNG = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};
// QT-22: trang admin chỉ tải tài nguyên từ chính máy chủ và Google Fonts
const HEADER_ADMIN = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow'
};

/* ---------------- Tiện ích ---------------- */

function gui(res, status, body, type, them) {
  res.writeHead(status, Object.assign({ 'Content-Type': type || 'text/plain; charset=utf-8' }, HEADER_CHUNG, them || {}));
  res.end(body);
}
function guiJson(res, status, obj, them) {
  if (status === 204) { res.writeHead(204, Object.assign({}, HEADER_CHUNG, them || {})); return res.end(); }
  gui(res, status, JSON.stringify(obj), 'application/json; charset=utf-8', Object.assign({ 'Cache-Control': 'no-store' }, them || {}));
}
function chuyenHuong(res, toi, them) {
  res.writeHead(302, Object.assign({ Location: toi, 'Cache-Control': 'no-store' }, HEADER_CHUNG, them || {}));
  res.end();
}

function docBody(req, gioiHan = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let n = 0; const phan = [];
    req.on('data', (c) => {
      n += c.length;
      if (n > gioiHan) { reject(Object.assign(new Error('quá lớn'), { status: 413 })); req.destroy(); return; }
      phan.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(phan).toString('utf8')));
    req.on('error', reject);
  });
}
async function docJson(req) {
  const ct = (req.headers['content-type'] || '').split(';')[0].trim();
  if (ct !== 'application/json') throw Object.assign(new Error('Content-Type phải là application/json'), { status: 415 });
  try { return JSON.parse(await docBody(req) || '{}'); }
  catch (e) { if (e.status) throw e; throw Object.assign(new Error('JSON không hợp lệ'), { status: 400 }); }
}

/* T3 · IP thật của người dùng khi đứng sau reverse proxy (Caddy).
   Chỉ tin X-Forwarded-For khi TRUST_PROXY=1 VÀ kết nối đến từ địa chỉ nội bộ (mạng Docker).
   Lấy giá trị cuối cùng trong header: đó là IP do proxy của mình ghi vào, không phải giá trị
   do người dùng tự gửi lên (Caddy cũng xoá X-Forwarded-For từ nguồn không tin cậy). */
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
// Số proxy tin cậy đứng trước app: Caddy = 1. Trên dịch vụ có nhiều lớp proxy (vd. Render)
// có thể cần lớn hơn; kiểm tra sau khi deploy (docs/06 · phương án Render).
const TRUST_PROXY_HOPS = Math.max(1, parseInt(process.env.TRUST_PROXY_HOPS, 10) || 1);

function laDiaChiNoiBo(ip) {
  return /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip) ||
    ip === '::1' || /^f[cd][0-9a-f]{2}:/i.test(ip);
}

function ipCua(req) {
  const goc = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  if (!TRUST_PROXY || !laDiaChiNoiBo(goc)) return goc;
  const xff = req.headers['x-forwarded-for'];
  if (!xff) return goc;
  const ds = String(xff).split(',').map((s) => s.trim()).filter(Boolean);
  const cuoi = (ds[Math.max(0, ds.length - TRUST_PROXY_HOPS)] || '').replace(/^::ffff:/, '');
  return /^[0-9a-f.:]{2,45}$/i.test(cuoi) ? cuoi : goc;
}

/** Ghép đường dẫn an toàn: trả về null nếu cố đi ra ngoài thư mục gốc. */
function safeJoin(base, urlPath) {
  const target = path.resolve(base, '.' + urlPath);
  return target === base || target.startsWith(base + path.sep) ? target : null;
}

function guiFile(req, res, file, them) {
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      file = path.join(file, 'index.html');
      return fs.stat(file, (e2, st2) => phucVu(e2, st2));
    }
    phucVu(err, st);
  });
  function phucVu(err, st) {
    if (err || !st.isFile()) return gui(res, 404, 'Không tìm thấy', null, them);
    const ext = path.extname(file).toLowerCase();
    const headers = Object.assign({
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Last-Modified': st.mtime.toUTCString(),
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
    }, HEADER_CHUNG, them || {});
    const since = req.headers['if-modified-since'];
    if (since && Date.parse(since) >= Math.floor(st.mtimeMs / 1000) * 1000) { res.writeHead(304, headers); return res.end(); }
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  }
}

/* ---------------- Định tuyến ---------------- */

async function xuLy(req, res, url) {
  const p = url.duongDan;
  const m = req.method;

  if (p === '/healthz') {
    try { await db.kiemTraSong(); return gui(res, 200, 'ok'); }
    catch (e) { return gui(res, 503, 'database không truy cập được'); }
  }

  // TẠM THỜI (chẩn đoán proxy trên Render) — sẽ gỡ. Chỉ trả về CẤU TRÚC header, không trả giá trị IP.
  if (p === '/api/chan-doan-ip' && m === 'GET') {
    const h = req.headers;
    const tach = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
    const xff = tach(h['x-forwarded-for']);
    const goc = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    const cf = h['cf-connecting-ip'] || '';
    const tc = h['true-client-ip'] || '';
    const xr = h['x-real-ip'] || '';
    const viTri = (v) => (v ? xff.indexOf(v) : null);
    const loai = (v) => (!v ? null : /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(v) ? 'noi-bo' : 'cong-khai');
    return guiJson(res, 200, {
      socket: loai(goc),
      xff_so_phan_tu: xff.length,
      xff_loai: xff.map(loai),
      co_cf_connecting_ip: !!cf, cf_trong_xff_tai: viTri(cf),
      co_true_client_ip: !!tc, true_client_ip_trong_xff_tai: viTri(tc), true_client_bang_cf: !!tc && tc === cf,
      co_x_real_ip: !!xr, x_real_ip_trong_xff_tai: viTri(xr),
      ip_dang_dung_trong_xff_tai: xff.indexOf(ipCua(req))
    });
  }

  /* ----- API người chơi ----- */
  if (p === '/api/cau-hinh' && m === 'GET') return guiJson(res, 200, api.cauHinh());
  if (p === '/api/dang-ky' && m === 'POST') {
    const [s, b] = await api.dangKy(ipCua(req), await docJson(req));
    return guiJson(res, s, b);
  }
  if (p === '/api/luot-choi' && m === 'POST') {
    const a = req.headers.authorization || '';
    const ma = a.startsWith('Bearer ') ? a.slice(7).trim() : '';
    const [s, b] = await api.guiLuot(ipCua(req), ma, await docJson(req));
    return guiJson(res, s, b);
  }

  /* ----- Admin: đăng nhập / đăng xuất ----- */
  if (p === '/admin/dang-nhap' && (m === 'GET' || m === 'HEAD')) {
    if (auth.daDangNhap(req)) return chuyenHuong(res, '/admin');
    return guiFile(req, res, path.join(ADMIN_DIR, 'dang-nhap.html'), HEADER_ADMIN);
  }
  if (p === '/admin/dang-nhap' && m === 'POST') {
    if (!auth.cungNguon(req)) return guiJson(res, 403, { thong_bao: 'Yêu cầu không hợp lệ' }, HEADER_ADMIN);
    const b = await docJson(req);
    const kq = auth.dangNhap(ipCua(req), typeof b.ten === 'string' ? b.ten : '', typeof b.mat_khau === 'string' ? b.mat_khau : '');
    if (kq.ok) return guiJson(res, 200, { ok: true }, Object.assign({ 'Set-Cookie': auth.cookiePhien(req, kq.ma) }, HEADER_ADMIN));
    if (kq.khoaPhut) return guiJson(res, 429, { thong_bao: `Đăng nhập tạm khoá, thử lại sau ${kq.khoaPhut} phút` }, HEADER_ADMIN);
    return guiJson(res, 401, { thong_bao: 'Tên đăng nhập hoặc mật khẩu không đúng' }, HEADER_ADMIN);
  }
  if (p === '/admin/dang-xuat' && m === 'POST') {
    if (!auth.cungNguon(req)) return guiJson(res, 403, { thong_bao: 'Yêu cầu không hợp lệ' }, HEADER_ADMIN);
    auth.dangXuat(req);
    return guiJson(res, 200, { ok: true }, Object.assign({ 'Set-Cookie': auth.cookieXoa(req) }, HEADER_ADMIN));
  }
  // Tài nguyên tĩnh của trang admin (CSS/JS, không chứa dữ liệu)
  if (p.startsWith('/admin/assets/') && (m === 'GET' || m === 'HEAD')) {
    const f = safeJoin(ADMIN_DIR, p.slice('/admin'.length));
    return f ? guiFile(req, res, f, HEADER_ADMIN) : gui(res, 403, 'Forbidden');
  }

  /* ----- Admin: phải đăng nhập ----- */
  if (p === '/admin' || p === '/admin/') {
    if (!auth.daDangNhap(req)) return chuyenHuong(res, '/admin/dang-nhap');
    return guiFile(req, res, path.join(ADMIN_DIR, 'index.html'), HEADER_ADMIN);
  }
  if (p.startsWith('/api/admin/')) {
    if (!auth.daDangNhap(req)) return guiJson(res, 401, { thong_bao: 'Phiên đăng nhập đã hết, vui lòng đăng nhập lại' }, HEADER_ADMIN);
    if (m !== 'GET' && !auth.cungNguon(req)) return guiJson(res, 403, { thong_bao: 'Yêu cầu không hợp lệ' }, HEADER_ADMIN);
    const q = Object.fromEntries(url.searchParams);
    if (p === '/api/admin/nguoi-choi' && m === 'GET') {
      const [s, b] = await api.danhSach(q);
      return guiJson(res, s, b, HEADER_ADMIN);
    }
    if (p === '/api/admin/nguoi-choi.csv' && m === 'GET') {
      const { ten, noiDung } = await api.csv(q);
      return gui(res, 200, noiDung, 'text/csv; charset=utf-8',
        Object.assign({}, HEADER_ADMIN, { 'Content-Disposition': `attachment; filename="${ten}"` }));
    }
    const xoa = p.match(/^\/api\/admin\/nguoi-choi\/([^/]+)$/);
    if (xoa && m === 'DELETE') {
      const [s, b] = await api.xoa(xoa[1]);
      return guiJson(res, s, b, HEADER_ADMIN);
    }
    return guiJson(res, 404, { thong_bao: 'Không tìm thấy' }, HEADER_ADMIN);
  }
  if (p.startsWith('/admin')) return gui(res, 404, 'Không tìm thấy', null, HEADER_ADMIN);
  if (p.startsWith('/api/')) return guiJson(res, 404, { thong_bao: 'Không tìm thấy' });

  /* ----- File tĩnh của game ----- */
  if (m !== 'GET' && m !== 'HEAD') {
    return gui(res, 405, 'Method Not Allowed', null, { Allow: 'GET, HEAD' });
  }
  const f = (p === '/design' || p.startsWith('/design/'))
    ? safeJoin(DESIGN_DIR, p.slice('/design'.length) || '/')
    : safeJoin(APP_DIR, p);
  if (!f) return gui(res, 403, 'Forbidden');
  return guiFile(req, res, f);
}

const server = http.createServer(async (req, res) => {
  const batDau = Date.now();
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
    // QT-22: log chỉ ghi đường dẫn, không ghi chuỗi truy vấn hay nội dung yêu cầu
    res.on('finish', () => console.log(`${new Date().toISOString()} ${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - batDau}ms`));
    const p = decodeURIComponent(url.pathname);
    if (p.includes('\0')) return gui(res, 400, 'Bad Request');
    url.duongDan = p;
  } catch (e) {
    return gui(res, 400, 'Bad Request');
  }
  try {
    await xuLy(req, res, url);
  } catch (e) {
    if (e.status) return guiJson(res, e.status, { thong_bao: e.message });
    console.error('[loi]', e.code || '', e.message);
    if (!res.headersSent) guiJson(res, 500, { thong_bao: 'Lỗi máy chủ, vui lòng thử lại' });
    else res.destroy();
  }
});

async function khoiDong() {
  try {
    auth.kiemTraCauHinh(process.env);
  } catch (e) {
    console.error(`[cấu hình] ${e.message}. Server dừng.`);
    process.exit(1);
  }
  try {
    await db.khoiTao();
  } catch (e) {
    console.error(`[db] không khởi tạo được database: ${e.code || e.message}. Server dừng.`);
    process.exit(1);
  }
  server.listen(PORT, HOST, () => {
    console.log(`Đập Chim Cánh Cụt đang chạy tại http://localhost:${PORT} · trang quản trị: http://localhost:${PORT}/admin`);
  });
}

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`Nhận ${sig}, đang dừng server...`);
    server.close(() => db.pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}

khoiDong();
