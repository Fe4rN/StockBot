#!/bin/bash

# 1. Obtener la ruta de la carpeta raíz del Repo (StockBot)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Subimos un nivel para encontrar la carpeta del paquete real
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
PACKAGE_DIR="$REPO_ROOT/stock_bot_my_world"
WS_SRC="$HOME/turtlebot3_ws/src"

echo "Buscando paquete en: $PACKAGE_DIR"

# 2. Crear el enlace simbólico al paquete REAL
if [ -d "$PACKAGE_DIR" ]; then
    # Borramos enlace viejo si existe
    rm -f "$WS_SRC/my_world"
    echo "Enlazando stock_bot_my_world..."
    ln -s "$PACKAGE_DIR" "$WS_SRC/my_world"
else
    echo "ERROR: No se encuentra la carpeta stock_bot_my_world"
    exit 1
fi

# 3. Ir al workspace y compilar
cd ~/turtlebot3_ws
source /opt/ros/jazzy/setup.bash

# Limpiamos para evitar que use el package.xml vacío de antes
rm -rf build/my_world install/my_world

colcon build --packages-select my_world --symlink-install

# 4. Cargar y lanzar
source install/setup.bash
ros2 launch my_world my_world.launch.py