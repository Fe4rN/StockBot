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
        
        # 1. Cargar el modelo base de personas
        self.model_personas = YOLO('yolov8n.pt') 
        
        # Cargar modelo de ventanas con control de fallos
        try:
            self.model_ventanas = YOLO('yolov8_ventanas.pt')
            self.get_logger().info("Modelo de ventanas 'yolov8_ventanas.pt' cargado correctamente.")
        except Exception:
            self.get_logger().warn("⚠️ No se encontró 'yolov8_ventanas.pt'. Usando 'yolov8n.pt' para simular detección de ventanas.")
            self.model_ventanas = self.model_personas

        # Cargar modelo de brazaletes con control de fallos
        try:
            self.model_brazaletes = YOLO('yolov8_brazaletes.pt')
            self.get_logger().info("Modelo de brazaletes 'yolov8_brazaletes.pt' cargado correctamente.")
        except Exception:
            self.get_logger().warn("⚠️ No se encontró 'yolov8_brazaletes.pt'. Usando 'yolov8n.pt' para simular brazaletes.")
            self.model_brazaletes = self.model_personas
        
        # Suscriptor y Publicadores
        self.subscription = self.create_subscription(Image, '/camera/image_raw', self.callback, 10)
        self.pub_intrusos = self.create_publisher(String, '/alertas_intrusion', 10)
        self.pub_ventanas = self.create_publisher(String, '/estado_ventanas', 10)
        
        # --- VARIABLES DE CONTROL DE ALERTAS ---
        self.last_alert_time = 0        # Cuándo fue el último aviso
        self.cooldown_duration = 15.0   # Segundos que el robot debe estar en silencio
        # ------------------------------------

        self.get_logger().info('Vigilante StockBot Unificado: ¡En servicio con Cooldown de 15s!')

    def analizar_estado_ventana(self, recorte):
        """
        Función para detectar el estado de la ventana usando lógica OpenCV
        (grietas con Canny y detección de áreas abiertas mediante píxeles oscuros).
        """
        try:
            # Convertir a escala de grises
            gray = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY)
            
            # --- DETECCIÓN DE VENTANA ABIERTA (HUECO OSCURO) ---
            # Buscamos el porcentaje de área que tiene un tono oscuro/vacío (brillo inferior a 45)
            _, thresh_dark = cv2.threshold(gray, 45, 255, cv2.THRESH_BINARY_INV)
            pct_dark = (cv2.countNonZero(thresh_dark) / (gray.shape[0] * gray.shape[1])) * 100
            
            # --- DETECCIÓN DE VENTANA ROTA (GRIETAS) ---
            # Aplicamos Canny para ver la densidad de bordes en el cristal
            edges = cv2.Canny(gray, 30, 100)
            pct_edges = (cv2.countNonZero(edges) / (gray.shape[0] * gray.shape[1])) * 100
            
            # --- ANÁLISIS DE CONTORNO OSCURO ---
            contours, _ = cv2.findContours(thresh_dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            max_contour_area_pct = 0.0
            total_area = gray.shape[0] * gray.shape[1]
            if contours:
                max_contour = max(contours, key=cv2.contourArea)
                max_contour_area_pct = (cv2.contourArea(max_contour) / total_area) * 100

            # Imprimir métricas por consola para monitorizar
            self.get_logger().info(
                f"🔍 Ventana: pct_edges={pct_edges:.1f}%, pct_dark={pct_dark:.1f}%, max_dark_contour={max_contour_area_pct:.1f}%"
            )
            
            # --- CLASIFICACIÓN CON DATOS DE LOG REAL ---
            if pct_dark < 5.0:
                # Si casi no hay oscuridad, la ventana está cerrada/sana
                return "CERRADA"
            else:
                # Si hay oscuridad, distinguimos por el tamaño del hueco continuo
                if max_contour_area_pct > 25.0:
                    # Hueco continuo muy grande (la ventana abierta)
                    return "ABIERTA"
                else:
                    # Huecos pequeños pero con oscuridad y bordes (vidrio roto)
                    return "ROTA"
        except Exception as e:
            self.get_logger().error(f"Error analizando estado de la ventana: {e}")
            return "CERRADA"

    def callback(self, msg):
        try:
            frame = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            current_time = time.time()

            # --- 1. LÓGICA DE INTRUSIÓN (Personas sin brazalete) ---
            # YOLO de personas (clase 0 = person)
            results_p = self.model_personas(frame, conf=0.5, classes=[0], verbose=False)
            # YOLO de brazaletes (todas las clases o la clase específica)
            results_b = self.model_brazaletes(frame, conf=0.4, verbose=False)

            hay_persona = len(results_p[0].boxes) > 0
            hay_brazalete = len(results_b[0].boxes) > 0

            # Alerta si hay persona pero no lleva brazalete
            if hay_persona and not hay_brazalete:
                if (current_time - self.last_alert_time) > self.cooldown_duration:
                    msg_alert = String()
                    msg_alert.data = "INTRUSO DETECTADO EN EL ALMACÉN (Sin brazalete)"
                    self.pub_intrusos.publish(msg_alert)
                    self.last_alert_time = current_time
                    self.get_logger().warn("¡Persona detectada sin brazalete! Alerta enviada.")

            # Dibujamos las detecciones en la imagen de visualización
            frame = results_p[0].plot(im=frame)
            if hay_brazalete:
                frame = results_b[0].plot(im=frame)


            # --- 2. LÓGICA DE DETECCIÓN Y ESTADO DE VENTANAS ---
            results_v = self.model_ventanas(frame, conf=0.45, verbose=False)

            for box in results_v[0].boxes:
                # Mostrar la confianza real de la detección por consola
                confianza = box.conf[0].item()
                #self.get_logger().info(f"🔍 Detección ventana - Confianza: {confianza:.2f}")

                # Coordenadas de la ventana detectada por YOLO
                xyxy = box.xyxy[0].cpu().numpy().astype(int)
                x1, y1, x2, y2 = xyxy
                
                # Recorte de la ventana para OpenCV
                recorte = frame[y1:y2, x1:x2]
                
                if recorte.size > 0:
                    # Determinamos el estado de la ventana usando vuestra lógica OpenCV
                    estado = self.analizar_estado_ventana(recorte)
                    
                    # Dibujamos un rectángulo azul y texto informando el estado
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)
                    cv2.putText(frame, f"Ventana: {estado}", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
                    
                    # Publicamos el evento del estado en ROS
                    msg_vent = String()
                    msg_vent.data = f"Ventana en ({x1},{y1}) está {estado}"
                    self.pub_ventanas.publish(msg_vent)

            # Mostramos la ventana de vigilancia unificada
            cv2.imshow("Vigilancia Unificada (IA + OpenCV)", frame)
            cv2.waitKey(1)

        except Exception as e:
            self.get_logger().error(f'Error en vigilancia unificada: {e}')

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