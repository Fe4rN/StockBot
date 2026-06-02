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
        
        # Buscar el directorio base donde se encuentran los modelos .pt de forma dinámica
        import os
        ruta_actual = os.path.dirname(os.path.abspath(__file__))
        base_path = None
        for _ in range(12):
            if os.path.exists(os.path.join(ruta_actual, "yolov8_brazaletes.pt")):
                base_path = ruta_actual
                break
            ruta_actual = os.path.dirname(ruta_actual)
            
        if base_path is None:
            # Buscar hacia arriba desde el directorio de trabajo actual
            ruta_actual = os.getcwd()
            for _ in range(12):
                if os.path.exists(os.path.join(ruta_actual, "yolov8_brazaletes.pt")):
                    base_path = ruta_actual
                    break
                ruta_actual = os.path.dirname(ruta_actual)
                
        if base_path is None:
            base_path = os.getcwd()

        # Cargar modelo base de personas
        path_personas = os.path.join(base_path, 'yolov8n.pt')
        try:
            self.model_personas = YOLO(path_personas)
            self.get_logger().info(f"Modelo base de personas cargado correctamente desde {path_personas}")
        except Exception as e:
            self.get_logger().error(f"❌ Error cargando 'yolov8n.pt' desde {path_personas}: {e}")
            raise e

        # Cargar modelo de ventanas
        path_ventanas = os.path.join(base_path, 'yolov8_ventanas.pt')
        try:
            self.model_ventanas = YOLO(path_ventanas)
            self.get_logger().info(f"Modelo de ventanas cargado correctamente desde {path_ventanas}")
        except Exception as e:
            self.get_logger().error(f"❌ Error cargando 'yolov8_ventanas.pt' desde {path_ventanas}: {e}")
            raise e

        # Cargar modelo de brazaletes (Clasificador)
        path_brazaletes = os.path.join(base_path, 'yolov8_brazaletes.pt')
        try:
            self.model_brazaletes = YOLO(path_brazaletes)
            self.get_logger().info(f"Modelo clasificador de brazaletes cargado correctamente desde {path_brazaletes}")
        except Exception as e:
            self.get_logger().error(f"❌ Error cargando 'yolov8_brazaletes.pt' desde {path_brazaletes}: {e}")
            raise e
        
        # Suscriptor y Publicadores
        self.subscription = self.create_subscription(Image, '/camera/image_raw', self.callback, 10)
        self.pub_intrusos = self.create_publisher(String, '/alertas_intrusion', 10)
        self.pub_ventanas = self.create_publisher(String, '/estado_ventanas', 10)
        
        # --- VARIABLES DE CONTROL DE ALERTAS ---
        self.last_alert_time = 0        # Cuándo fue el último aviso
        self.cooldown_duration = 15.0   # Segundos que el robot debe estar en silencio
        self.last_window_alert_time = 0
        self.window_alert_cooldown = 10.0
        # ------------------------------------

        self.get_logger().info('Vigilante StockBot Unificado: ¡En servicio con Cooldown de 15s!')

    def enviar_aviso_db(self, mensaje, nivel="warning"):
        import requests
        try:
            api_url = "http://127.0.0.1:8000/avisos/"
            datos = {
                "Tipo": nivel,
                "Robot": 5,
                "Almacen": 1,
                "Informacion": mensaje
            }
            res = requests.post(api_url, json=datos, timeout=2.0)
            if res.status_code == 200:
                self.get_logger().info(f"DB: Alerta '{nivel}' guardada correctamente.")
            else:
                self.get_logger().error(f"Fallo enviando alerta en API: {res.status_code}")
        except Exception as e:
            self.get_logger().error(f"Error conectando con la base de datos para enviar alerta: {e}")

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

            # --- 1. LÓGICA DE INTRUSIÓN (Detección de personas + Clasificación de brazaletes) ---
            results_p = self.model_personas(frame, conf=0.5, classes=[0], verbose=False)
            
            hay_intruso = False
            
            if results_p and len(results_p) > 0 and results_p[0].boxes is not None:
                for box in results_p[0].boxes:
                    # Coordenadas de la persona
                    xyxy = box.xyxy[0].cpu().numpy().astype(int)
                    x1, y1, x2, y2 = xyxy
                    
                    # Añadir un margen del 10% para dar más contexto al clasificador de brazaletes
                    h, w = y2 - y1, x2 - x1
                    margin_y = int(h * 0.1)
                    margin_x = int(w * 0.1)
                    
                    x1_m = max(0, x1 - margin_x)
                    y1_m = max(0, y1 - margin_y)
                    x2_m = min(frame.shape[1], x2 + margin_x)
                    y2_m = min(frame.shape[0], y2 + margin_y)
                    
                    recorte = frame[y1_m:y2_m, x1_m:x2_m]
                    
                    if recorte.size > 0:
                        # Clasificación con el modelo de brazaletes
                        res_b = self.model_brazaletes(recorte, verbose=False)
                        
                        # Filtro de color HSV para detectar el brazalete verde brillante
                        import numpy as np
                        hsv = cv2.cvtColor(recorte, cv2.COLOR_BGR2HSV)
                        lower_green = np.array([35, 50, 50])
                        upper_green = np.array([85, 255, 255])
                        mask = cv2.inRange(hsv, lower_green, upper_green)
                        pixels_verdes = cv2.countNonZero(mask)
                        
                        if res_b and len(res_b) > 0 and res_b[0].probs is not None:
                            probs_data = res_b[0].probs.data
                            prob_aut = probs_data[0].item()
                            prob_no_aut = probs_data[1].item()
                            
                            top1_idx = res_b[0].probs.top1
                            conf = res_b[0].probs.top1conf.item()
                            
                            # Decisión combinada: autorizado si el clasificador dice clase 0 O si detectamos píxeles del brazalete verde
                            if pixels_verdes > 100:
                                es_autorizado = True
                                label = "autorizado"
                                conf_final = 1.0  # Certeza por detección de color directa
                            else:
                                es_autorizado = (top1_idx == 0)
                                label = "autorizado" if es_autorizado else "no_autorizado"
                                conf_final = conf
                            
                            self.get_logger().info(
                                f"🤖 [DEBUG] Píxeles verdes: {pixels_verdes} | Probs -> AUTORIZADO: {prob_aut:.4f} | NO_AUTORIZADO: {prob_no_aut:.4f}"
                            )
                            
                            if not es_autorizado:
                                hay_intruso = True
                                color = (0, 0, 255)  # Rojo para no autorizado
                            else:
                                color = (0, 255, 0)  # Verde para autorizado
                                
                            # Dibujar en el frame de forma limpia con OpenCV
                            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                            cv2.putText(frame, f"{label.upper()} ({conf_final:.2f})", (x1, y1 - 10),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            # Alerta si hay un intruso (persona sin brazalete autorizado)
            if hay_intruso:
                if (current_time - self.last_alert_time) > self.cooldown_duration:
                    msg_alert = String()
                    msg_alert.data = "INTRUSO DETECTADO EN EL ALMACÉN (Sin brazalete)"
                    self.pub_intrusos.publish(msg_alert)
                    self.last_alert_time = current_time
                    self.get_logger().warn("¡Persona detectada sin brazalete (no_autorizado)! Alerta enviada.")
                    
                    # Enviar a la base de datos
                    self.enviar_aviso_db("Intruso detectado en zona de cámaras (Sin brazalete autorizado)", "danger")


            # --- 2. LÓGICA DE DETECCIÓN Y ESTADO DE VENTANAS ---
            results_v = self.model_ventanas(frame, conf=0.45, verbose=False)

            if results_v and len(results_v) > 0 and results_v[0].boxes is not None:
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
                        
                        # Alertar a la base de datos si la ventana no está cerrada y respetando cooldown
                        if estado != "CERRADA" and (current_time - self.last_window_alert_time) > self.window_alert_cooldown:
                            self.last_window_alert_time = current_time
                            nivel = "danger" if estado == "ROTA" else "warning"
                            self.enviar_aviso_db(f"Estado de ventana anómalo detectado: {estado} en ({x1}, {y1})", nivel)

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