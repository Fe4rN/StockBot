import rclpy
from rclpy.node import Node
from rclpy.action import ActionClient
from nav2_msgs.action import NavigateToPose
from stock_bot_interfaces.srv import GoToPoint

class SimpleNavigator(Node):
    def __init__(self):
        super().__init__('simple_navigator')
        
        # Puntos del T01
        self.declare_parameter('punto1', [4.73, -4.8])
        self.declare_parameter('punto2', [2.0, 3.0])
        
        # Cliente de acción para Nav2
        self.nav_client = ActionClient(self, NavigateToPose, 'navigate_to_pose')
        
        # Servicio
        self.srv = self.create_service(GoToPoint, 'ir_a_estanteria', self.service_callback)
        
        self.get_logger().info('Navegador StockBot listo. Esperando cliente del servicio...')

    def service_callback(self, request, response):
        punto_solicitado = f'punto{request.point_id}'
        
        if not self.has_parameter(punto_solicitado):
             response.success = False
             response.message = f"Error: {punto_solicitado} no configurado."
             return response
             
        coords = self.get_parameter(punto_solicitado).value
        self.get_logger().info(f"Yendo a {punto_solicitado}: X={coords[0]}, Y={coords[1]}")
        
        self.send_nav2_goal(coords[0], coords[1])
        
        response.success = True
        response.message = f"Navegando a {punto_solicitado}"
        return response

    def send_nav2_goal(self, x, y):
        # Espera hasta 10 segundos a que Nav2 despierte
        if not self.nav_client.wait_for_server(timeout_sec=10.0):
            self.get_logger().error('¡ERROR! El servidor de Nav2 no responde.')
            return

        goal_msg = NavigateToPose.Goal()
        goal_msg.pose.header.frame_id = 'map'
        goal_msg.pose.header.stamp = self.get_clock().now().to_msg()
        
        goal_msg.pose.pose.position.x = float(x)
        goal_msg.pose.pose.position.y = float(y)
        goal_msg.pose.pose.orientation.w = 1.0

        self.nav_client.send_goal_async(goal_msg)

def main():
    rclpy.init()
    node = SimpleNavigator()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()