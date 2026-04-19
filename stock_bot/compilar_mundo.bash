#!/bin/bash

#0. Exportar modelo con camara
export TURTLEBOT3_MODEL=burger_cam

# 1. Ir a la carpeta raíz
cd "$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"

# 2. Cargar ROS Jazzy
source /opt/ros/jazzy/setup.bash

# 3. Compilar
colcon build --symlink-install

# 4. Cargar la instalación que acabamos de crear
source install/setup.bash

# 5. Lanzar
ros2 launch stock_bot_my_world my_world.launch.py
