/* =====================================================================
   QT-12 · Chuẩn hoá và kiểm tra dữ liệu form đăng ký
   QT-16 · Kiểm tra kết quả lượt chơi
   Dùng chung quy tắc với trình duyệt (app/game.js) nhưng server là nơi quyết định.
   ===================================================================== */
'use strict';

const MOC_SAO = [15, 30, 45];

function chuanHoaHoTen(s) {
  return String(s == null ? '' : s).normalize('NFC').trim().replace(/\s+/g, ' ');
}
function chuanHoaEmail(s) {
  return String(s == null ? '' : s).replace(/\s+/g, '').toLowerCase();
}
function chuanHoaSoDienThoai(s) {
  let d = String(s == null ? '' : s).replace(/[\s.\-()]/g, '');
  if (d.startsWith('+84')) d = '0' + d.slice(3);
  else if (/^84\d{9}$/.test(d)) d = '0' + d.slice(2);
  return d;
}
/** Bỏ dấu tiếng Việt, chữ thường — dùng để tìm kiếm (QT-19). */
function boDau(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase();
}

const RE_HO_TEN = /^[\p{L}\p{M}' -]+$/u;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@.]+$/;
const RE_SDT = /^0(3|5|7|8|9)\d{8}$/;

/**
 * Kiểm tra form đăng ký. Trả về { ok, du_lieu, loi } — loi là { truong: thông báo }.
 */
function kiemTraDangKy(body) {
  const loi = {};
  const hoTen = chuanHoaHoTen(body && body.ho_ten);
  const email = chuanHoaEmail(body && body.email);
  const sdt = chuanHoaSoDienThoai(body && body.so_dien_thoai);

  if (!hoTen) loi.ho_ten = 'Vui lòng nhập họ tên';
  else if ([...hoTen].length < 2 || [...hoTen].length > 60) loi.ho_ten = 'Họ tên cần từ 2 đến 60 ký tự';
  else if (!RE_HO_TEN.test(hoTen)) loi.ho_ten = 'Họ tên chỉ gồm chữ cái';

  if (!email) loi.email = 'Vui lòng nhập email';
  else if (email.length > 100 || !RE_EMAIL.test(email)) loi.email = 'Email chưa đúng định dạng';

  if (!sdt) loi.so_dien_thoai = 'Vui lòng nhập số điện thoại';
  else if (!/^\d+$/.test(sdt) || sdt.length !== 10) loi.so_dien_thoai = 'Số điện thoại cần đủ 10 chữ số';
  else if (!RE_SDT.test(sdt)) loi.so_dien_thoai = 'Số điện thoại di động không hợp lệ';

  if (!body || body.dong_y !== true) loi.dong_y = 'Vui lòng đồng ý với điều khoản để tham gia';

  return {
    ok: Object.keys(loi).length === 0,
    loi,
    du_lieu: { ho_ten: hoTen, ho_ten_tim: boDau(hoTen), email, so_dien_thoai: sdt }
  };
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tinhSao(diem) {
  return diem >= MOC_SAO[2] ? 3 : diem >= MOC_SAO[1] ? 2 : diem >= MOC_SAO[0] ? 1 : 0;
}

/** QT-16: kiểm tra số liệu lượt chơi có hợp lý không. */
function kiemTraLuot(body) {
  const b = body || {};
  const so = ['diem', 'so_thuong', 'so_vang', 'so_hai_cau', 'so_lan_bam', 'combo_dai_nhat'];
  for (const k of so) {
    if (!Number.isInteger(b[k]) || b[k] < 0) return { ok: false, loi: k + ' phải là số nguyên ≥ 0' };
  }
  if (typeof b.ma_luot !== 'string' || !RE_UUID.test(b.ma_luot)) return { ok: false, loi: 'ma_luot không hợp lệ' };
  if (b.diem > 999) return { ok: false, loi: 'diem vượt giới hạn' };
  if (b.so_lan_bam > 600) return { ok: false, loi: 'so_lan_bam vượt giới hạn' };
  if (b.combo_dai_nhat > b.so_thuong + b.so_vang) return { ok: false, loi: 'combo_dai_nhat không hợp lý' };
  if (b.so_thuong + b.so_vang + b.so_hai_cau > b.so_lan_bam) return { ok: false, loi: 'số lần đập vượt số lần bấm' };
  if (b.diem > (b.so_thuong + 3 * b.so_vang) * 2) return { ok: false, loi: 'diem vượt mức tối đa có thể' };
  return {
    ok: true,
    du_lieu: {
      ma_luot: b.ma_luot.toLowerCase(), diem: b.diem, sao: tinhSao(b.diem),
      so_thuong: b.so_thuong, so_vang: b.so_vang, so_hai_cau: b.so_hai_cau,
      so_lan_bam: b.so_lan_bam, combo_dai_nhat: b.combo_dai_nhat
    }
  };
}

module.exports = { kiemTraDangKy, kiemTraLuot, chuanHoaSoDienThoai, boDau, tinhSao };
