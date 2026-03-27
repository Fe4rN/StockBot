import rclpy
from rclpy.node import Node
from stock_bot_interfaces.srv import GoToPoint
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
import math

class SimpleNavigator(Node):
    def __init__(self):
        super().__init__('simple_navigator')
        # Coordenadas absolutas según tu prueba
        self.declare_parameter('punto1', [4.73, -4.8]) 
        
        self.vel_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.odom_sub = self.create_subscription(Odometry, '/odom', self.odom_callback, 10)
        self.srv = self.create_service(GoToPoint, 'ir_a_estanteria', self.service_callback)

        self.target_x, self.target_y = None, None
        self.get_logger().info('Navegador StockBot iniciado y vinculado a /odom y /cmd_vel')

    def odom_callback(self, msg):
        self.current_x = msg.pose.pose.position.x
        self.current_y = msg.pose.pose.position.y
        q = msg.pose.pose.orientation
        self.current_yaw = math.atan2(2*(q.w*q.z + q.x*q.y), 1 - 2*(q.y*q.y + q.z*q.z))
        if self.target_x is not None:
            self.control_loop()

    def service_callback(self, request, response):
        coords = self.get_parameter(f'punto{request.point_id}').value
        self.target_x = coords[0]
        self.target_y = coords[1]
        
        response.success = True
        # Ahora el servicio sí devuelve un mensaje
        response.message = f"Iniciando navegación a X:{self.target_x} Y:{self.target_y}"
        self.get_logger().info(response.message)
        return response

    def control_loop(self):
        dist = math.sqrt((self.target_x - self.current_x)**2 + (self.target_y - self.current_y)**2)
        angle_to_target = math.atan2(self.target_y - self.current_y, self.target_x - self.current_x)
        angle_error = angle_to_target - self.current_yaw
        
        while angle_error > math.pi: angle_error -= 2*math.pi
        while angle_error < -math.pi: angle_error += 2*math.pi

        msg = Twist()
        if dist < 0.25:
            self.target_x = None
            self.get_logger().info('¡OBJETIVO ALCANZADO!')
            self.vel_pub.publish(msg)
            return

        if abs(angle_error) > 0.1:
            msg.angular.z = 0.2 if angle_error > 0 else -0.2
            msg.linear.x = 0.0
            
        else:
            msg.linear.x = 0.15
            
            giro_calculado = 1.5 * angle_error 
            
            if giro_calculado > 0.2:
                giro_calculado = 0.2
            elif giro_calculado < -0.2:
                giro_calculado = -0.2
                
            msg.angular.z = giro_calculado
            
        self.vel_pub.publish(msg)

def main():
    rclpy.init()
    node = SimpleNavigator()
    rclpy.spin(node)
    rclpy.shutdown()