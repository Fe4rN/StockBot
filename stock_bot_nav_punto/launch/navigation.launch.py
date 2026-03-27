import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node

def generate_launch_description():
    # 1. Directorios del paquete (Dinámicos para que funcionen en cualquier PC)
    pkg_share = get_package_share_directory('stock_bot_nav_punto')
    nav2_bringup_dir = get_package_share_directory('nav2_bringup')

    # 2. Configuraciones (Como en el Colab)
    use_sim_time = LaunchConfiguration('use_sim_time', default='true')
    
    map_dir = LaunchConfiguration(
        'map',
        default=os.path.join(pkg_share, 'map', 'map.yaml'))

    param_dir = LaunchConfiguration(
        'params_file',
        default=os.path.join(pkg_share, 'param', 'burger.yaml'))

    rviz_config_dir = os.path.join(pkg_share, 'rviz', 'navigation.rviz')

    return LaunchDescription([
        # Declaración de argumentos (Estilo Colab)
        DeclareLaunchArgument(
            'map', default_value=map_dir,
            description='Ruta completa al archivo del mapa'),

        DeclareLaunchArgument(
            'params_file', default_value=param_dir,
            description='Ruta completa al archivo de parámetros (.yaml)'),

        DeclareLaunchArgument(
            'use_sim_time', default_value='true',
            description='Usar tiempo de simulación (Gazebo)'),

        # 3. EL PUENTE (ROS <-> Gazebo) - Necesario para que el robot vea y oiga
        Node(
            package='ros_gz_bridge',
            executable='parameter_bridge',
            arguments=[
                '/cmd_vel@geometry_msgs/msg/Twist@gz.msgs.Twist',
                '/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock',
                '/scan@sensor_msgs/msg/LaserScan[gz.msgs.LaserScan',
                '/odom@nav_msgs/msg/Odometry[gz.msgs.Odometry',
                '/tf@tf2_msgs/msg/TFMessage[gz.msgs.Pose_V',
                '/tf_static@tf2_msgs/msg/TFMessage[gz.msgs.Pose_V'
            ],
            parameters=[{'qos_overrides./tf_static.publisher.durability': 'transient_local'}],
            output='screen'
        ),

        # 4. INCLUIR EL BRINGUP DE NAV2 (Capa de Control y Servidores)
        # Esto arranca Planner, Controller, BT Navigator, etc.
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(os.path.join(nav2_bringup_dir, 'launch', 'bringup_launch.py')),
            launch_arguments={
                'map': map_dir,
                'use_sim_time': use_sim_time,
                'params_file': param_dir,
                'autostart': 'true'
            }.items(),
        ),

        # 5. TU NODO NAVEGADOR (El que recibe el servicio)
        Node(
            package='stock_bot_nav_punto',
            executable='navigator',
            output='screen',
            parameters=[{'use_sim_time': use_sim_time}]
        ),

        # 6. TU NODO DE POSICIÓN INICIAL AUTOMÁTICA
        Node(
            package='stock_bot_nav_punto',
            executable='initial_pose_pub',
            output='screen',
            parameters=[{'use_sim_time': use_sim_time}]
        ),

        # 7. RVIZ2 (Con tu configuración)
        Node(
            package='rviz2',
            executable='rviz2',
            name='rviz2',
            arguments=['-d', rviz_config_dir],
            parameters=[{'use_sim_time': use_sim_time}],
            output='screen'),
    ])