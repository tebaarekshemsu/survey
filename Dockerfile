FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npx prisma generate
RUN npx prisma migrate dev --name init

COPY . .

CMD ["npm", "run", "start:dev"]