# StockBot

### StockBot es un pequeño robot que te ayuda a mantener un control de inventario de tu almacén, a la vez que te ayuda con la seguridad e integridad de las instalaciones. Todo esto desde una interfaz web amigable e interactiva.

### StockBot puede patrullar tu almacén, ser enviado a un punto en concreto o ser pilotado libremente con un feed de camera en tiempo real.

---
#### Proyecto desarrollado para el Proyecto de Robótica, impartido por la Escuela Politécnica Superior de Gandia para el Segundo Semestre del Tercer Curso.

### Integrantes del equipo:
- Fedor Tikhomirov
- David Bayona Luján
- Álvaro Marraes Arévalo
- Adrián Jauregui Felipe
- Alexandru Daniel David Berndt

---

# Ejecución. (desde la carpeta raíz del proyecto)

## Instalación y setup

 Para ejecutar el proyecto se requiere:
1. Ubuntu
2. ROS2
3. Clonar el repositorio
4. Ejecutar el siguiente código al iniciar una terminal:
``` bash
    source /opt/ros/jazzy/setup.bash
    export TURTLEBOT3_MODEL=burger
    export GAZEBO_MODEL_PATH=$GAZEBO_MODEL_PATH:/opt/ros/jazzy/share/turtlebot3_gazebo/models
```

## Gazebo (Terminal 1).

```bash
    colcon build --symlink-install
    source ../install/setup.bash
    ros2 launch stock_bot_my_world my_world.launch.py
```

## Mapa y navegador (Terminal 2).

```bash
    source ../install/setup.bash
    ros2 launch stock_bot_nav_punto navigation.launch.py use_sim_time:=True
```

## Servicio de patrulla (Terminal 3).

```bash
    source ../install/setup.bash
    ros2 run stock_bot_patrol patroller
```

## Interfaz web (Terminal 4).

1. Asegurarse de que el archivo de lanzamiento (*start.sh*) tiene permisos de ejecución:

```bash
    cd Interfaz_Web/
    chmod +x start.sh
```
2. Ejecutar el archivo de lanzamiento
```bash
   cd Interfaz_Web/
   source ../install/setup.bash
   ./start.sh
```