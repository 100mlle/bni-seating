FROM node:20-alpine

WORKDIR /app

# 安裝依賴（包含 devDependencies，build 需要 vite/esbuild/typescript）
COPY package*.json ./
RUN npm install --include=dev --no-fund --no-audit

# 複製原始碼並 build
COPY . .
RUN npm run build

# 只保留 production 執行所需的 node_modules
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "start"]
