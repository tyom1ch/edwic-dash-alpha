# Multi-stage build

# Stage 1: Build the app
FROM node:20 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the app
FROM node:20-alpine

# Встановлюємо легкий сервер
RUN npm install -g serve

WORKDIR /app
COPY --from=builder /app/dist .

EXPOSE 4173

CMD ["serve", "-s", ".", "-l", "4173", "--host", "0.0.0.0"]
