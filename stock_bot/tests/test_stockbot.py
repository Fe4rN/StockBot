import unittest
import sys
import os
# Añadimos el path para que encuentre la lógica
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from navigation_logic import get_coordinates, get_next_patrol_point, parse_decision

class TestStockBotLogic(unittest.TestCase):
    # Test de Navegación
    def test_navigation_coords(self):
        mapa = {"punto1": [1.0, 2.0], "punto2": [5.0, -3.0]}
        self.assertEqual(get_coordinates(1, mapa), [1.0, 2.0])
        self.assertIsNone(get_coordinates(99, mapa))

    # Test de Patrulla
    def test_patrol_cycle(self):
        self.assertEqual(get_next_patrol_point(2, 3), 0)
        self.assertEqual(get_next_patrol_point(0, 3), 1)

    # Test del Parser del Chatbot
    def test_chatbot_parser(self):
        self.assertEqual(parse_decision("ANÁLISIS: Ir a estantes. DECISIÓN: [NAV_1]"), "[NAV_1]")
        self.assertEqual(parse_decision("ANÁLISIS: Ir a cajas. DECISIÓN: [NAV_2]"), "[NAV_2]")
        self.assertEqual(parse_decision("Mala respuesta sin etiquetas"), "[NONE]")

if __name__ == '__main__':
    unittest.main()
