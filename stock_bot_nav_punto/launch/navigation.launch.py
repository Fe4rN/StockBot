from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    return LaunchDescription([
        Node(
            package='ros_gz_bridge',
            executable='parameter_bridge',
            # Usamos los temas EXACTOS de tu lista gz topic -l
            arguments=[
                '/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock',
                '/odom@nav_msgs/msg/Odometry[gz.msgs.Odometry',
                '/cmd_vel@geometry_msgs/msg/Twist]gz.msgs.Twist'
            ],
            parameters=[{'use_sim_time': True}],
            output='screen'
        ),
        Node(
            package='stock_bot_nav_punto',
            executable='navigator',
            parameters=[{'use_sim_time': True}],
            output='screen'
        )
    ])