#!/bin/bash

# 1. Ir a la carpeta raíz del Repo (StockBot) para verlo todo
cd "$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"

# 2. Cargar ROS Jazzy
source /opt/ros/jazzy/setup.bash

# 3. Compilar (He movido el log-base al principio, que es donde le gusta)
colcon --log-base stock_bot/log build \
  --base-paths stock_bot_my_world \
  --build-base stock_bot/build \
  --install-base stock_bot/install \
  --symlink-install

# 4. Cargar la instalación que acabamos de crear
# Usamos la ruta completa para que no haya pérdida
source stock_bot/install/setup.bash

# 5. Lanzar
# OJO: Si te dice que no encuentra el paquete, comprueba que en tu 
# package.xml el <name> sea exactamente stock_bot_my_world
ros2 launch stock_bot_my_world my_world.launch.py