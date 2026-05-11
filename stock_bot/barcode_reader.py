import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import cv2
from pyzbar import pyzbar
import numpy as np

class BarcodeReader(Node):
    def __init__(self):
        super().__init__('barcode_reader')
        self.bridge = CvBridge()
        self.subscription = self.create_subscription(Image, '/camera/image_raw', self.image_callback, 10)
        
        # Nombres de las únicas 2 ventanas que queremos
        self.win_1 = "1. Normalizada (CLAHE)"
        self.win_2 = "2. Binaria Final"
        
        self.get_logger().info('✅ SISTEMA OPERATIVO: Escáner de precisión listo.')

    def image_callback(self, msg):
        try:
            # 1. Captura y aumento de resolución
            frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            h, w = frame.shape[:2]
            big = cv2.resize(frame, (int(w*1.5), int(h*1.5)), interpolation=cv2.INTER_LANCZOS4)
            
            # 2. El procesado que te ha funcionado (CLAHE + Sharpen)
            gray = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            norm_gray = clahe.apply(gray)
            
            # Nitidez máxima
            kernel_sharpen = np.array([[-1,-1,-1], [-1, 9,-1], [-1,-1,-1]])
            sharp = cv2.filter2D(norm_gray, -1, kernel_sharpen)
            
            # Limpieza y binarización
            clean = cv2.bilateralFilter(sharp, 7, 50, 50)
            _, thresh = cv2.threshold(clean, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # 3. Detección
            barcodes = pyzbar.decode(thresh)
            for barcode in barcodes:
                data = barcode.data.decode('utf-8')
                self.get_logger().info(f'📦 ¡DETECTADO!: {data}')
                # Dibujar rectángulo de éxito
                pts = np.array([barcode.polygon], np.int32)
                cv2.polylines(big, [pts], True, (0, 255, 0), 4)

            # 4. MOSTRAR SOLO LAS 2 VENTANAS BUENAS
            cv2.imshow(self.win_1, norm_gray)
            cv2.imshow(self.win_2, thresh)
            cv2.waitKey(1)

        except Exception as e:
            self.get_logger().error(f'Error: {e}')

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