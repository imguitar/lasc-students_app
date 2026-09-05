FROM node:20-bookworm-slim

# openssl จำเป็นสำหรับ Prisma engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ติดตั้ง dependencies แยก layer เพื่อใช้ cache
# ต้อง copy prisma/ มาก่อน เพราะ postinstall เรียก prisma generate
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .

RUN mkdir -p uploads

EXPOSE 5000
CMD ["npm", "run", "dev"]
