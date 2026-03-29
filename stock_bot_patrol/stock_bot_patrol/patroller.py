import rclpy
from rclpy.node import Node
from rclpy.action import ActionClient
from rclpy.executors import MultiThreadedExecutor
from rclpy.callback_groups import ReentrantCallbackGroup
from nav2_msgs.action import FollowWaypoints
from stock_bot_interfaces.srv import GoToPoint
from geometry_msgs.msg import PoseStamped

class PatrollerNode(Node):
    def __init__(self):
        super().__init__('patroller_node')
        
        self.group = ReentrantCallbackGroup()
        self.patrolling = False    
        self.is_executing = False 
        self.goal_handle = None

        self.waypoints_coords = [
            [7.0, -0.8],
            [8.32, -6.3],
            [2.0, -5.0],
            [0.0, 0.0]
        ]
        
        self.client = ActionClient(self, FollowWaypoints, 'follow_waypoints', callback_group=self.group)
        self.srv = self.create_service(GoToPoint, 'control_patrulla', self.service_callback, callback_group=self.group)
        
        self.timer = self.create_timer(1.0, self.patrol_manager, callback_group=self.group)
        
        self.get_logger().info('--- Listo para patrullar ---')

    async def service_callback(self, request, response):
        if request.point_id == 1:
            self.get_logger().info("Activando interruptor de patrulla...")
            self.patrolling = True
            response.success = True
            response.message = "Patrulla activada. El robot empezará en breve."
                
        elif request.point_id == 0:
            self.get_logger().warn("Desactivando interruptor de patrulla...")
            self.patrolling = False
            if self.goal_handle:
                await self.goal_handle.cancel_goal_async()
            response.success = True
            response.message = "Patrulla desactivada y robot parado."
            
        return response

    async def patrol_manager(self):
        """Gestiona el bucle sin saturar a Nav2"""
        if self.patrolling and not self.is_executing:
            self.is_executing = True 
            self.get_logger().info(">>> Iniciando nueva vuelta de patrulla...")
            
            success = await self.execute_nav2_patrol()
            
            if success:
                self.get_logger().info("Vuelta completada con éxito.")
            else:
                self.get_logger().warn("Vuelta interrumpida o fallida.")
            
            self.is_executing = False 

    async def execute_nav2_patrol(self):
        if not self.client.wait_for_server(timeout_sec=5.0):
            return False

        goal_msg = FollowWaypoints.Goal()
        for coords in self.waypoints_coords:
            p = PoseStamped()
            p.header.frame_id = 'map'
            p.header.stamp = self.get_clock().now().to_msg()
            p.pose.position.x, p.pose.position.y = float(coords[0]), float(coords[1])
            p.pose.orientation.w = 1.0
            goal_msg.poses.append(p)

        self.get_logger().info(f'Enviando {len(goal_msg.poses)} puntos a Nav2...')
        
        try:
            send_goal_future = await self.client.send_goal_async(goal_msg)
            if not send_goal_future.accepted:
                return False

            self.goal_handle = send_goal_future
            result_future = await send_goal_future.get_result_async()
            return result_future.status == 4 
        except Exception as e:
            self.get_logger().error(f"Error en acción: {e}")
            return False

def main():
    rclpy.init()
    node = PatrollerNode()
    executor = MultiThreadedExecutor()
    executor.add_node(node)
    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()