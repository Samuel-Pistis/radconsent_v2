FROM node:20-alpine

WORKDIR /app

# Build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public
COPY frontend/index.html ./frontend/index.html
COPY frontend/vite.config.js ./frontend/vite.config.js
RUN cd frontend && npm run build

# Install backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend/ ./backend/

EXPOSE 4000

CMD ["node", "backend/src/index.js"]
