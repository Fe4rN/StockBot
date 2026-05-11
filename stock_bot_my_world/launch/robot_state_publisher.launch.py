#!/usr/bin/env python3
"""
Este módulo define el lanzamiento del nodo que publica el estado del robot.

Maneja la carga del modelo URDF y gestiona posibles errores de configuración
mediante excepciones.

Functions:
  generate_launch_description

"""

import os
import sys

from ament_index_python.packages import get_package_share_directory, PackageNotFoundError
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch.substitutions import PythonExpression
from launch_ros.actions import Node

def generate_launch_description():
    """
    Genera la configuración para el robot_state_publisher con manejo de errores.

    Lee el modelo del robot validando que las variables de entorno y los archivos
    necesarios existan antes de proceder con el lanzamiento.

    Returns:
      LaunchDescription: La descripción de las acciones para ROS 2.

    Raises:
      RuntimeError: Si falta la variable de entorno o no se encuentra el archivo URDF.

    """
    # 1. Validación de la variable de entorno
    try:
        turtlebot3_model = os.environ['TURTLEBOT3_MODEL']
    except KeyError:
        print("❌ ERROR: La variable de entorno 'TURTLEBOT3_MODEL' no está definida.")
        print("Sugerencia: Ejecuta 'export TURTLEBOT3_MODEL=burger'")
        sys.exit(1)

    # Configuraciones de lanzamiento
    use_sim_time = LaunchConfiguration('use_sim_time', default='true')
    urdf_file_name = 'turtlebot3_' + turtlebot3_model + '.urdf'
    frame_prefix = LaunchConfiguration('frame_prefix', default='')

    # 2. Validación de archivos y paquetes
    try:
        package_dir = get_package_share_directory('stock_bot_my_world')
        urdf_path = os.path.join(package_dir, 'urdf', urdf_file_name)
        
        if not os.path.exists(urdf_path):
            raise FileNotFoundError(f"El archivo {urdf_file_name} no existe en {urdf_path}")
            
        with open(urdf_path, 'r') as infp:
            robot_desc = infp.read()

    except PackageNotFoundError:
        print("❌ ERROR: No se encontró el paquete 'stock_bot_my_world'.")
        sys.exit(1)
    except FileNotFoundError as e:
        print(f"❌ ERROR: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ ERROR inesperado al leer el URDF: {str(e)}")
        sys.exit(1)

    return LaunchDescription([
        DeclareLaunchArgument(
            'use_sim_time',
            default_value='false',
            description='Use simulation (Gazebo) clock if true'),
        
        Node(
            package='robot_state_publisher',
            executable='robot_state_publisher',
            name='robot_state_publisher',
            output='screen',
            parameters=[{
                'use_sim_time': use_sim_time,
                'robot_description': robot_desc,
                'frame_prefix': PythonExpression(["'", frame_prefix, "/'"])
            }],
        ),
    ])