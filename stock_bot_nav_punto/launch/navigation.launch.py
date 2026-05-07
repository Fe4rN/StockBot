"""
Este módulo orquesta el sistema de navegación Nav2 y el nodo navigator del StockBot.

Functions:
  generate_launch_description

"""

import os
import sys

from ament_index_python.packages import get_package_share_directory, PackageNotFoundError
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node

def generate_launch_description():
    """
    Configura el stack de navegación, Rviz2 y el nodo de gestión de puntos.

    Carga la cartografía, los parámetros del planificador y lanza el proceso 
    de bringup de Nav2 validando la existencia de todos los recursos.

    Returns:
      LaunchDescription: La descripción completa del lanzamiento de navegación.

    Raises:
      PackageNotFoundError: Si los paquetes de navegación o el propio no están instalados.
      FileNotFoundError: Si el archivo de mapa o el de parámetros no existen.

    """

    try:
        pkg_dir = get_package_share_directory('stock_bot_nav_punto')
        nav2_pkg_dir = get_package_share_directory('nav2_bringup')
        nav2_launch_file_dir = os.path.join(nav2_pkg_dir, 'launch')

        map_path = os.path.join(pkg_dir, 'map', 'map.yaml')
        param_path = os.path.join(pkg_dir, 'param', 'burger.yaml')
        rviz_config_dir = os.path.join(pkg_dir, 'rviz', 'navigation.rviz')

        if not os.path.exists(map_path):
            raise FileNotFoundError(f"Mapa no encontrado en: {map_path}")
        if not os.path.exists(param_path):
            raise FileNotFoundError(f"Parámetros no encontrados en: {param_path}")

    except PackageNotFoundError as e:
        print(f"❌ ERROR: Paquete faltante: {str(e)}")
        sys.exit(1)
    except FileNotFoundError as e:
        print(f"❌ ERROR DE RECURSO: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ ERROR INESPERADO: {str(e)}")
        sys.exit(1)

    use_sim_time = LaunchConfiguration('use_sim_time', default='true')
    
    map_dir = LaunchConfiguration(
        'map',
        default=map_path)

    param_dir = LaunchConfiguration(
        'params_file',
        default=param_path)

    return LaunchDescription([
        DeclareLaunchArgument(
            'map',
            default_value=map_dir,
            description='Full path to map file to load'),

        DeclareLaunchArgument(
            'params_file',
            default_value=param_dir,
            description='Full path to param file to load'),

        DeclareLaunchArgument(
            'use_sim_time',
            default_value='true',
            description='Use simulation (Gazebo) clock if true'),

        IncludeLaunchDescription(
            PythonLaunchDescriptionSource([nav2_launch_file_dir, '/bringup_launch.py']),
            launch_arguments={
                'map': map_dir,
                'use_sim_time': use_sim_time,
                'params_file': param_dir,
                'autostart': 'true'}.items(),
        ),

        Node(
            package='stock_bot_nav_punto',
            executable='navigator',
            name='navigator',
            parameters=[{'use_sim_time': use_sim_time}],
            output='screen'),
            
        Node(
            package='rviz2',
            executable='rviz2',
            name='rviz2',
            arguments=['-d', rviz_config_dir],
            parameters=[{'use_sim_time': use_sim_time}],
            output='screen'),
    ])