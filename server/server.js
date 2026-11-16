/* =====================================================================
   Server tĩnh nhỏ cho game "Đập Chim Cánh Cụt".
   Chỉ dùng module có sẵn của Node.js, không cần cài gói nào.

   /            → app/      (index.html, style.css, game.js)
   /design/...  → design/   (tokens.css, logo — game nạp qua ../design/)
   /healthz     → "ok"      (cho Docker HEALTHCHECK)
   ===================================================================== */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '..'));
const APP_DIR = path.join(ROOT, 'app');
const DESIGN_DIR = path.join(ROOT, 'design');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

function send(res, status, body, type) {
  res.writeHead(status, Object.assign({ 'Content-Type': type || 'text/plain; charset=utf-8' }, SECURITY_HEADERS));
  res.end(body);
}

/** Ghép đường dẫn an toàn: trả về null nếu cố đi ra ngoài thư mục gốc. */
function safeJoin(base, urlPath) {
  const target = path.resolve(base, '.' + urlPath);
  return target === base || target.startsWith(base + path.sep) ? target : null;
}

function resolveFile(pathname) {
  if (pathname === '/design' || pathname.startsWith('/design/')) {
    return safeJoin(DESIGN_DIR, pathname.slice('/design'.length) || '/');
  }
  return safeJoin(APP_DIR, pathname);
}

const server = http.createServer((req, res) => {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode} ${Date.now() - started}ms`);
  });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return send(res, 405, 'Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    return send(res, 400, 'Bad Request');
  }
  if (pathname.includes('\0')) return send(res, 400, 'Bad Request');

  if (pathname === '/healthz') return send(res, 200, 'ok');

  let file = resolveFile(pathname);
  if (!file) return send(res, 403, 'Forbidden');

  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      file = path.join(file, 'index.html');
      return fs.stat(file, (err2, st2) => serveFile(err2, st2));
    }
    serveFile(err, st);
  });

  function serveFile(err, st) {
    if (err || !st.isFile()) return send(res, 404, 'Không tìm thấy');
    const ext = path.extname(file).toLowerCase();
    const headers = Object.assign({
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Last-Modified': st.mtime.toUTCString(),
      // HTML luôn kiểm tra bản mới; CSS/JS/ảnh cho cache ngắn để cập nhật nhanh khi đổi bản
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
    }, SECURITY_HEADERS);

    const since = req.headers['if-modified-since'];
    if (since && Date.parse(since) >= Math.floor(st.mtimeMs / 1000) * 1000) {
      res.writeHead(304, headers);
      return res.end();
    }
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file)
      .on('error', () => res.destroy())
      .pipe(res);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Đập Chim Cánh Cụt đang chạy tại http://localhost:${PORT} (phục vụ ${APP_DIR})`);
});

// Docker gửi SIGTERM khi dừng container → đóng server gọn gàng
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`Nhận ${sig}, đang dừng server...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
