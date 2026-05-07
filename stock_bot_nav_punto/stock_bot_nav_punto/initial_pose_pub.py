"""
Este módulo automatiza la localización inicial del StockBot en el mapa de Nav2.

Classes:
  InitialPosePub

"""

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseWithCovarianceStamped
import time
import sys
import math

class InitialPosePub(Node):
    """
    Nodo que publica una pose inicial fija en el topic /initialpose.

    Attributes:
      publisher_ (Publisher): Objeto publicador para mensajes de pose con covarianza.
      timer (Timer): Temporizador para retardar la publicación y permitir la carga de AMCL.

    Methods:
      publish_pose(): Construye y publica el mensaje de localización inicial.

    """

    def __init__(self):
        """ Inicializa el nodo y configura el publicador y el temporizador. """
        super().__init__('initial_pose_pub')
        
        try:
            self.publisher_ = self.create_publisher(PoseWithCovarianceStamped, '/initialpose', 10)
            self.timer = self.create_timer(3.0, self.publish_pose)
            self.get_logger().info('Nodo InitialPosePub listo. Esperando 5s para publicar...')
        except Exception as e:
            self.get_logger().error(f'❌ Error en la inicialización del nodo: {str(e)}')
            sys.exit(1)

    def publish_pose(self):
        """ 
        Construye y envía el mensaje de pose inicial al sistema de navegación.

        Raises:
          Exception: Si ocurre un error inesperado durante la publicación del mensaje.
        """
        try:
            msg = PoseWithCovarianceStamped()
            msg.header.frame_id = 'map'
            msg.header.stamp = self.get_clock().now().to_msg()
            
            msg.pose.pose.position.x = 2.231
            msg.pose.pose.position.y = -2.871
            msg.pose.pose.position.z = 0.0

            yaw = 1.571
        
            msg.pose.pose.orientation.z = math.sin(yaw / 2.0)
            msg.pose.pose.orientation.w = math.cos(yaw / 2.0)
            
            for i in range(3):
                self.publisher_.publish(msg)
                self.get_logger().info(f'Publicando pose inicial... intento {i+1}')
                time.sleep(0.1)
                
            self.get_logger().info('✅ ¡Posición inicial fijada con éxito! Cerrando nodo...')
            raise SystemExit 

        except SystemExit:
            raise 
        except Exception as e:
            self.get_logger().error(f'❌ Error al publicar la pose: {str(e)}')
            sys.exit(1)

def main(args=None):
    """ 
    Punto de entrada principal para el nodo de pose inicial.

    Args:
      args (list, optional): Argumentos pasados por línea de comandos.
    """
    try:
        rclpy.init(args=args)
        node = InitialPosePub()
        rclpy.spin(node)
    except SystemExit:
        pass
    except Exception as e:
        print(f"❌ Error crítico en rclpy: {str(e)}")
    finally:
        if rclpy.ok():
            rclpy.shutdown()

if __name__ == '__main__':
    main()