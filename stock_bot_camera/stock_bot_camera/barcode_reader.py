import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from std_msgs.msg import String
from std_srvs.srv import Trigger 
from cv_bridge import CvBridge
import cv2
from pyzbar import pyzbar
import numpy as np

class BarcodeReader(Node):
    def __init__(self):
        super().__init__('barcode_reader')
        self.bridge = CvBridge()
        
        # --- ESTADO ---
        self.buscando = False 
        
        # 1. Suscripción a cámara
        self.subscription = self.create_subscription(
            Image, 
            '/camera/image_raw', 
            self.image_callback, 
            10
        )
        
        # 2. Publicador para la web
        self.publisher_ = self.create_publisher(String, '/resultado_busqueda', 10)
        
        # 3. SERVICIOS para el control desde la web
        self.srv_start = self.create_service(
            Trigger, 
            '/activar_escaneo', 
            self.activar_callback
        )
        self.srv_stop = self.create_service(
            Trigger, 
            '/detener_escaneo', 
            self.stop_callback
        )
        
        self.get_logger().info('Escáner StockBot: Online y esperando órdenes...')

    def activar_callback(self, request, response):
        self.buscando = True
        self.get_logger().info('Iniciando búsqueda de códigos de barras...')
        response.success = True
        response.message = "Escáner activado"
        return response

    def stop_callback(self, request, response):
        self.buscando = False
        self.get_logger().info('Búsqueda cancelada por el usuario.')
        
        # Cerramos la ventana de monitorización para liberar recursos
        cv2.destroyAllWindows()
        
        response.success = True
        response.message = "Escaneo detenido"
        return response

    def image_callback(self, msg):
        # Si no estamos en modo búsqueda, ignoramos el procesamiento para ahorrar CPU
        if not self.buscando:
            return

        try:
            # Conversión de imagen ROS a OpenCV
            frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            
            # --- PROCESAMIENTO OPTIMIZADO PARA GAZEBO ---
            h, w = frame.shape[:2]
            big = cv2.resize(frame, (int(w*1.5), int(h*1.5)), interpolation=cv2.INTER_LANCZOS4)
            gray = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY)
            
            # Mejora de contraste (CLAHE)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            norm_gray = clahe.apply(gray)
            
            # Enfoque (Sharpening)
            kernel_sharpen = np.array([[-1,-1,-1], [-1, 9,-1], [-1,-1,-1]])
            sharp = cv2.filter2D(norm_gray, -1, kernel_sharpen)
            
            # Reducción de ruido y umbralizado
            clean = cv2.bilateralFilter(sharp, 7, 50, 50)
            _, thresh = cv2.threshold(clean, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # --- DETECCIÓN CON PYZBAR ---
            barcodes = pyzbar.decode(thresh)
            
            for barcode in barcodes:
                data = barcode.data.decode('utf-8')
                self.get_logger().info(f'📦 ¡CÓDIGO DETECTADO!: {data}')
                
                # Publicamos el resultado para la interfaz web
                msg_status = String()
                msg_status.data = data
                self.publisher_.publish(msg_status)
                
                # Una vez encontrado un producto, detenemos la búsqueda automática
                self.buscando = False
                self.get_logger().info('Operación finalizada. Volviendo a espera.')
                cv2.destroyAllWindows()

            # Mostramos el monitor solo mientras se escanea
            #cv2.imshow("Escáner Activo - Monitor de Visión", thresh)
            #cv2.waitKey(1)

        except Exception as e:
            self.get_logger().error(f'Error en el procesamiento de imagen: {e}')

def main(args=None):
    rclpy.init(args=args)
    node = BarcodeReader()
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