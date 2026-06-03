FROM node:20-alpine

WORKDIR /app

# 一次複製所有檔案（避免 layer cache 導致 npm install 被跳過）
COPY . .

# 安裝所有依賴（含 devDependencies，build 需要 vite/esbuild）
RUN npm install --include=dev --no-fund --no-audit

# Build
RUN npm run build

# 移除 dev 套件，只保留執行用的
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "start"]
