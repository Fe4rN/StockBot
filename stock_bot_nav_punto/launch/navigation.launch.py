from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    return LaunchDescription([

        Node(
            package='ros_gz_bridge',
            executable='parameter_bridge',
            arguments=[
                '/clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock]',
                '/odom@nav_msgs/msg/Odometry[gz.msgs.Odometry]',
                '/cmd_vel@geometry_msgs/msg/TwistStamped[gz.msgs.Twist]'
            ],
            output='screen'
        ),

        Node(
            package='stock_bot_nav_punto',
            executable='navigator',
            output='screen',
        )
    ])