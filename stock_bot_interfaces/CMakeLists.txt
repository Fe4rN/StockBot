cmake_minimum_required(VERSION 3.8)
project(stock_bot_interfaces)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# 1. Buscar dependencias necesarias
find_package(ament_cmake REQUIRED)
find_package(rosidl_default_generators REQUIRED) # Obligatorio para interfaces

# 2. Generar las interfaces del servicio
rosidl_generate_interfaces(${PROJECT_NAME}
  "srv/GoToPoint.srv"
)

# 3. Exportar el paquete
ament_package()