import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from std_msgs.msg import String
from std_srvs.srv import Trigger # Servicio estándar para activar cosas
from cv_bridge import CvBridge
import cv2
from pyzbar import pyzbar
import numpy as np

class BarcodeReader(Node):
    def __init__(self):
        super().__init__('barcode_reader')
        self.bridge = CvBridge()
        
        # --- ESTADO ---
        self.buscando = False # Por defecto, no gasta CPU
        
        # 1. Suscripción a cámara
        self.subscription = self.create_subscription(Image, '/camera/image_raw', self.image_callback, 10)
        
        # 2. Publicador para la web
        self.publisher_ = self.create_publisher(String, '/resultado_busqueda', 10)
        
        # 3. SERVICIO para activar desde la web
        self.srv = self.create_service(Trigger, '/activar_escaneo', self.activar_callback)
        
        self.get_logger().info('Escáner en modo ESPERA. Esperando orden desde la web...')

    def activar_callback(self, request, response):
        self.buscando = True
        self.get_logger().info('¡Orden recibida! Iniciando búsqueda de códigos...')
        response.success = True
        response.message = "Escáner activado"
        return response

    def image_callback(self, msg):
        # SI NO ESTAMOS BUSCANDO, NO HACEMOS NADA (Ahorro total de CPU)
        if not self.buscando:
            return

        try:
            frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            
            # --- TU PROCESADO GANADOR ---
            h, w = frame.shape[:2]
            big = cv2.resize(frame, (int(w*1.5), int(h*1.5)), interpolation=cv2.INTER_LANCZOS4)
            gray = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            norm_gray = clahe.apply(gray)
            
            kernel_sharpen = np.array([[-1,-1,-1], [-1, 9,-1], [-1,-1,-1]])
            sharp = cv2.filter2D(norm_gray, -1, kernel_sharpen)
            clean = cv2.bilateralFilter(sharp, 7, 50, 50)
            _, thresh = cv2.threshold(clean, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # --- DETECCIÓN ---
            barcodes = pyzbar.decode(thresh)
            
            for barcode in barcodes:
                data = barcode.data.decode('utf-8')
                self.get_logger().info(f'📦 ¡ENCONTRADO!: {data}')
                
                # Enviamos a la web
                msg_status = String()
                msg_status.data = data
                self.publisher_.publish(msg_status)
                
                # ¡IMPORTANTE!: Una vez encontrado, nos volvemos a dormir
                self.buscando = False
                self.get_logger().info('Producto detectado. Volviendo a modo espera.')

            # Monitor interno opcional
            cv2.imshow("Monitor (Solo activo al escanear)", thresh)
            cv2.waitKey(1)

        except Exception as e:
            self.get_logger().error(f'Error: {e}')

def main(args=None):
    rclpy.init(args=args)
    node = BarcodeReader()
    rclpy.spin(node)
    cv2.destroyAllWindows()
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()