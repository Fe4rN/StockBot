cd ~/turtlebot3_ws/src

colcon build --packages-select my_world --symlink-install

source install/setup.bash

ros2 launch my_world my_world.launch.py