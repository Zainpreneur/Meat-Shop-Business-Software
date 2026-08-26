FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm install typescript tsx prisma --no-save

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD sh -c "mkdir -p /app/data && npx prisma migrate deploy && node dist/server.js"
