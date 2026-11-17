/* =====================================================================
   QT-18 · Xác thực admin: 1 tài khoản từ biến môi trường
   ===================================================================== */
'use strict';

const crypto = require('node:crypto');

const TEN_COOKIE = 'dcc_admin';
const PHIEN_MS = 8 * 60 * 60 * 1000;      // 8 giờ
const SAI_TOI_DA = 5;
const KHOA_MS = 15 * 60 * 1000;            // 15 phút

const bam = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest();

let TEN_BAM = null, MK_BAM = null;

/** Gọi khi khởi động. Thiếu cấu hình hoặc mật khẩu yếu → ném lỗi để server dừng. */
function kiemTraCauHinh(env) {
  const ten = env.ADMIN_USER, mk = env.ADMIN_PASSWORD;
  if (!ten) throw new Error('Thiếu ADMIN_USER trong .env');
  if (!mk) throw new Error('Thiếu ADMIN_PASSWORD trong .env');
  if (mk.length < 12) throw new Error('ADMIN_PASSWORD phải có ít nhất 12 ký tự');
  TEN_BAM = bam(ten);
  MK_BAM = bam(mk);
}

const phien = new Map();     // mã phiên → hết hạn (ms)
const saiTheoIp = new Map(); // ip → { dem, khoaDen }

setInterval(() => {
  const now = Date.now();
  for (const [k, h] of phien) if (h < now) phien.delete(k);
  for (const [k, v] of saiTheoIp) if (v.khoaDen && v.khoaDen < now && v.dem >= SAI_TOI_DA) saiTheoIp.delete(k);
}, 60 * 1000).unref();

/** Trả về số phút còn khoá, hoặc 0 nếu không bị khoá. */
function phutConKhoa(ip) {
  const v = saiTheoIp.get(ip);
  if (!v || !v.khoaDen) return 0;
  const con = v.khoaDen - Date.now();
  if (con <= 0) { saiTheoIp.delete(ip); return 0; }
  return Math.ceil(con / 60000);
}

/** Kiểm tra tên + mật khẩu. Trả về { ok, khoaPhut }. */
function dangNhap(ip, ten, mk) {
  const khoa = phutConKhoa(ip);
  if (khoa) return { ok: false, khoaPhut: khoa };
  const dungTen = crypto.timingSafeEqual(bam(ten || ''), TEN_BAM);
  const dungMk = crypto.timingSafeEqual(bam(mk || ''), MK_BAM);
  if (dungTen && dungMk) {
    saiTheoIp.delete(ip);
    const ma = crypto.randomBytes(32).toString('hex');
    phien.set(ma, Date.now() + PHIEN_MS);
    return { ok: true, ma };
  }
  const v = saiTheoIp.get(ip) || { dem: 0, khoaDen: 0 };
  v.dem++;
  if (v.dem >= SAI_TOI_DA) v.khoaDen = Date.now() + KHOA_MS;
  saiTheoIp.set(ip, v);
  return { ok: false, khoaPhut: v.khoaDen ? Math.ceil(KHOA_MS / 60000) : 0 };
}

function docCookie(req, ten) {
  const h = req.headers.cookie || '';
  for (const phan of h.split(';')) {
    const i = phan.indexOf('=');
    if (i > 0 && phan.slice(0, i).trim() === ten) return decodeURIComponent(phan.slice(i + 1).trim());
  }
  return null;
}

function daDangNhap(req) {
  const ma = docCookie(req, TEN_COOKIE);
  if (!ma) return false;
  const h = phien.get(ma);
  if (!h) return false;
  if (h < Date.now()) { phien.delete(ma); return false; }
  return true;
}

function dangXuat(req) {
  const ma = docCookie(req, TEN_COOKIE);
  if (ma) phien.delete(ma);
}

function laHttps(req) {
  return process.env.COOKIE_SECURE === '1' || req.headers['x-forwarded-proto'] === 'https';
}

function cookiePhien(req, ma) {
  return `${TEN_COOKIE}=${ma}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${PHIEN_MS / 1000}` + (laHttps(req) ? '; Secure' : '');
}
function cookieXoa(req) {
  return `${TEN_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` + (laHttps(req) ? '; Secure' : '');
}

/** Chống CSRF: yêu cầu thay đổi phải có Origin trùng máy chủ. */
function cungNguon(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.host;
  } catch (e) { return false; }
}

module.exports = { kiemTraCauHinh, dangNhap, daDangNhap, dangXuat, cookiePhien, cookieXoa, cungNguon };
