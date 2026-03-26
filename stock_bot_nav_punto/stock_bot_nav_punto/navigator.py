import rclpy
from rclpy.node import Node
from stock_bot_interfaces.srv import GoToPoint
from geometry_msgs.msg import Twist, TwistStamped
from nav_msgs.msg import Odometry
import math

class SimpleNavigator(Node):
    def __init__(self):
        super().__init__('simple_navigator')
        self.declare_parameter('punto1', [6.73, -2.5])
        self.declare_parameter('punto2', [-3.8, -5.8])
        
        self.vel_pub = self.create_publisher(TwistStamped, '/cmd_vel', 10)
        self.odom_sub = self.create_subscription(Odometry, '/odom', self.odom_callback, 10)
        self.srv = self.create_service(GoToPoint, 'ir_a_estanteria', self.service_callback)

        self.current_x = 0.0
        self.current_y = 0.0
        self.current_yaw = 0.0
        self.target_x = None
        self.target_y = None
        self.last_odom_time = None

        # Comprobación periódica de salud: odometría y estado
        self.create_timer(2.0, self.health_check)
        self.get_logger().info('Navegador ULTRA-LIGERO listo. Sin Nav2.')

    def odom_callback(self, msg):
        self.current_x = msg.pose.pose.position.x
        self.current_y = msg.pose.pose.position.y
        q = msg.pose.pose.orientation
        siny_cosp = 2 * (q.w * q.z + q.x * q.y)
        cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z)
        self.current_yaw = math.atan2(siny_cosp, cosy_cosp)
        
        # Registrar último tiempo de odometría recibido
        try:
            self.last_odom_time = self.get_clock().now()
        except Exception:
            self.last_odom_time = None

        if self.target_x is not None:
            self.control_loop()

    def service_callback(self, request, response):
        param_name = f'punto{request.point_id}'
        if not self.has_parameter(param_name):
            response.success = False
            return response
        
        coords = self.get_parameter(param_name).value
        self.target_x, self.target_y = coords[0], coords[1]
        self.get_logger().info(f'Yendo al punto {request.point_id}: {coords}')
        response.success = True
        return response

    def control_loop(self):
        dist = math.sqrt((self.target_x - self.current_x)**2 + (self.target_y - self.current_y)**2)
        angle_to_target = math.atan2(self.target_y - self.current_y, self.target_x - self.current_x)
        angle_error = angle_to_target - self.current_yaw
        
        # Normalizar ángulo
        while angle_error > math.pi: angle_error -= 2*math.pi
        while angle_error < -math.pi: angle_error += 2*math.pi

        # Publicar TwistStamped para compatibilidad con bridges que esperan TwistStamped
        twist = Twist()
        msg = TwistStamped()
        
        # 1. ¿HEMOS LLEGADO?
        if dist < 0.15:
            self.target_x = None
            self.get_logger().info('¡OBJETIVO ALCANZADO!')
            msg.header.stamp = self.get_clock().now().to_msg()
            msg.twist = twist
            self.vel_pub.publish(msg)
            return

        # 2. ¿ESTAMOS APUNTANDO BIEN? (Margen de 0.05 rad ≈ 3 grados)
        # Si el error es mayor de 3 grados, NO se mueve hacia adelante, SOLO gira.
        if abs(angle_error) > 0.05:
            twist.linear.x = 0.0  # Parado
            twist.angular.z = 0.4 if angle_error > 0 else -0.4
            self.get_logger().info(f'Girando... Error: {angle_error:.2f}', throttle_duration_sec=1.0)
        
        # 3. SI APUNTA BIEN, AVANZA
        else:
            twist.linear.x = 0.2
            twist.angular.z = 0.0 # Recto como una flecha
            self.get_logger().info(f'Avanzando... Dist: {dist:.2f}', throttle_duration_sec=1.0)

        msg.header.stamp = self.get_clock().now().to_msg()
        msg.twist = twist
        self.vel_pub.publish(msg)

    def health_check(self):
        # Si no recibimos odometría reciente, avisar
        if self.last_odom_time is None:
            self.get_logger().warn('No se ha recibido /odom aún.')
            return
        age = (self.get_clock().now() - self.last_odom_time).nanoseconds / 1e9
        if age > 1.5:
            self.get_logger().warn(f'Odom desactualizada ({age:.1f}s). Revise el bridge.')
        else:
            # Mostrar yaw para depuración ligera
            self.get_logger().debug(f'Yaw actual: {self.current_yaw:.3f}')

def main():
    rclpy.init()
    node = SimpleNavigator()
    rclpy.spin(node)
    rclpy.shutdown()