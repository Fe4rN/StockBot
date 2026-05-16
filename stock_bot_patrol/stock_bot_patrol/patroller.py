"""
Este módulo implementa el sistema de patrullaje cíclico del StockBot.

Gestiona una lista de waypoints y permite el control de inicio/parada mediante 
un servicio compatible con la interfaz web.

Classes:
  PatrollerNode

"""

import rclpy
from rclpy.node import Node
from rclpy.action import ActionClient
from rclpy.executors import MultiThreadedExecutor
from rclpy.callback_groups import ReentrantCallbackGroup
from nav2_msgs.action import FollowWaypoints
from stock_bot_interfaces.srv import GoToPoint
from geometry_msgs.msg import PoseStamped
import sys
import json
import requests
from std_msgs.msg import String

class PatrollerNode(Node):
    """
    Nodo encargado de realizar rutas de vigilancia automáticas.

    Attributes:
      group (ReentrantCallbackGroup): Grupo para procesar callbacks de forma paralela.
      patrolling (bool): Estado del interruptor de patrulla.
      is_executing (bool): Control de exclusión mutua para no solapar vueltas.
      waypoints_coords (list): Lista de coordenadas [x, y] que forman la ruta.
      client (ActionClient): Cliente para el servidor de Waypoints de Nav2.
      srv (Service): Servicio para el control remoto de la patrulla.

    Methods:
      service_callback(request, response): Activa o desactiva el patrullaje.
      patrol_manager(): Orquesta el inicio de nuevas vueltas.
      execute_nav2_patrol(): Gestiona la comunicación con Nav2.

    """

    def __init__(self):
        """ Inicializa el nodo, configura la ruta y los clientes de acción. """
        super().__init__('patroller_node')
        
        try:
            self.group = ReentrantCallbackGroup()
            self.patrolling = False    
            self.is_executing = False 
            self.goal_handle = None

            # Ruta de patrulla definida por coordenadas del almacén
            self.waypoints_coords = [
                [7.0, -0.8],
                [8.32, -6.3],
                [2.0, -5.0],
                [0.0, 0.0]
            ]
            
            self.client = ActionClient(self, FollowWaypoints, 'follow_waypoints', callback_group=self.group)
            self.srv = self.create_service(GoToPoint, 'control_patrulla', self.service_callback, callback_group=self.group)
            
            self.notif_pub = self.create_publisher(String, '/notificaciones_robot', 10)

            self.estado_pub = self.create_publisher(String, '/estado_patrulla', 10)

            # Temporizador que vigila el estado de la patrulla cada segundo
            self.timer = self.create_timer(1.0, self.patrol_manager, callback_group=self.group)
            
            self.get_logger().info('--- StockBot Patroller listo ---')
        except Exception as e:
            self.get_logger().error(f"❌ Error crítico en inicialización: {str(e)}")
            sys.exit(1)

    def enviar_notificacion(self, mensaje, nivel="info"):
        """Envía notificaciones a la web (WebSockets) y a la Base de Datos (API REST)"""
        
        # 1. Enviar por ROS 2 (Tiempo Real para Websockets) - Esto no cambia
        msg = String()
        datos_ros = {"mensaje": mensaje, "nivel": nivel}
        msg.data = json.dumps(datos_ros)
        self.notif_pub.publish(msg)

        # 2. Enviar a la API FastAPI (AQUÍ ESTÁ LA CORRECCIÓN)
        try:
            api_url = "http://127.0.0.1:8000/avisos/" 
            
            # Ajustamos el diccionario a lo que pide tu base de datos
            datos_api = {
                "Tipo": nivel,                 
                "Robot": 5,           
                "Almacen": 1,         
                "Informacion": mensaje  
            }
            
            respuesta = requests.post(api_url, json=datos_api, timeout=2.0)
            
            # Añadimos .text al error para que si vuelve a fallar, nos diga el motivo exacto
            if respuesta.status_code != 200:
                self.get_logger().error(f"Fallo de la API: {respuesta.status_code} - {respuesta.text}")
                
        except requests.exceptions.RequestException as e:
            self.get_logger().error(f"Error conectando con la base de datos: {e}")
                
        except requests.exceptions.RequestException as e:
            self.get_logger().error(f"Error conectando con la base de datos: {e}")

    async def service_callback(self, request, response):
        """
        Callback del servicio para controlar el flujo de la patrulla.

        Args:
          request (GoToPoint.Request): ID 1 para iniciar, 0 para parar.
          response (GoToPoint.Response): Éxito y mensaje informativo.

        Returns:
          GoToPoint.Response: Respuesta para el cliente.
        """
        try:
            if request.point_id == 1:
                self.get_logger().info("Activando interruptor de patrulla...")
                self.patrolling = True
                self.enviar_notificacion("Modo Patrulla AUTOMÁTICA activado", "info")
                response.success = True
                response.message = "Patrulla activada. El robot empezará en breve."
                    
            elif request.point_id == 0:
                self.get_logger().warn("🛑 Desactivando interruptor de patrulla...")
                self.patrolling = False
                if self.goal_handle:
                    await self.goal_handle.cancel_goal_async()
                    self.get_logger().info("Acción de Nav2 cancelada.")
                self.enviar_notificacion("La patrulla ha sido detenida por el usuario", "warning")
                response.success = True
                response.message = "Patrulla desactivada y robot parado."
                
            return response
        except Exception as e:
            self.get_logger().error(f"❌ Error en el servicio de patrulla: {str(e)}")
            response.success = False
            response.message = f"Error: {str(e)}"
            return response

    async def patrol_manager(self):
        """
        Gestiona el ciclo de patrulla y transmite el estado real a la web.
        """
        try:
            # 1. LATIDO DE ESTADO: Avisamos a la web de qué estamos haciendo realmente
            msg_estado = String()
            msg_estado.data = "PATRULLA" if self.patrolling else "MANUAL"
            self.estado_pub.publish(msg_estado)

            # 2. Lógica de ejecución
            if self.patrolling and not self.is_executing:
                self.is_executing = True 
                self.enviar_notificacion("Comenzando nueva ronda de patrullaje por los puntos", "info")
                self.get_logger().info(">>> Iniciando nueva vuelta de patrulla...")
                
                success = await self.execute_nav2_patrol()
                
                if success:
                    self.enviar_notificacion("Ronda de patrullaje completada sin incidentes", "success")
                else:
                    if self.patrolling:
                        self.enviar_notificacion("Fallo durante la ronda de patrulla o ruta bloqueada", "error")
                
                self.is_executing = False 
        except Exception as e:
            self.get_logger().error(f"❌ Error en el gestor de patrulla: {str(e)}")
            self.is_executing = False

    async def execute_nav2_patrol(self):
        """
        Ejecuta la navegación a través de todos los waypoints definidos.

        Returns:
          bool: True si completó todos los puntos, False si hubo error o rechazo.

        Raises:
          Exception: Si ocurre un fallo en la comunicación con el Action Server.
        """
        try:
            if not self.client.wait_for_server(timeout_sec=5.0):
                self.get_logger().error('❌ Servidor FollowWaypoints no disponible.')
                return False

            goal_msg = FollowWaypoints.Goal()
            for coords in self.waypoints_coords:
                p = PoseStamped()
                p.header.frame_id = 'map'
                p.header.stamp = self.get_clock().now().to_msg()
                p.pose.position.x, p.pose.position.y = float(coords[0]), float(coords[1])
                p.pose.orientation.w = 1.0
                goal_msg.poses.append(p)

            self.get_logger().info(f'Enviando {len(goal_msg.poses)} puntos a Nav2...')
            
            send_goal_future = await self.client.send_goal_async(goal_msg)
            if not send_goal_future.accepted:
                self.get_logger().error('🛑 Objetivo de patrulla rechazado por Nav2.')
                return False

            self.goal_handle = send_goal_future
            result_future = await send_goal_future.get_result_async()
            
            # Status 4 = Succeeded
            return result_future.status == 4 
            
        except Exception as e:
            self.get_logger().error(f"❌ Error durante la ejecución de Nav2: {str(e)}")
            return False

def main():
    """ 
    Punto de entrada para el nodo de patrulla con soporte multi-hilo. 
    """
    try:
        rclpy.init()
        node = PatrollerNode()
        
        # Executor necesario para procesar service_callback y patrol_manager a la vez
        executor = MultiThreadedExecutor()
        executor.add_node(node)
        
        executor.spin()
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"❌ Error crítico en el nodo: {str(e)}")
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()

if __name__ == '__main__':
    main()