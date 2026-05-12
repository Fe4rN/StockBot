#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from llama_cpp import Llama
import os
from datetime import datetime
from stock_bot_interfaces.srv import GoToPoint

class StockBotChat(Node):
    def __init__(self):
        super().__init__('chatbot_node')
        
        # Ruta al modelo 7B
        model_path = os.path.expanduser("~/StockBot/stock_bot/models/Qwen2.5-7B-Instruct-Q4_K_M.gguf")
        
        self.get_logger().info('Cargando Qwen 2.5 7B en la RTX 4060...')
        self.llm = Llama(model_path=model_path, n_gpu_layers=-1, n_ctx=2048, verbose=False)
        self.get_logger().info('¡Cerebro activado! Filtro de dominio y Juez listos.')

        self.pending_action = None
        self.fecha_hoy = datetime.now().strftime("%A, %d de mayo de 2026")

        self.sub = self.create_subscription(String, '/chat_input', self.listener_callback, 10)
        self.pub = self.create_publisher(String, '/chat_output', 10)
        self.patrol_client = self.create_client(GoToPoint, '/control_patrulla')
        self.nav_client = self.create_client(GoToPoint, '/ir_a_estanteria')

    def listener_callback(self, msg):
        user_input = msg.data.strip()
        user_input_lower = user_input.lower()
        
        self.get_logger().info(f'--- PROCESANDO: "{user_input}" ---')

        # ========================================================
        # 1. FILTRO DE DOMINIO (Guardrail)
        # ========================================================
        # Esto es lo que evita que hable de comida o tonterías.
        prompt_filtro = f"""<|im_start|>system
Eres un filtro de seguridad industrial. Tu misión es decidir si el mensaje es RELEVANTE para un robot de almacén (logística, seguridad, quién eres, navegación).
Si el usuario habla de temas personales, comida, ocio o cosas fuera del almacén, responde RECHAZAR.
Si el usuario da órdenes o pregunta sobre tu trabajo, responde ACEPTAR.
Ejemplos:
"Me voy a comer" -> RECHAZAR
"Vete a la estantería" -> ACEPTAR
"¿Qué tal el partido?" -> RECHAZAR
"¿Qué sabes hacer?" -> ACEPTAR
<|im_end|>
<|im_start|>user
{user_input}<|im_end|>
<|im_start|>assistant
"""
        res_filtro = self.llm(prompt_filtro, max_tokens=10, stop=["<|im_end|>"], echo=False)
        clasificacion = res_filtro['choices'][0]['text'].strip().upper()

        if "RECHAZAR" in clasificacion:
            self.get_logger().info('[DEBUG] Mensaje fuera de dominio. Rechazando.')
            self.responder("No puedo ayudarte con eso. Mis funciones se limitan exclusivamente a la logística y seguridad del almacén.")
            return

        # ========================================================
        # 2. LÓGICA DE CONFIRMACIÓN
        # ========================================================
        if self.pending_action:
            if any(w in user_input_lower for w in ["si", "vale", "adelante", "hazlo", "confirmo"]):
                self.ejecutar_accion_pendiente()
                return
            else:
                self.get_logger().info('[DEBUG] Acción pendiente cancelada por cambio de tema.')
                self.pending_action = None

        # ========================================================
        # 3. EL JUEZ (Clasificador de Órdenes)
        # ========================================================
        prompt_juez = f"""<|im_start|>system
Clasifica la orden mecánica: [PATROL_ON], [PATROL_OFF], [NAV_1], [NAV_2] o [NONE].
"Vigila el pasillo" -> [PATROL_ON]
"Vete a las cajas" -> [NAV_2]
"¿De qué eres capaz?" -> [NONE]
<|im_end|>
<|im_start|>user
{user_input}<|im_end|>
<|im_start|>assistant
["""
        res_juez = self.llm(prompt_juez, max_tokens=10, stop=["]"], echo=False)
        evento = "[" + res_juez['choices'][0]['text'].strip().upper() + "]"

        if "[NONE]" in evento:
            self.generar_charla(user_input)
        else:
            self.pending_action = evento
            self.lanzar_pregunta_confirmacion(evento)

    def generar_charla(self, texto):
        prompt = (
            f"<|im_start|>system\nHoy es {self.fecha_hoy}. Eres StockBot, robot de vigilancia del Equipo 5. "
            f"Solo respondes sobre logística y seguridad. Sé técnico y breve.<|im_end|>\n"
            f"<|im_start|>user\n{texto}<|im_end|>\n<|im_start|>assistant\n"
        )
        output = self.llm(prompt, max_tokens=64, stop=["<|im_end|>"], echo=False)
        self.responder(output['choices'][0]['text'].strip())

    def lanzar_pregunta_confirmacion(self, evento):
        if "[PATROL_ON]" in evento: self.responder("¿Confirmas el inicio de la patrulla de vigilancia?")
        elif "[NAV_1]" in evento: self.responder("¿Quieres que me desplace a la Estantería 1?")
        elif "[NAV_2]" in evento: self.responder("¿Deseas que navegue hasta la zona de Cajas 1?")

    def ejecutar_accion_pendiente(self):
        evento = self.pending_action
        self.pending_action = None
        msg_ok = "Afirmativo. Ejecutando ahora."
        
        if "[PATROL_ON]" in evento:
            self.llamar_servicio(self.patrol_client, 1)
            self.responder(f"[CMD:PATROL_ON] {msg_ok}")
        elif "[NAV_1]" in evento:
            self.llamar_servicio(self.nav_client, 1)
            self.responder(f"[CMD:NAV_1] {msg_ok}")
        elif "[NAV_2]" in evento:
            self.llamar_servicio(self.nav_client, 2)
            self.responder(f"[CMD:NAV_2] {msg_ok}")

    def responder(self, texto):
        res = String()
        res.data = texto
        self.pub.publish(res)
        self.get_logger().info(f'StockBot: {texto}')

    def llamar_servicio(self, cliente, valor):
        if cliente.wait_for_service(timeout_sec=1.0):
            req = GoToPoint.Request()
            req.point_id = valor
            cliente.call_async(req)

def main(args=None):
    rclpy.init(args=args)
    node = StockBotChat()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()