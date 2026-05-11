"""
Este módulo implementa el navegador principal del StockBot mediante servicios y acciones.

Gestiona la recepción de puntos de estantería desde la web y coordina la 
navegación autónoma utilizando el stack de Nav2.

Classes:
  SimpleNavigator

"""

import rclpy
from rclpy.node import Node
from rclpy.action import ActionClient
from rclpy.executors import MultiThreadedExecutor
from rclpy.callback_groups import ReentrantCallbackGroup
from nav2_msgs.action import NavigateToPose
from stock_bot_interfaces.srv import GoToPoint
from geometry_msgs.msg import PoseStamped
import sys
import json
from std_msgs.msg import String

class SimpleNavigator(Node):
    """
    Nodo que traduce peticiones de servicio en objetivos de navegación para Nav2.

    Attributes:
      group (ReentrantCallbackGroup): Grupo que permite ejecución concurrente de callbacks.
      nav_client (ActionClient): Cliente para comunicarse con el servidor de Nav2.
      srv (Service): Servidor que escucha las peticiones.

    Methods:
      service_callback(request, response): Procesa la petición del servicio.
      send_nav2_goal(x, y): Envía y gestiona el objetivo de la acción Nav2.

    """

    def __init__(self):
        """ Inicializa el nodo, parámetros y clientes de comunicación. """
        super().__init__('simple_navigator')
        
        try:
            # Grupo necesario para que el servicio no bloquee la acción
            self.group = ReentrantCallbackGroup()
            
            # Definición de puntos preestablecidos del almacén
            self.declare_parameter('punto1', [7.0, -1.0])
            self.declare_parameter('punto2', [8.32, -6.3])
            
            self.notif_pub = self.create_publisher(String, '/notificaciones_robot', 10)

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
            
            self.get_logger().info('✅ Navegador StockBot (Multi-hilo) listo. Esperando comando...')
        except Exception as e:
            self.get_logger().error(f'❌ Error crítico en la inicialización: {str(e)}')
            sys.exit(1)
    
    def enviar_notificacion(self, mensaje, nivel="info"):
        """Función auxiliar para enviar notificaciones a la web"""
        msg = String()
        datos = {
            "mensaje": mensaje,
            "nivel": nivel
        }
        msg.data = json.dumps(datos)
        self.notif_pub.publish(msg)

    async def service_callback(self, request, response):
        """
        Gestiona la petición de ir a una estantería específica.

        Args:
          request (GoToPoint.Request): Contiene el ID del punto solicitado.
          response (GoToPoint.Response): Contiene el éxito y mensaje de retorno.

        Returns:
          GoToPoint.Response: Respuesta para el cliente del servicio (Web).
        """
        try:
            punto_solicitado = f'punto{request.point_id}'
            
            if not self.has_parameter(punto_solicitado):
                 self.enviar_notificacion(f"Intento de ir a un punto inexistente ({request.point_id})", "warning")
                 response.success = False
                 response.message = f"Error: El punto {request.point_id} no existe."
                 return response
                 
            coords = self.get_parameter(punto_solicitado).value
            self.enviar_notificacion(f"Iniciando ruta hacia la estantería: {punto_solicitado}", "info")
            self.get_logger().info(f"📍 Petición recibida: Yendo a {punto_solicitado} ({coords[0]}, {coords[1]})...")

            # Esperamos a que la navegación termine de forma asíncrona
            success = await self.send_nav2_goal(coords[0], coords[1])
            
            if success:
                self.enviar_notificacion(f"El robot ha llegado a su destino ({punto_solicitado})", "success")
                response.success = True
                response.message = f"¡Éxito! El robot ha llegado al {punto_solicitado}."
            else:
                self.enviar_notificacion(f"Fallo en la navegación. El robot no pudo alcanzar {punto_solicitado}", "error")
                response.success = False
                response.message = f"Fallo: El robot no pudo llegar al {punto_solicitado}."
                
            return response
        except Exception as e:
            self.enviar_notificacion(f"Error interno en el navegador: {str(e)}", "error")
            self.get_logger().error(f'❌ Error en callback del servicio: {str(e)}')
            response.success = False
            response.message = f"Error interno: {str(e)}"
            return response

    async def send_nav2_goal(self, x, y):
        """
        Envía las coordenadas al Action Server de Nav2.

        Args:
          x (float): Coordenada X del mapa.
          y (float): Coordenada Y del mapa.

        Returns:
          bool: True si el robot llegó al destino, False en caso contrario.

        Raises:
          Exception: Si ocurre un error de comunicación con el Action Server.
        """
        try:
            if not self.nav_client.wait_for_server(timeout_sec=5.0):
                self.get_logger().error('❌ Servidor Nav2 no disponible.')
                return False

            goal_msg = NavigateToPose.Goal()
            goal_msg.pose.header.frame_id = 'map'
            goal_msg.pose.header.stamp = self.get_clock().now().to_msg()
            goal_msg.pose.pose.position.x = float(x)
            goal_msg.pose.pose.position.y = float(y)
            goal_msg.pose.pose.orientation.w = 1.0  

            self.get_logger().info('Enviando coordenadas a Nav2...')
            
            send_goal_future = await self.nav_client.send_goal_async(goal_msg)

            if not send_goal_future.accepted:
                self.get_logger().error('🛑 Nav2 ha rechazado el objetivo.')
                return False

            self.get_logger().info('✅ Objetivo aceptado. Navegando...')

            result_future = await send_goal_future.get_result_async()
            status = result_future.status

            # Estado 4 = Goal Status Succeeded
            if status == 4: 
                self.get_logger().info('🏁 ¡Llegada confirmada!')
                return True
            else:
                self.get_logger().warn(f'⚠️ Nav2 falló con estado: {status}')
                return False
                
        except Exception as e:
            self.get_logger().error(f'❌ Error durante el ciclo de navegación: {str(e)}')
            return False

def main():
    """ Punto de entrada principal con ejecutor multi-hilo. """
    try:
        rclpy.init()
        node = SimpleNavigator()

        # Executor necesario para procesar callbacks concurrentes
        executor = MultiThreadedExecutor()
        executor.add_node(node)

        executor.spin()
    except (KeyboardInterrupt, RuntimeError):
        pass
    except Exception as e:
        print(f"❌ Error crítico en el ejecutor: {str(e)}")
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()