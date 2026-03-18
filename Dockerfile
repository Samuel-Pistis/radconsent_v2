FROM node:22

WORKDIR /app

# Build frontend
COPY frontend/package*.json frontend/
RUN cd frontend && npm install

COPY frontend/ frontend/
RUN cd frontend && npm run build

# Install backend (better-sqlite3 needs native compilation)
COPY backend/package*.json backend/
RUN cd backend && npm install

COPY backend/ backend/

EXPOSE 4000

CMD ["node", "backend/src/index.js"]
