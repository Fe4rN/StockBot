import rclpy
from rclpy.node import Node
from rclpy.action import ActionClient
from nav2_msgs.action import NavigateToPose
from stock_bot_interfaces.srv import GoToPoint
from geometry_msgs.msg import PoseStamped
from rclpy.executors import MultiThreadedExecutor

class SimpleNavigator(Node):
    def __init__(self):
        super().__init__('simple_navigator')
        
        # 1. Parámetros de los puntos (Coordenadas de las estanterías)
        self.declare_parameter('punto1', [7.0, -0.8])
        self.declare_parameter('punto2', [8.32, -6.3])
        
        # 2. Cliente de acción para hablar con el BT Navigator de Nav2
        self.nav_client = ActionClient(self, NavigateToPose, 'navigate_to_pose')
        
        # 3. Servicio que espera la llamada del usuario
        self.srv = self.create_service(GoToPoint, 'ir_a_estanteria', self.service_callback)
        
        self.get_logger().info('Navegador StockBot listo. Esperando comando...')

    async def service_callback(self, request, response):
        """Este método ahora es ASÍNCRONO para poder esperar a Nav2"""
        punto_solicitado = f'punto{request.point_id}'
        
        if not self.has_parameter(punto_solicitado):
             response.success = False
             response.message = f"Error: El punto {request.point_id} no existe en la configuración."
             return response
             
        coords = self.get_parameter(punto_solicitado).value
        self.get_logger().info(f"Petición recibida: Yendo a {punto_solicitado}...")

        # 4. Enviar el objetivo y ESPERAR el resultado
        success = await self.send_nav2_goal(coords[0], coords[1])
        
        if success:
            response.success = True
            response.message = f"¡Éxito! El robot ha llegado al {punto_solicitado}."
        else:
            response.success = False
            response.message = f"Fallo: El robot no pudo llegar al {punto_solicitado}."
            
        return response

    async def send_nav2_goal(self, x, y):
        # Esperar al servidor (Capa de Orquestación)
        if not self.nav_client.wait_for_server(timeout_sec=5.0):
            self.get_logger().error('Servidor Nav2 no disponible.')
            return False

        # Configurar el mensaje del objetivo
        goal_msg = NavigateToPose.Goal()
        goal_msg.pose.header.frame_id = 'map'
        goal_msg.pose.header.stamp = self.get_clock().now().to_msg()
        goal_msg.pose.pose.position.x = float(x)
        goal_msg.pose.pose.position.y = float(y)
        goal_msg.pose.pose.orientation.w = 1.0 # Mirando al frente

        self.get_logger().info('Enviando coordenadas al Planner Server...')
        
        # Enviar el objetivo
        send_goal_future = await self.nav_client.send_goal_async(goal_msg)

        if not send_goal_future.accepted:
            self.get_logger().error('El objetivo fue rechazado por el Planificador.')
            return False

        self.get_logger().info('Objetivo aceptado. Nav2 está trabajando...')

        # ESPERAR el resultado final (Finalización de la Tarea)
        result_future = await send_goal_future.get_result_async()
        status = result_future.status

        if status == 4: # STATUS_SUCCEEDED (Llegada con éxito)
            return True
        else:
            self.get_logger().warn(f'Nav2 terminó con estado de error: {status}')
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