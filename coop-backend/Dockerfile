FROM node:20-bookworm-slim

WORKDIR /app

# ติดตั้ง dependencies แยก layer เพื่อใช้ cache
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000
CMD ["npm", "run", "dev"]
