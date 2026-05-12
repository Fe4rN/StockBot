#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from llama_cpp import Llama
import os

class StockBotChat(Node):
    def __init__(self):
        super().__init__('chatbot_node')
        
        model_path = os.path.expanduser("~/StockBot/stock_bot/models/qwen2-1_5b-instruct-q4_k_m.gguf")
        
        self.get_logger().info(f'Cargando IA en la GPU...')
        
        try:
            self.llm = Llama(
                model_path=model_path,
                n_gpu_layers=-1,
                n_ctx=2048,
                verbose=False
            )
            self.get_logger().info('¡StockBot ya tiene conciencia! Listo para hablar.')
        except Exception as e:
            self.get_logger().error(f'Error cargando el modelo: {e}')

        # --- COMUNICACIÓN ---
        self.sub = self.create_subscription(String, '/chat_input', self.listener_callback, 10)
        self.pub = self.create_publisher(String, '/chat_output', 10)

    def listener_callback(self, msg):
        user_text = msg.data
        self.get_logger().info(f'Usuario dice: {user_text}')

        # Definimos la personalidad de StockBot (Versión sincera y estricta)
        prompt = f"<|im_start|>system\nEres StockBot, un asistente de texto básico en fase de desarrollo. Sé serio, directo y honesto. Actualmente NO tienes acceso al inventario real, NO puedes mover el robot y NO puedes leer sensores. Tu única funcionalidad actual es chatear y responder preguntas de texto. Responde siempre en una sola frase muy corta y no inventes capacidades que no tienes.<|im_end|>\n<|im_start|>user\n{user_text}<|im_end|>\n<|im_start|>assistant\n"
        
        # Generación de la respuesta
        output = self.llm(
            prompt,
            max_tokens=60, # Límite bajo para que responda súper rápido
            stop=["<|im_end|>"], # Etiqueta de parada correcta para Qwen
            echo=False
        )

        respuesta = output['choices'][0]['text'].strip()
        
        # Enviamos la respuesta a la web
        response_msg = String()
        response_msg.data = respuesta
        self.pub.publish(response_msg)
        self.get_logger().info(f'StockBot responde: {respuesta}')

def main(args=None):
    rclpy.init(args=args)
    node = StockBotChat()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()