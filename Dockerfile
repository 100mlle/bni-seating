FROM node:20-alpine

WORKDIR /app

# 安裝依賴
COPY package*.json ./
RUN npm install --no-fund --no-audit --legacy-peer-deps

# 複製原始碼並 build
COPY . .
RUN npm run build

# 對外埠口
EXPOSE 3000

CMD ["npm", "start"]
