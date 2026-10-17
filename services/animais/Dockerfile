FROM node:24-alpine

WORKDIR /app

# Instala as dependências primeiro para aproveitar o cache do Docker
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 3001

CMD ["node", "src/server.js"]
