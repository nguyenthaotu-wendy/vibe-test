/* =====================================================================
   QT-16 · API người chơi và admin
   ===================================================================== */
'use strict';

const crypto = require('node:crypto');
const { pool } = require('./db');
const { kiemTraDangKy, kiemTraLuot, chuanHoaSoDienThoai, boDau } = require('./kiem-tra');
const { taoGioiHan } = require('./gioi-han');

const PHIEN_BAN_DIEU_KHOAN = process.env.PHIEN_BAN_DIEU_KHOAN || '2026-11-v1';
// Nội dung giữ chỗ (QT-13) — ban tổ chức cần thay trước khi dùng thật, qua biến môi trường.
const NOI_DUNG_DIEU_KHOAN = process.env.NOI_DUNG_DIEU_KHOAN ||
  'Tôi đồng ý cho [Ban tổ chức] thu thập họ tên, email, số điện thoại và kết quả chơi để [mục đích]. ' +
  'Dữ liệu được lưu tối đa [N] ngày sau sự kiện. Tôi có thể yêu cầu xoá bằng cách liên hệ [kênh liên hệ].';

const PHIEN_NGUOI_CHOI_MS = 2 * 60 * 60 * 1000;   // 2 giờ (QT-17)
const GIA_HAN_GUI_LUOT_MS = 10 * 60 * 1000;        // nhận lượt trễ 10 phút sau hết hạn
const KHOANG_CACH_LUOT_MS = 30 * 1000;             // 1 lượt / 30 giây / phiên
const MOI_TRANG = 20;

const gioiHanDangKy = taoGioiHan(10, 60 * 1000);
const gioiHanLuot = taoGioiHan(30, 60 * 1000);

const bamPhien = (s) => crypto.createHash('sha256').update(s).digest('hex');

/* ---------------- Người chơi ---------------- */

function cauHinh() {
  return { dang_ky: true, phien_ban_dieu_khoan: PHIEN_BAN_DIEU_KHOAN, noi_dung_dieu_khoan: NOI_DUNG_DIEU_KHOAN };
}

/**
 * POST /api/dang-ky
 * Khoá trùng (QT-14 cập nhật): email và số điện thoại đều duy nhất.
 * - Cả hai cùng khớp một người chơi → dùng lại hồ sơ.
 * - Chỉ một trong hai đã thuộc về người khác (hoặc lệch nhau) → 409.
 */
