import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from std_msgs.msg import String
from cv_bridge import CvBridge
from ultralytics import YOLO
import cv2
import time  

class IntruderDetector(Node):
    def __init__(self):
        super().__init__('intruder_detector')
        self.bridge = CvBridge()
        self.model = YOLO('yolov8n.pt') 
        
        self.subscription = self.create_subscription(Image, '/camera/image_raw', self.callback, 10)
        self.publisher_ = self.create_publisher(String, '/alertas_intrusion', 10)
        
        # --- NUEVAS VARIABLES DE CONTROL ---
        self.last_alert_time = 0        # Cuándo fue el último aviso
        self.cooldown_duration = 15.0   # Segundos que el robot debe estar en silencio
        # ------------------------------------

        self.get_logger().info('Vigilante StockBot: ¡En servicio con Cooldown de 15s!')

    def callback(self, msg):
        try:
            frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            results = self.model(frame, conf=0.5, classes=[0], verbose=False)

            current_time = time.time()

            if len(results[0].boxes) > 0:
                # Solo publicamos si ha pasado el tiempo de enfriamiento
                if (current_time - self.last_alert_time) > self.cooldown_duration:
                    msg_alert = String()
                    msg_alert.data = "INTRUSO DETECTADO EN EL ALMACÉN"
                    self.publisher_.publish(msg_alert)
                    
                    # Actualizamos el tiempo del último aviso
                    self.last_alert_time = current_time
                    self.get_logger().warn("¡Persona detectada! Enviando alerta a la web...")
                else:
                    # Opcional: Log para saber que la sigue viendo pero no spamea
                    # self.get_logger().info("Intruso sigue ahí, pero estoy en silencio...")
                    pass

                # Dibujamos el cuadro para ver que la IA sigue trabajando
                frame = results[0].plot()

            # Mostramos la ventana de vigilancia
            cv2.imshow("Vigilancia en Tiempo Real", frame)
            cv2.waitKey(1)

        except Exception as e:
            self.get_logger().error(f'Error en vigilancia: {e}')

def main(args=None):
    rclpy.init(args=args)
    node = IntruderDetector()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        cv2.destroyAllWindows()
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()