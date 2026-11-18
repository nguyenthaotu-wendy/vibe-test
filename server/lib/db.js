/* =====================================================================
   QT-15 · Database PostgreSQL
   Hai cách cấu hình kết nối:
   1. DATABASE_URL (vd. Neon trên Render): postgresql://user:pass@host/db?sslmode=require
      → bật SSL có kiểm tra chứng chỉ khi máy chủ không phải nội bộ.
   2. Biến chuẩn của node-postgres: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
      (Docker Compose trên máy / máy ảo).
   ===================================================================== */
'use strict';

const { Pool } = require('pg');

function cauHinhKetNoi() {
  const chung = {
    max: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    // Neon gói miễn phí tự "ngủ" khi rảnh; lần kết nối đầu cần vài giây để thức dậy
    connectionTimeoutMillis: 15000
  };
  const url = process.env.DATABASE_URL;
  if (!url) return chung;
  let host = '';
  try { host = new URL(url).hostname; } catch (e) { throw new Error('DATABASE_URL không hợp lệ'); }
  const noiBo = /^(localhost|127\.|db$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  // Bỏ sslmode khỏi chuỗi để tự quyết định SSL ở dưới (tránh pg hiểu khác nhau giữa các phiên bản)
  const u = new URL(url);
  u.searchParams.delete('sslmode');
  u.searchParams.delete('channel_binding');
  return Object.assign(chung, {
    connectionString: u.toString(),
    ssl: noiBo || process.env.DB_SSL === '0' ? false : { rejectUnauthorized: true }
  });
}

const pool = new Pool(cauHinhKetNoi());
pool.on('error', (e) => console.error('[db] lỗi kết nối nền:', e.code || e.message));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS nguoi_choi (
  id                    BIGSERIAL PRIMARY KEY,
  ho_ten                TEXT        NOT NULL,
  ho_ten_tim            TEXT        NOT NULL,
  email                 TEXT        NOT NULL UNIQUE,
  so_dien_thoai         TEXT        NOT NULL UNIQUE,
  dong_y_luc            TIMESTAMPTZ NOT NULL,
  phien_ban_dieu_khoan  TEXT        NOT NULL,
  tao_luc               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nguoi_choi_tao_luc ON nguoi_choi (tao_luc);

CREATE TABLE IF NOT EXISTS luot_choi (
  id              BIGSERIAL PRIMARY KEY,
  ma_luot         UUID        NOT NULL UNIQUE,
  nguoi_choi_id   BIGINT      NOT NULL REFERENCES nguoi_choi(id) ON DELETE CASCADE,
  diem            INTEGER     NOT NULL CHECK (diem BETWEEN 0 AND 999),
  sao             SMALLINT    NOT NULL CHECK (sao BETWEEN 0 AND 3),
  so_thuong       INTEGER     NOT NULL CHECK (so_thuong >= 0),
  so_vang         INTEGER     NOT NULL CHECK (so_vang >= 0),
  so_hai_cau      INTEGER     NOT NULL CHECK (so_hai_cau >= 0),
  so_lan_bam      INTEGER     NOT NULL CHECK (so_lan_bam >= 0),
  combo_dai_nhat  INTEGER     NOT NULL CHECK (combo_dai_nhat >= 0),
  ket_thuc_luc    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS luot_choi_nguoi_choi ON luot_choi (nguoi_choi_id);

CREATE TABLE IF NOT EXISTS phien_nguoi_choi (
  ma_bam          TEXT        PRIMARY KEY,
  nguoi_choi_id   BIGINT      NOT NULL REFERENCES nguoi_choi(id) ON DELETE CASCADE,
  het_han         TIMESTAMPTZ NOT NULL,
  luot_gan_nhat   TIMESTAMPTZ
);
`;

const cho = (ms) => new Promise((r) => setTimeout(r, ms));

/** Chờ database sẵn sàng rồi tạo bảng. Thử lại tối đa ~60 giây. */
async function khoiTao() {
  let loiCuoi;
  for (let lan = 1; lan <= 30; lan++) {
    try {
      await pool.query(SCHEMA);
      console.log('[db] đã sẵn sàng');
      return;
    } catch (e) {
      loiCuoi = e;
      console.log(`[db] chưa kết nối được (lần ${lan}): ${e.code || e.message}`);
      await cho(2000);
    }
  }
  throw loiCuoi;
}

async function kiemTraSong() {
  await pool.query('SELECT 1');
}

module.exports = { pool, khoiTao, kiemTraSong };
