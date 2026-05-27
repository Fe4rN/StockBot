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

    def registrar_escaneo_db(self, data):
        import requests
        try:
            # 1. Registrar producto en el inventario
            res_prod = requests.post(f"http://127.0.0.1:8000/productos/registrar?nombre={data}", timeout=2.0)
            if res_prod.status_code == 200:
                self.get_logger().info(f"DB: Inventario de '{data}' actualizado correctamente.")
            else:
                self.get_logger().error(f"Fallo actualizando inventario en API: {res_prod.status_code}")
                
            # 2. Registrar en el historial general
            res_hist = requests.post("http://127.0.0.1:8000/historial/", json={
                "ID_Robot": 5,
                "Mensaje": f"Escaneo: Código '{data}' detectado. Inventario del almacén actualizado."
            }, timeout=2.0)
            if res_hist.status_code == 200:
                self.get_logger().info("DB: Registro de escaneo guardado en historial.")
            else:
                self.get_logger().error(f"Fallo registrando historial en API: {res_hist.status_code}")
                
            # 3. Registrar en los avisos para la sección de Notificaciones
            res_aviso = requests.post("http://127.0.0.1:8000/avisos/", json={
                "Tipo": "success",
                "Robot": 5,
                "Almacen": 1,
                "Informacion": f"Escáner: Producto '{data}' identificado correctamente e inventario actualizado."
            }, timeout=2.0)
            if res_aviso.status_code == 200:
                self.get_logger().info("DB: Aviso de escaneo guardado.")
            else:
                self.get_logger().error(f"Fallo registrando aviso en API: {res_aviso.status_code}")
        except Exception as e:
            self.get_logger().error(f"Error conectando con la base de datos para registrar escaneo: {e}")

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
            
            # --- DETECCIÓN CON PYZBAR (Multi-pass para máxima robustez en Gazebo) ---
            # 1. Intentar primero con la imagen en escala de grises limpia (mejor para bordes suaves y antialiasing)
            barcodes = pyzbar.decode(gray)
            
            # 2. Si falla, intentar con la versión enfocada con contraste CLAHE
            if not barcodes:
                barcodes = pyzbar.decode(sharp)
                
            # 3. Si falla, intentar con la binarizada por umbral de Otsu (líneas puras en blanco y negro)
            if not barcodes:
                barcodes = pyzbar.decode(thresh)
            
            for barcode in barcodes:
                data = barcode.data.decode('utf-8')
                self.get_logger().info(f'📦 ¡CÓDIGO DETECTADO!: {data}')
                
                # Publicamos el resultado para la interfaz web
                msg_status = String()
                msg_status.data = data
                self.publisher_.publish(msg_status)
                
                # Registramos en base de datos
                self.registrar_escaneo_db(data)
                
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