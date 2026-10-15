FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

RUN npx prisma generate --schema=prisma/schema.prisma

EXPOSE 4000

CMD ["sh", "-lc", "npx prisma migrate deploy || npx prisma migrate dev --name init --skip-seed; npm start"]
