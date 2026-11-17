# Game "Đập Chim Cánh Cụt" — server Node.js (game, API đăng ký, trang quản trị)
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    SITE_ROOT=/srv

WORKDIR /srv

# Cài thư viện trước để tận dụng cache khi chỉ sửa code
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY server/ ./server/
COPY app/ ./app/
COPY admin/ ./admin/
COPY design/ ./design/

# Chạy bằng user "node" có sẵn trong image, không dùng root
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "server/server.js"]
