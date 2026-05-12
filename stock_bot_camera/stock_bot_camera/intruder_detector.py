import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from std_msgs.msg import String
from cv_bridge import CvBridge
from ultralytics import YOLO
import cv2

class IntruderDetector(Node):
    def __init__(self):
        super().__init__('intruder_detector')
        self.bridge = CvBridge()
        
        # Cargamos el modelo nano (el más ligero de YOLOv8)
        # Se descarga solo la primera vez que lo ejecutes
        self.model = YOLO('yolov8n.pt') 
        
        self.subscription = self.create_subscription(Image, '/camera/image_raw', self.callback, 10)
        self.publisher_ = self.create_publisher(String, '/alertas_intrusion', 10)
        
        self.get_logger().info(' Vigilante StockBot: ¡En servicio!')

    def callback(self, msg):
        try:
            frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')

            # Inferencia con YOLOv8
            # conf=0.5 (solo avisa si está muy seguro)
            # classes=[0] (el ID 0 en YOLO es "persona")
            results = self.model(frame, conf=0.5, classes=[0], verbose=False)

            if len(results[0].boxes) > 0:
                # Si hay cajas en el resultado, es que ha visto a alguien
                msg_alert = String()
                msg_alert.data = "INTRUSO DETECTADO EN EL ALMACÉN"
                self.publisher_.publish(msg_alert)
                self.get_logger().warn("¡Persona detectada!")

                # Dibujamos el cuadro en el frame para la demo
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