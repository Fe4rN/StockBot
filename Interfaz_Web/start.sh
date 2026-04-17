#!/bin/bash

# Asegurate de que el archivo tenga permiso de ejecución
#   chmod +x start.sh

# Luego ejecutalo con:
#   ./start.sh


echo "Iniciando servidor rosbridge..."
ros2 launch rosbridge_server rosbridge_websocket_launch.xml delay_between_messages:=0.0 &
ROS_PID=$!

echo "Iniciando servidor HTTP..."
python3 -m http.server 8000 &
HTTP_PID=$!

wait $ROS_PID $HTTP_PID