async function dangKy(ip, body) {
  if (!gioiHanDangKy(ip)) return [429, { thong_bao: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.' }];
  const kt = kiemTraDangKy(body);
  if (!kt.ok) return [422, { loi: kt.loi }];
  const d = kt.du_lieu;

  for (let lan = 0; lan < 2; lan++) {
    const { rows } = await pool.query(
      'SELECT id, email, so_dien_thoai FROM nguoi_choi WHERE email = $1 OR so_dien_thoai = $2', [d.email, d.so_dien_thoai]);
    let id;
    if (rows.length === 0) {
      try {
        const r = await pool.query(
          `INSERT INTO nguoi_choi (ho_ten, ho_ten_tim, email, so_dien_thoai, dong_y_luc, phien_ban_dieu_khoan)
           VALUES ($1, $2, $3, $4, now(), $5) RETURNING id`,
          [d.ho_ten, d.ho_ten_tim, d.email, d.so_dien_thoai, PHIEN_BAN_DIEU_KHOAN]);
        id = r.rows[0].id;
      } catch (e) {
        if (e.code === '23505') continue;   // vừa có người đăng ký trùng cùng lúc → kiểm tra lại
        throw e;
      }
    } else if (rows.length === 1 && rows[0].email === d.email && rows[0].so_dien_thoai === d.so_dien_thoai) {
      id = rows[0].id;
      await pool.query('UPDATE nguoi_choi SET dong_y_luc = now(), phien_ban_dieu_khoan = $2 WHERE id = $1', [id, PHIEN_BAN_DIEU_KHOAN]);
    } else {
      return [409, { thong_bao: 'Email hoặc số điện thoại đã được dùng để đăng ký. Vui lòng nhập đúng thông tin đã đăng ký trước đó, hoặc dùng thông tin khác.' }];
    }
    const ma = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'INSERT INTO phien_nguoi_choi (ma_bam, nguoi_choi_id, het_han) VALUES ($1, $2, now() + $3::interval)',
      [bamPhien(ma), id, PHIEN_NGUOI_CHOI_MS + ' milliseconds']);
    return [201, { phien: ma }];
  }
  return [409, { thong_bao: 'Email hoặc số điện thoại đã được dùng để đăng ký.' }];
}

/** POST /api/luot-choi */
async function guiLuot(ip, maPhien, body) {
  if (!gioiHanLuot(ip)) return [429, { thong_bao: 'Quá nhiều yêu cầu' }];
  if (!maPhien || !/^[0-9a-f]{64}$/.test(maPhien)) return [401, { thong_bao: 'Phiên không hợp lệ' }];
  const kt = kiemTraLuot(body);
  if (!kt.ok) return [422, { thong_bao: kt.loi }];
  const d = kt.du_lieu;

  const { rows } = await pool.query(
    `SELECT nguoi_choi_id, het_han, luot_gan_nhat FROM phien_nguoi_choi
     WHERE ma_bam = $1 AND het_han + $2::interval > now()`,
    [bamPhien(maPhien), GIA_HAN_GUI_LUOT_MS + ' milliseconds']);
  if (!rows.length) return [401, { thong_bao: 'Phiên không hợp lệ hoặc đã hết hạn' }];
  const p = rows[0];

  // Gửi trùng cùng ma_luot → 200, không thêm dòng
  const cu = await pool.query('SELECT nguoi_choi_id FROM luot_choi WHERE ma_luot = $1', [d.ma_luot]);
  if (cu.rows.length) {
    return String(cu.rows[0].nguoi_choi_id) === String(p.nguoi_choi_id) ? [200, { ok: true, trung: true }] : [422, { thong_bao: 'ma_luot đã được dùng' }];
  }
  if (p.luot_gan_nhat && Date.now() - new Date(p.luot_gan_nhat).getTime() < KHOANG_CACH_LUOT_MS) {
    return [429, { thong_bao: 'Gửi lượt quá nhanh' }];
  }
  try {
    await pool.query(
      `INSERT INTO luot_choi (ma_luot, nguoi_choi_id, diem, sao, so_thuong, so_vang, so_hai_cau, so_lan_bam, combo_dai_nhat)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [d.ma_luot, p.nguoi_choi_id, d.diem, d.sao, d.so_thuong, d.so_vang, d.so_hai_cau, d.so_lan_bam, d.combo_dai_nhat]);
  } catch (e) {
    if (e.code === '23505') return [200, { ok: true, trung: true }];
    throw e;
  }
  await pool.query('UPDATE phien_nguoi_choi SET luot_gan_nhat = now() WHERE ma_bam = $1', [bamPhien(maPhien)]);
  return [201, { ok: true }];
}

/* ---------------- Admin ---------------- */

const SAP_XEP = {
  moi_nhat:   'n.tao_luc DESC, n.id DESC',
  cu_nhat:    'n.tao_luc ASC, n.id ASC',
  nhieu_luot: 'so_luot DESC, n.id DESC',
  diem_cao:   'diem_cao DESC NULLS LAST, n.id DESC'
};

const thoatLike = (s) => s.replace(/[\\%_]/g, (c) => '\\' + c);

/** Dựng điều kiện tìm kiếm (QT-19). Trả về { where, params }. */
function dieuKienTim(q) {
  q = String(q || '').trim().slice(0, 100);
  if (!q) return { where: '', params: [] };
  const params = ['%' + thoatLike(boDau(q)) + '%', '%' + thoatLike(q.toLowerCase()) + '%'];
  let where = 'WHERE (n.ho_ten_tim LIKE $1 ESCAPE \'\\\' OR n.email LIKE $2 ESCAPE \'\\\'';
  const chuSo = q.replace(/\D/g, '');
  if (chuSo.length >= 3) {
    let s = chuanHoaSoDienThoai(q.replace(/[^\d+]/g, ''));
    if (!/^\d+$/.test(s)) s = chuSo;
    params.push('%' + s + '%');
    where += ' OR n.so_dien_thoai LIKE $3';
  }
  where += ')';
  return { where, params };
}

const COT_DANH_SACH = `
  n.id, n.ho_ten, n.email, n.so_dien_thoai, n.tao_luc, n.dong_y_luc, n.phien_ban_dieu_khoan,
  COUNT(l.id)::int AS so_luot, MAX(l.diem) AS diem_cao, MAX(l.sao) AS sao_cao, MAX(l.ket_thuc_luc) AS luot_gan_nhat`;

async function danhSach(query) {
  const { where, params } = dieuKienTim(query.q);
  const sapXep = SAP_XEP[query.sap_xep] ? query.sap_xep : 'moi_nhat';
  const tong = await pool.query(
    `SELECT COUNT(*)::int AS tong,
            COALESCE((SELECT COUNT(*) FROM luot_choi l JOIN nguoi_choi n ON n.id = l.nguoi_choi_id ${where}), 0)::int AS tong_luot
     FROM nguoi_choi n ${where}`, params);
  const t = tong.rows[0];
  const soTrang = Math.max(1, Math.ceil(t.tong / MOI_TRANG));
  let trang = parseInt(query.trang, 10);
  if (!Number.isInteger(trang) || trang < 1) trang = 1;
  if (trang > soTrang) trang = soTrang;
  const { rows } = await pool.query(
    `SELECT ${COT_DANH_SACH} FROM nguoi_choi n LEFT JOIN luot_choi l ON l.nguoi_choi_id = n.id
     ${where} GROUP BY n.id ORDER BY ${SAP_XEP[sapXep]}
     LIMIT ${MOI_TRANG} OFFSET ${(trang - 1) * MOI_TRANG}`, params);
  return [200, { tong: t.tong, tong_luot: t.tong_luot, trang, so_trang: soTrang, moi_trang: MOI_TRANG, sap_xep: sapXep, ds: rows }];
}

async function xoa(id) {
  if (!/^\d{1,18}$/.test(String(id))) return [404, { thong_bao: 'Không tìm thấy' }];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dem = await client.query('SELECT COUNT(*)::int AS n FROM luot_choi WHERE nguoi_choi_id = $1', [id]);
    const r = await client.query('DELETE FROM nguoi_choi WHERE id = $1', [id]);
    await client.query('COMMIT');
    if (!r.rowCount) return [404, { thong_bao: 'Người chơi này đã bị xoá trước đó' }];
    console.log(`[admin] đã xoá người chơi id=${id}, ${dem.rows[0].n} lượt`);
    return [204, null];
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/* ---------------- CSV (QT-21) ---------------- */

const fmtNgay = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
});
function ngayVN(d) {
  if (!d) return '';
  const p = Object.fromEntries(fmtNgay.formatToParts(new Date(d)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}
function oVanBan(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;          // chống chèn công thức
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

async function csv(query) {
  const { where, params } = dieuKienTim(query.q);
  const sapXep = SAP_XEP[query.sap_xep] ? query.sap_xep : 'moi_nhat';
  const { rows } = await pool.query(
    `SELECT ${COT_DANH_SACH} FROM nguoi_choi n LEFT JOIN luot_choi l ON l.nguoi_choi_id = n.id
     ${where} GROUP BY n.id ORDER BY ${SAP_XEP[sapXep]}`, params);
  const dong = [['STT', 'Họ và tên', 'Email', 'Số điện thoại', 'Ngày đăng ký', 'Số lượt chơi', 'Điểm cao nhất',
    'Sao cao nhất', 'Lượt gần nhất', 'Đồng ý điều khoản lúc', 'Phiên bản điều khoản'].join(',')];
  rows.forEach((r, i) => {
    dong.push([
      i + 1, oVanBan(r.ho_ten), oVanBan(r.email), `="${r.so_dien_thoai}"`, ngayVN(r.tao_luc), r.so_luot,
      r.diem_cao == null ? '' : r.diem_cao, r.sao_cao == null ? '' : r.sao_cao, ngayVN(r.luot_gan_nhat),
      ngayVN(r.dong_y_luc), oVanBan(r.phien_ban_dieu_khoan)
    ].join(','));
  });
  const p = Object.fromEntries(fmtNgay.formatToParts(new Date()).map((x) => [x.type, x.value]));
  const ten = `nguoi-choi-${p.year}${p.month}${p.day}-${p.hour}${p.minute}.csv`;
  return { ten, noiDung: '﻿' + dong.join('\r\n') + '\r\n' };
}

module.exports = { cauHinh, dangKy, guiLuot, danhSach, xoa, csv };
