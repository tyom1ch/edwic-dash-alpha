#!/bin/bash

IMAGE="ghcr.io/tyom1ch/edwic-dash-alpha:latest"
CONTAINER_NAME="edwic-dash"
PORT=4173

echo "Pulling image..."
docker pull $IMAGE

echo "Stopping and removing old container if exists..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "Starting container..."
docker run -d -p $PORT:$PORT --name $CONTAINER_NAME $IMAGE

# Визначаємо IP через ip route
IP=$(ip route get 1 | awk '{print $7; exit}')
URL="http://$IP:$PORT"

echo "Перевірка доступності..."

if curl -s -o /dev/null -w "%{http_code}" http://localhost:4173 | grep -q "200"; then
  echo "✅ Все гуд, сервер запущено!"
  echo "Заходь сюди: $URL"
else
  echo "❌ Щось не так, але можливо сервер ще не встиг стартанути"
fi
