FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/exora.db
EXPOSE 3000
CMD ["node", "dist/server.js"]
