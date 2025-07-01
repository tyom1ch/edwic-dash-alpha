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

IP=$(hostname -I | awk '{print $1}')
URL="http://$IP:$PORT"

echo "Йоу, заходь сюди: $URL"
echo "Перевірка доступності..."

curl --fail $URL && echo "Апка відповідає!" || echo "Щось не так, апка не відповідає."

