cmake_minimum_required(VERSION 3.8)
project(stock_bot)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# Encontramos las dependencias de ament
find_package(ament_cmake REQUIRED)

# Instalamos tus scripts de Python
install(PROGRAMS
  chatbot.py
  DESTINATION lib/${PROJECT_NAME}
)

# Esto DEBE ir siempre al final
ament_package()