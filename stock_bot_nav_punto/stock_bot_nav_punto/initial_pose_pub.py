import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseWithCovarianceStamped
import time

class InitialPosePub(Node):
    def __init__(self):
        super().__init__('initial_pose_pub')
        self.publisher_ = self.create_publisher(PoseWithCovarianceStamped, '/initialpose', 10)
        # Esperamos un poco a que AMCL se asiente
        self.timer = self.create_timer(5.0, self.publish_pose)

    def publish_pose(self):
        msg = PoseWithCovarianceStamped()
        msg.header.frame_id = 'map'
        msg.header.stamp = self.get_clock().now().to_msg()
        
        msg.pose.pose.position.x = 2.0
        msg.pose.pose.position.y = -0.5
        msg.pose.pose.orientation.w = 1.0
        
        # Publicamos un par de veces para asegurar
        for _ in range(3):
            self.publisher_.publish(msg)
            time.sleep(0.1)
            
        self.get_logger().info('¡Posición inicial fijada con éxito!')
        raise SystemExit # Se cierra solo tras cumplir su misión

def main(args=None):
    rclpy.init(args=args)
    node = InitialPosePub()
    try:
        rclpy.spin(node)
    except SystemExit:
        pass
    rclpy.shutdown()