#!/bin/bash

# Función para limpiar procesos al salir (Ctrl+C)
cleanup() {
    echo -e "\nCerrando todos los servicios..."
    kill $ROS_BRIDGE_PID $VIDEO_SERVER_PID $API_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Ejecutar cleanup si el usuario pulsa Ctrl+C
trap cleanup SIGINT

echo "--- Iniciando Ecosistema de Robots ---"

# 1. Servidor ROS Bridge (Segundo plano)
echo "[1/4] Lanzando rosbridge_server..."
ros2 launch rosbridge_server rosbridge_websocket_launch.xml delay_between_messages:=0.0 &
ROS_BRIDGE_PID=$!

# 2. Web Video Server (Segundo plano)
echo "[2/4] Lanzando web_video_server..."
ros2 run web_video_server web_video_server &
VIDEO_SERVER_PID=$!

# 3. Backend API - FastAPI (Segundo plano)
echo "[3/4] Lanzando FastAPI Backend (Puerto 8000)..."
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!

# 4. Frontend Estático (Primer plano para ver logs)
echo "[4/4] Lanzando Frontend Estático (Puerto 3000)..."
echo "URL: http://localhost:3000"
python3 -m http.server 3000 &
FRONTEND_PID=$!

echo "--- Todos los sistemas operativos. Pulsa Ctrl+C para detenerlos. ---"

wait