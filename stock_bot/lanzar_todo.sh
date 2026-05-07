#!/bin/bash

"""
Script de lanzamiento maestro para StockBot - Sprint 3.

Este script automatiza:
  1. Limpieza total de procesos y caché de Gazebo.
  2. Detección automática del workspace (Portable para el equipo).
  3. Compilación con colcon.
  4. Lanzamiento orquestado en terminales independientes con tiempos de espera seguros.

Usage:
  ./lanzar_todo.sh
"""

# --- 1. CONFIGURACIÓN Y PORTABILIDAD ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$SCRIPT_DIR"

# Si el script se lanza desde dentro de 'src' o un paquete, sube a la raíz
if [ ! -d "$WORKSPACE_DIR/src" ]; then
    WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
fi

export TURTLEBOT3_MODEL=burger_cam
# Asegura que no haya líos con otros equipos en la UPV
export ROS_DOMAIN_ID=5 

# --- 2. LIMPIEZA PROFUNDA (Anti-errores de posición) ---
echo "🧹 Limpiando procesos zombis y caché de Gazebo..."
pkill -9 -f gazebo; pkill -9 -f nav2; pkill -9 -f rviz2; pkill -9 -f initial_pose_pub; pkill -9 -f patroller

# Borramos la 'memoria' de Gazebo para que el robot no spawnee en el último sitio
rm -rf ~/.gz/sim/*

# --- 3. COMPILACIÓN ---
echo "🛠️ Compilando Workspace en: $WORKSPACE_DIR"
cd "$WORKSPACE_DIR" || { echo "❌ Error: Carpeta no encontrada"; exit 1; }

if colcon build --symlink-install; then
    echo "✅ Compilación terminada con éxito."
else
    echo "❌ ERROR: Falló la compilación. Revisa el código de los nodos."
    exit 1
fi

source /opt/ros/jazzy/setup.bash
source install/setup.bash

# --- 4. LANZAMIENTO ORQUESTADO ---
echo "🚀 Abriendo terminales de control..."

# Terminal 1: Gazebo Sim (El Mundo)
gnome-terminal --tab --title="1. MUNDO GAZEBO" -- bash -c "
source /opt/ros/jazzy/setup.bash; 
source $WORKSPACE_DIR/install/setup.bash; 
export TURTLEBOT3_MODEL=burger_cam; 
ros2 launch stock_bot_my_world my_world.launch.py; 
exec bash"

# Esperamos a que Gazebo cargue los modelos y el entorno
sleep 8

# Terminal 2: Navigation 2 (AMCL y Map Server)
gnome-terminal --tab --title="2. NAVEGACIÓN" -- bash -c "
source /opt/ros/jazzy/setup.bash; 
source $WORKSPACE_DIR/install/setup.bash; 
export TURTLEBOT3_MODEL=burger_cam; 
ros2 launch stock_bot_nav_punto navigation.launch.py use_sim_time:=True; 
exec bash"

# Terminal 3: Pose Inicial (Tu nodo de sincronización)
# Aumentamos el sleep a 25s para que AMCL esté totalmente listo
gnome-terminal --tab --title="3. LOCALIZACIÓN" -- bash -c "
source /opt/ros/jazzy/setup.bash; 
source $WORKSPACE_DIR/install/setup.bash; 
sleep 25; 
echo '📍 Forzando pose inicial manual...';
ros2 run stock_bot_nav_punto initial_pose_pub; 
exec bash"

# Terminal 4: Patroller (Lógica de patrulla)
gnome-terminal --tab --title="4. PATRULLA" -- bash -c "
source /opt/ros/jazzy/setup.bash; 
source $WORKSPACE_DIR/install/setup.bash; 
ros2 run stock_bot_patrol patroller; 
exec bash"

# Terminal 5: CONTROL (Para tus comandos manuales)
gnome-terminal --tab --title="5. CONSOLA CONTROL" -- bash -c "
source /opt/ros/jazzy/setup.bash; 
source $WORKSPACE_DIR/install/setup.bash; 
echo '🎮 CONTROLADOR DE STOCKBOT LISTO';
echo '------------------------------------------------';
echo 'Comando ir a punto: ros2 service call /ir_a_estanteria stock_bot_interfaces/srv/GoToPoint \"{point_id: 1}\"';
echo 'Comando patrulla:  ros2 service call /control_patrulla stock_bot_interfaces/srv/GoToPoint \"{point_id: 1}\"';
echo '------------------------------------------------';
exec bash"

echo "🏁 Todo el sistema desplegado."