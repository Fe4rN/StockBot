"""
Este módulo define el lanzamiento del spawner y los bridges para el StockBot.

Functions:
  generate_launch_description

"""

import os
import sys
from ament_index_python.packages import get_package_share_directory, PackageNotFoundError
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node

def generate_launch_description():
    """
    Genera la descripción de lanzamiento para cargar el robot en Gazebo Sim.

    Configura el spawner, el bridge de parámetros y el bridge de imagen 
    gestionando posibles errores de entorno o archivos faltantes.

    Returns:
      LaunchDescription: La descripción completa para el sistema de lanzamiento.

    Raises:
      KeyError: Si la variable TURTLEBOT3_MODEL no está definida.
      PackageNotFoundError: Si el paquete stock_bot_my_world no existe.
      FileNotFoundError: Si el archivo model.sdf o los parámetros no se encuentran.

    """
    
    try:
        TURTLEBOT3_MODEL = os.environ['TURTLEBOT3_MODEL']
        
        pkg_share = get_package_share_directory('stock_bot_my_world')
        model_folder = 'turtlebot3_' + TURTLEBOT3_MODEL
        
        urdf_path = os.path.join(pkg_share, 'models', model_folder, 'model.sdf')
        bridge_params = os.path.join(pkg_share, 'params', model_folder + '_bridge.yaml')

        if not os.path.exists(urdf_path):
            raise FileNotFoundError(f"Falta model.sdf en: {urdf_path}")
        if not os.path.exists(bridge_params):
            raise FileNotFoundError(f"Falta bridge params en: {bridge_params}")

    except KeyError:
        print("❌ ERROR: Define TURTLEBOT3_MODEL (ej: export TURTLEBOT3_MODEL=burger_cam)")
        sys.exit(1)
    except PackageNotFoundError:
        print("❌ ERROR: Paquete 'stock_bot_my_world' no encontrado.")
        sys.exit(1)
    except FileNotFoundError as e:
        print(f"❌ ERROR DE ARCHIVO: {str(e)}")
        sys.exit(1)

    x_pose = LaunchConfiguration('x_pose', default='0.0')
    y_pose = LaunchConfiguration('y_pose', default='0.0')
    z_pose = LaunchConfiguration('z_pose', default='0.2')

    declare_x_position_cmd = DeclareLaunchArgument(
        'x_pose', default_value='0.0',
        description='Specify namespace of the robot')

    declare_y_position_cmd = DeclareLaunchArgument(
        'y_pose', default_value='0.0',
        description='Specify namespace of the robot')

    declare_z_position_cmd = DeclareLaunchArgument(
        'z_pose', default_value='0.2',
        description='Specify namespace of the robot')

    start_gazebo_ros_spawner_cmd = Node(
        package='ros_gz_sim',
        executable='create',
        arguments=[
            '-name', TURTLEBOT3_MODEL,
            '-file', urdf_path,
            '-x', x_pose,
            '-y', y_pose,
            '-z', z_pose
        ],
        output='screen',
    )

    start_gazebo_ros_bridge_cmd = Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        arguments=[
            '--ros-args',
            '-p',
            f'config_file:={bridge_params}',
        ],
        output='screen',
    )

    start_gazebo_ros_image_bridge_cmd = Node(
        package='ros_gz_image',
        executable='image_bridge',
        arguments=['/camera/image_raw'],
        output='screen',
    )

    ld = LaunchDescription()

    ld.add_action(declare_x_position_cmd)
    ld.add_action(declare_y_position_cmd)
    ld.add_action(declare_z_position_cmd)
    ld.add_action(start_gazebo_ros_spawner_cmd)
    ld.add_action(start_gazebo_ros_bridge_cmd)
    
    # Lógica de cámara: Se activará porque 'burger_cam' != 'burger'
    ld.add_action(start_gazebo_ros_image_bridge_cmd) if TURTLEBOT3_MODEL != 'burger' else None

    return ld