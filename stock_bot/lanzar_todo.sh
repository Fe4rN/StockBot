#!/bin/bash

# --- 1. CONFIGURACIÓN ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$SCRIPT_DIR"
[ ! -d "$WORKSPACE_DIR/src" ] && WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"

export TURTLEBOT3_MODEL=burger_cam
export ROS_DOMAIN_ID=5 

# --- 2. CIERRE CONTROLADO (Simulando Ctrl + C) ---
echo "Cerrando sesiones previas de forma limpia..."

# Enviamos SIGINT (-2), que es exactamente lo mismo que pulsar Ctrl+C
pkill -2 -f gazebo
pkill -2 -f nav2
pkill -2 -f rviz2
pkill -2 -f initial_pose_pub
pkill -2 -f patroller
pkill -2 -f robot_state_publisher
pkill -2 -f chatbot

# Damos 3 segundos para que los nodos de ROS cierren sus buffers y TFs
sleep 3

# Si después de 3 segundos queda algo rebelde, entonces sí usamos el hachazo
pkill -9 -f gazebo 2>/dev/null
pkill -9 -f nav2 2>/dev/null

# Reiniciamos el demonio para que la tabla de nodos esté vacía
ros2 daemon stop > /dev/null 2>&1
ros2 daemon start > /dev/null 2>&1

# --- 3. COMPILACIÓN ---
echo "Compilando Workspace..."
cd "$WORKSPACE_DIR" || exit 1
colcon build --symlink-install --packages-select stock_bot_my_world stock_bot_nav_punto stock_bot_patrol stock_bot

source /opt/ros/jazzy/setup.bash
source install/setup.bash

# --- 4. LANZAMIENTO ---

# Terminal 1: Gazebo
gnome-terminal --tab --title="1. GAZEBO" -- bash -c "
source /opt/ros/jazzy/setup.bash; source $WORKSPACE_DIR/install/setup.bash; 
export TURTLEBOT3_MODEL=burger_cam; 
ros2 launch stock_bot_my_world my_world.launch.py; 
exec bash"

sleep 10

# Terminal 2: Navigation 2
gnome-terminal --tab --title="2. NAV2" -- bash -c "
source /opt/ros/jazzy/setup.bash; source $WORKSPACE_DIR/install/setup.bash; 
export TURTLEBOT3_MODEL=burger_cam; 
ros2 launch stock_bot_nav_punto navigation.launch.py use_sim_time:=True; 
exec bash"

# Terminal 3: Pose Inicial
gnome-terminal --tab --title="3. POSE" -- bash -c "
source /opt/ros/jazzy/setup.bash; source $WORKSPACE_DIR/install/setup.bash; 
sleep 25; 
ros2 run stock_bot_nav_punto initial_pose_pub; 
exec bash"

# Terminal 4: Patrulla
gnome-terminal --tab --title="4. PATRULLA" -- bash -c "
source /opt/ros/jazzy/setup.bash; source $WORKSPACE_DIR/install/setup.bash; 
ros2 run stock_bot_patrol patroller; 
exec bash"

# Terminal 5: Chatbot de IA (NUEVO)
gnome-terminal --tab --title="5. CHATBOT IA" -- bash -c "
source /opt/ros/jazzy/setup.bash; source $WORKSPACE_DIR/install/setup.bash; 
ros2 run stock_bot chatbot; 
exec bash"

# Terminal 6: Control
gnome-terminal --tab --title="6. CONTROL" -- bash -c "
source /opt/ros/jazzy/setup.bash; source $WORKSPACE_DIR/install/setup.bash; 
echo 'SISTEMA STOCKBOT COMPLETAMENTE INICIADO'; 
exec bash"

echo "Sistema listo."