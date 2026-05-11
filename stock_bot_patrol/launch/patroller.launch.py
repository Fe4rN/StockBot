"""
Este módulo define el lanzamiento del nodo de patrullaje autónomo para StockBot.

Functions:
  generate_launch_description

"""

import os
import sys

from ament_index_python.packages import get_package_share_directory, PackageNotFoundError
from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    """
    Genera la descripción de lanzamiento para el nodo patroller.

    Valida la existencia del paquete necesario y configura la ejecución del
    nodo encargado de la lógica de patrulla en el almacén.

    Returns:
      LaunchDescription: La descripción completa de las acciones de lanzamiento.

    Raises:
      PackageNotFoundError: Si el paquete 'stock_bot_patrol' no está instalado.
      Exception: Para cualquier otro error durante la configuración.

    """

    try:
        get_package_share_directory('stock_bot_patrol')
    except PackageNotFoundError:
        print("❌ ERROR: No se encontró el paquete 'stock_bot_patrol'.")
        print("Asegúrate de haber hecho 'colcon build' y el 'source install/setup.bash'.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ ERROR inesperado: {str(e)}")
        sys.exit(1)

    return LaunchDescription([
        Node(
            package='stock_bot_patrol',
            executable='patroller',
            name='patroller_node',
            output='screen',
            parameters=[{'use_sim_time': True}]
        ),
    ])