#!/usr/bin/env python3
"""
Este módulo implementa el cerebro cognitivo de StockBot mediante un LLM local.

Gestiona la interpretación de lenguaje natural para la ejecución de tareas de 
logística y patrulla, integrando una arquitectura de razonamiento (CoT) y 
comunicación asíncrona con los servicios de navegación de ROS 2.

Classes:
  StockBotChat

"""

import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from llama_cpp import Llama
import os
from stock_bot_interfaces.srv import GoToPoint

class StockBotChat(Node):
    """
    Nodo que procesa lenguaje natural y lo traduce en comandos de ROS 2.

    Attributes:
      llm (Llama): Instancia del modelo Qwen 2.5 7B cargado en GPU.
      history (list): Memoria circular de la conversación actual.
      max_history (int): Límite de mensajes almacenados en el historial.
      pending_action (str): Almacena la etiqueta de acción a la espera de confirmación.
      identidad_stockbot (str): System prompt que define el rol industrial del robot.

    Methods:
      listener_callback(msg): Procesa la entrada del usuario y decide la acción.
      generar_charla(texto): Gestiona la respuesta de texto cuando no hay comandos.
      lanzar_pregunta_confirmacion(evento): Solicita validación al usuario.
      ejecutar_accion_pendiente(): Ejecuta los servicios tras la confirmación.
    """

    def __init__(self):
        """ Inicializa el nodo, el modelo LLM y los clientes de servicio. """
        super().__init__('chatbot_node')
        
        try:
            model_path = os.path.expanduser("~/StockBot/stock_bot/models/Qwen2.5-7B-Instruct-Q4_K_M.gguf")
            
            self.get_logger().info('Cargando Cerebro 7B...')
            self.llm = Llama(model_path=model_path, n_gpu_layers=-1, n_ctx=2048, verbose=False)
            
            self.history = [] 
            self.max_history = 4 
            self.pending_action = None

            self.identidad_stockbot = (
                "Eres StockBot, un robot mozo de almacén del Equipo 5. "
                "Funciones: Patrullar (vigilancia), Navegar a Estantería 1 ([NAV_1]), "
                "Navegar a Cajas 1 ([NAV_2]) y leer códigos de barras. "
                "Eres un trabajador industrial. No eres un asistente personal ni de oficina."
            )

            self.sub = self.create_subscription(String, '/chat_input', self.listener_callback, 10)
            self.pub = self.create_publisher(String, '/chat_output', 10)
            
            self.patrol_client = self.create_client(GoToPoint, '/control_patrulla')
            self.nav_client = self.create_client(GoToPoint, '/ir_a_estanteria')

            self.estado_fisico = {
                "ultimo_producto_visto": "Ninguno",
                "estado_seguridad": "Normal",
                "posicion_x": 0.0,
                "posicion_y": 0.0
            }

            # Suscripciones extra a los "sentidos" del robot
            self.create_subscription(String, '/resultado_busqueda', self.callback_vision, 10)
            self.create_subscription(String, '/alertas_intrusion', self.callback_seguridad, 10)
            
            self.get_logger().info('✅ StockBot operativo y listo para el turno.')
        except Exception as e:
            self.get_logger().error(f'❌ Error en la carga del chatbot: {str(e)}')

    def callback_vision(self, msg):
        if msg.data != "No encontrado":
            self.estado_fisico["ultimo_producto_visto"] = msg.data

    def callback_seguridad(self, msg):
        self.estado_fisico["estado_seguridad"] = msg.data

    def listener_callback(self, msg):
        """
        Analiza el mensaje entrante utilizando una cadena de pensamiento (CoT).

        Args:
          msg (std_msgs.msg.String): Mensaje de texto recibido desde la interfaz.
        """
        user_input = msg.data.strip()
        user_input_lower = user_input.lower()

        if any(w in user_input_lower for w in ["no", "mal", "error", "he dicho"]):
            self.pending_action = None

        contexto_chat = "".join([f"{h['role']}: {h['content']}\n" for h in self.history])
        estado_actual = f"Esperando confirmación para: {self.pending_action}" if self.pending_action else "Libre"

        estado_en_tiempo_real = (
            f"--- TELEMETRÍA DEL ROBOT ---\n"
            f"Último producto escaneado: {self.estado_fisico['ultimo_producto_visto']}\n"
            f"Estado de seguridad: {self.estado_fisico['estado_seguridad']}\n"
            f"----------------------------\n"
        )

        prompt_unico = f"""<|im_start|>system
{self.identidad_stockbot}
{estado_en_tiempo_real}
Conversación:
{contexto_chat}
Estado: {estado_actual}

Instrucciones:
- Analiza si el usuario confirma una orden o da una nueva.
- Etiquetas: [PATROL_ON], [PATROL_OFF], [NAV_1], [NAV_2], [NONE], [RECHAZAR].
- Responde estrictamente con este formato:
ANÁLISIS: <razonamiento>
DECISIÓN: [ETIQUETA]
<|im_end|>
<|im_start|>user
{user_input}<|im_end|>
<|im_start|>assistant
ANÁLISIS: """

        output = self.llm(prompt_unico, max_tokens=256, stop=["<|im_end|>"], echo=False)
        respuesta_completa = output['choices'][0]['text']
        
        try:
            parte_decision = respuesta_completa.split("DECISIÓN:")[-1].upper()
            if "[NAV_1]" in parte_decision: decision = "[NAV_1]"
            elif "[NAV_2]" in parte_decision: decision = "[NAV_2]"
            elif "[PATROL_ON]" in parte_decision: decision = "[PATROL_ON]"
            elif "[PATROL_OFF]" in parte_decision: decision = "[PATROL_OFF]"
            elif "[RECHAZAR]" in parte_decision: decision = "[RECHAZAR]"
            else: decision = "[NONE]"
        except:
            decision = "[NONE]"

        if decision == "[RECHAZAR]":
            self.pending_action = None
            self.responder("Esa petición no entra en mis protocolos logísticos.")
        elif self.pending_action and any(w in user_input_lower for w in ["si", "vale", "adelante", "hazlo"]):
            self.ejecutar_accion_pendiente()
        elif decision == "[NONE]":
            self.pending_action = None
            self.generar_charla(user_input)
        else:
            self.pending_action = decision
            self.lanzar_pregunta_confirmacion(decision)

        self.update_history("user", user_input)

    def generar_charla(self, texto):
        """
        Genera respuestas de texto para consultas fuera de comandos de movimiento.

        Args:
          texto (str): Entrada original del usuario.
        """
        contexto = "".join([f"<|im_start|>{h['role']}\n{h['content']}<|im_end|>\n" for h in self.history])
        
        estado_en_tiempo_real = (
            f"--- TELEMETRÍA DEL ROBOT ---\n"
            f"Último producto escaneado: {self.estado_fisico['ultimo_producto_visto']}\n"
            f"Estado de seguridad: {self.estado_fisico['estado_seguridad']}\n"
            f"----------------------------\n"
        )

        prompt = (f"<|im_start|>system\n{self.identidad_stockbot}\n{estado_en_tiempo_real}\n{contexto}"
                  f"<|im_start|>user\n{texto}<|im_end|>\n<|im_start|>assistant\n")
        
        output = self.llm(prompt, max_tokens=256, stop=["<|im_end|>"], echo=False)
        res = output['choices'][0]['text'].strip()
        
        self.update_history("assistant", res)
        self.responder(res)

    def ejecutar_accion_pendiente(self):
        """ Ejecuta los servicios de ROS 2 basándose en la acción validada. """
        evento = self.pending_action
        self.pending_action = None
        
        msg_ok = "Afirmativo. Ejecutando ahora."
        if evento == "[PATROL_ON]":
            self.llamar_servicio(self.patrol_client, 1)
            self.responder(f"[CMD:PATROL_ON] {msg_ok}")
        elif evento == "[NAV_1]":
            self.llamar_servicio(self.nav_client, 1)
            self.responder(f"[CMD:NAV_1] {msg_ok}")
        elif evento == "[NAV_2]":
            self.llamar_servicio(self.nav_client, 2)
            self.responder(f"[CMD:NAV_2] {msg_ok}")

    def llamar_servicio(self, cliente, valor):
        """
        Llama de forma asíncrona a un servicio GoToPoint.

        Args:
          cliente (ActionClient): Cliente del servicio a invocar.
          valor (int): ID del punto u operación.
        """
        if cliente.wait_for_service(timeout_sec=1.0):
            req = GoToPoint.Request()
            req.point_id = valor
            cliente.call_async(req)

    def responder(self, texto):
        """ Publica el string de respuesta en el topic /chat_output. """
        res = String()
        res.data = texto
        self.pub.publish(res)
        self.get_logger().info(f'StockBot: {texto}')

    def update_history(self, role, content):
        """ Gestiona la memoria FIFO del chat. """
        self.history.append({"role": role, "content": content})
        if len(self.history) > self.max_history:
            self.history.pop(0)

    def lanzar_pregunta_confirmacion(self, evento):
        """ Solicita confirmación al usuario antes de proceder con una orden. """
        if evento == "[PATROL_ON]": self.responder("He recibido la orden de patrulla. ¿Confirma?")
        elif evento == "[NAV_1]": self.responder("¿Desea que me desplace a la Estantería 1?")
        elif evento == "[NAV_2]": self.responder("¿Navego hacia la zona de Cajas 1?")

def main(args=None):
    """ Punto de entrada principal del nodo. """
    rclpy.init(args=args)
    node = StockBotChat()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()