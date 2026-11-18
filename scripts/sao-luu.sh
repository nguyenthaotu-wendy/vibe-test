#!/usr/bin/env bash
# =====================================================================
# T6 · Sao lưu database PostgreSQL (docs/06-ke-hoach-deploy.html, bước 6.11)
#
# Chạy trên máy ảo, trong thư mục dự án:
#   ./scripts/sao-luu.sh
# Cron hằng ngày lúc 02:00 (crontab -e):
#   0 2 * * * cd $HOME/dcc && ./scripts/sao-luu.sh >> $HOME/sao-luu/sao-luu.log 2>&1
#
# Bản sao lưu chứa DỮ LIỆU CÁ NHÂN: thư mục chỉ chủ máy đọc được, giữ tối đa GIU_LAI bản.
# =====================================================================
set -euo pipefail

THU_MUC="${THU_MUC_SAO_LUU:-$HOME/sao-luu}"
GIU_LAI="${GIU_LAI:-7}"
DICH_VU_DB="${DICH_VU_DB:-dap-chim-canh-cut-db}"

umask 077
mkdir -p "$THU_MUC"
chmod 700 "$THU_MUC"

ten="$THU_MUC/dcc-$(date +%Y%m%d-%H%M).sql.gz"
tam="$ten.dang-ghi"

# pg_dump chạy trong container db, dùng biến POSTGRES_* có sẵn trong container
docker exec "$DICH_VU_DB" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists' \
  | gzip -9 > "$tam"

# Kiểm tra bản sao lưu không rỗng và giải nén được
if [ ! -s "$tam" ] || ! gzip -t "$tam"; then
  echo "$(date -Is) LỖI: bản sao lưu hỏng hoặc rỗng, đã bỏ" >&2
  rm -f "$tam"
  exit 1
fi
mv "$tam" "$ten"
echo "$(date -Is) Đã sao lưu: $ten ($(du -h "$ten" | cut -f1))"

# Chỉ giữ GIU_LAI bản mới nhất
ls -1t "$THU_MUC"/dcc-*.sql.gz 2>/dev/null | tail -n +"$((GIU_LAI + 1))" | while read -r cu; do
  rm -f -- "$cu"
  echo "$(date -Is) Đã xoá bản cũ: $cu"
done

# Khôi phục (khi cần), trong thư mục dự án:
#   gunzip -c ~/sao-luu/dcc-YYYYMMDD-HHMM.sql.gz | \
#     docker exec -i dap-chim-canh-cut-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
