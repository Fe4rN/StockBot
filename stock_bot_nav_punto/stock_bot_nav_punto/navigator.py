import rclpy
from rclpy.node import Node
from rclpy.action import ActionClient
from rclpy.executors import MultiThreadedExecutor
from rclpy.callback_groups import ReentrantCallbackGroup
from nav2_msgs.action import NavigateToPose
from stock_bot_interfaces.srv import GoToPoint
from geometry_msgs.msg import PoseStamped

class SimpleNavigator(Node):
    def __init__(self):
        super().__init__('simple_navigator')
        
        self.group = ReentrantCallbackGroup()
        
        self.declare_parameter('punto1', [7.0, -1.0])
        self.declare_parameter('punto2', [8.32, -6.3])
        
        self.nav_client = ActionClient(
            self, 
            NavigateToPose, 
            'navigate_to_pose',
            callback_group=self.group
        )

        self.srv = self.create_service(
            GoToPoint, 
            'ir_a_estanteria', 
            self.service_callback,
            callback_group=self.group
        )
        
        self.get_logger().info('Navegador StockBot (Multi-hilo) listo. Esperando comando...')

    async def service_callback(self, request, response):
        """Método asíncrono que no bloquea el nodo"""
        punto_solicitado = f'punto{request.point_id}'
        
        if not self.has_parameter(punto_solicitado):
             response.success = False
             response.message = f"Error: El punto {request.point_id} no existe."
             return response
             
        coords = self.get_parameter(punto_solicitado).value
        self.get_logger().info(f"Petición recibida: Yendo a {punto_solicitado} ({coords[0]}, {coords[1]})...")

        success = await self.send_nav2_goal(coords[0], coords[1])
        
        if success:
            response.success = True
            response.message = f"¡Éxito! El robot ha llegado al {punto_solicitado}."
        else:
            response.success = False
            response.message = f"Fallo: El robot no pudo llegar al {punto_solicitado}."
            
        return response

    async def send_nav2_goal(self, x, y):
        if not self.nav_client.wait_for_server(timeout_sec=5.0):
            self.get_logger().error('Servidor Nav2 no disponible (timeout).')
            return False

        goal_msg = NavigateToPose.Goal()
        goal_msg.pose.header.frame_id = 'map'
        goal_msg.pose.header.stamp = self.get_clock().now().to_msg()
        goal_msg.pose.pose.position.x = float(x)
        goal_msg.pose.pose.position.y = float(y)
        goal_msg.pose.pose.orientation.w = 1.0  

        self.get_logger().info('Enviando coordenadas a Nav2...')
        
        try:
            send_goal_future = await self.nav_client.send_goal_async(goal_msg)

            if not send_goal_future.accepted:
                self.get_logger().error('Nav2 ha rechazado el objetivo.')
                return False

            self.get_logger().info('Objetivo aceptado por Nav2. Navegando...')

            result_future = await send_goal_future.get_result_async()
            status = result_future.status

            if status == 4: 
                self.get_logger().info('¡Llegada confirmada!')
                return True
            else:
                self.get_logger().warn(f'Nav2 falló con estado: {status}')
                return False
                
        except Exception as e:
            self.get_logger().error(f'Error durante la navegación: {str(e)}')
            return False

def main():
    rclpy.init()
    node = SimpleNavigator()

    executor = MultiThreadedExecutor()
    executor.add_node(node)

    try:
        executor.spin()
    except (KeyboardInterrupt, RuntimeError):
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()