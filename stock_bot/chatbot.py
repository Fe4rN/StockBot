#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from llama_cpp import Llama
import os
# Importamos tus servicios para que Python pueda mover al robot de verdad
from stock_bot_interfaces.srv import GoToPoint

class StockBotChat(Node):
    def __init__(self):
        super().__init__('chatbot_node')
        
        model_path = os.path.expanduser("~/StockBot/stock_bot/models/qwen2-1_5b-instruct-q4_k_m.gguf")
        self.llm = Llama(model_path=model_path, n_gpu_layers=-1, n_ctx=2048, verbose=False)
        self.get_logger().info('¡StockBot (Versión Agente con Músculo) listo!')

        # --- MEMORIA ---
        self.history = [{"role": "system", "content": "Eres StockBot, un robot de almacén serio. Puedes patrullar y navegar. Responde corto."}]

        # --- COMUNICACIÓN ---
        self.sub = self.create_subscription(String, '/chat_input', self.listener_callback, 10)
        self.pub = self.create_publisher(String, '/chat_output', 10)

        # --- SERVICIOS (Músculos) ---
        self.patrol_client = self.create_client(GoToPoint, '/control_patrulla')
        self.nav_client = self.create_client(GoToPoint, '/ir_a_estanteria')

    def listener_callback(self, msg):
        user_input = msg.data
        self.get_logger().info(f'Usuario: {user_input}')

        # 1. GENERAR RESPUESTA DE PERSONALIDAD
        self.history.append({"role": "user", "content": user_input})
        prompt_chat = ""
        for m in self.history:
            role = "assistant" if m["role"] == "assistant" else m["role"]
            prompt_chat += f"<|im_start|>{role}\n{m['content']}<|im_end|>\n"
        prompt_chat += "<|im_start|>assistant\n"

        output = self.llm(prompt_chat, max_tokens=64, stop=["<|im_end|>"], echo=False)
        salida_ia = output['choices'][0]['text'].strip()
        self.history.append({"role": "assistant", "content": salida_ia})

        # 2. EL JUEZ (Mejorado para ser más sensible)
        prompt_juez = f"""<|im_start|>system
Analiza la intención del usuario. Responde SOLAMENTE con la etiqueta:
[PATROL_ON] -> si quiere patrullar, vigilar o dar vueltas.
[PATROL_OFF] -> si quiere parar o detenerse.
[NAV_1] -> si quiere ir a estantería 1 o productos.
[NAV_2] -> si quiere ir a cajas o zona de carga.
[NONE] -> charla normal.
<|im_end|>
<|im_start|>user
El usuario dijo: '{user_input}'
¿Qué quiere hacer?<|im_end|>
<|im_start|>assistant\n"""

        evaluacion = self.llm(prompt_juez, max_tokens=10, stop=["<|im_end|>"], echo=False)
        evento = evaluacion['choices'][0]['text'].strip().upper()

        # 3. EJECUTAR ACCIÓN REAL Y PREPARAR WEB
        final_msg = salida_ia
        if "[PATROL_ON]" in evento:
            self.llamar_servicio(self.patrol_client, 1)
            final_msg = f"[CMD:PATROL_ON] {salida_ia}"
        elif "[PATROL_OFF]" in evento:
            self.llamar_servicio(self.patrol_client, 0)
            final_msg = f"[CMD:PATROL_OFF] {salida_ia}"
        elif "[NAV_1]" in evento:
            self.llamar_servicio(self.nav_client, 1)
            final_msg = f"[CMD:NAV_1] {salida_ia}"
        elif "[NAV_2]" in evento:
            self.llamar_servicio(self.nav_client, 2)
            final_msg = f"[CMD:NAV_2] {salida_ia}"

        # 4. ENVIAR A LA WEB
        res = String()
        res.data = final_msg
        self.pub.publish(res)
        self.get_logger().info(f'Acción ejecutada: {evento}')

    def llamar_servicio(self, cliente, valor):
        if cliente.wait_for_service(timeout_sec=1.0):
            req = GoToPoint.Request()
            req.point_id = valor
            cliente.call_async(req)
        else:
            self.get_logger().error('Servicio no disponible')

def main(args=None):
    rclpy.init(args=args)
    node = StockBotChat()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()