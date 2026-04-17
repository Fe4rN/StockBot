//----------------------------------------
//  Autor: Fedor Tikhomirov
//  © StockBot 2026
//----------------------------------------


//  Datos sobre la conexión a ROS2
let data = {
    ros: null,
    rosbridge_address: null,
    connected: false
}


//  Elementos de la página para feedback de conexión
let connection_box = document.getElementById("connection_container")
let connection_button = document.getElementById("connection_button")
let address_input = document.getElementById("address")
//  Colores de feedback de conexión
let connectionColor = "#13a200"
let disconnectedColor = "#fb532b"
//  Texto de botones de conexión y desconexión
let connect_button = "➜"
let disconnect_button = "✖"


// Función que gestiona la conexión al robot
// Recibe la dirección introducida por el usuario y prueba a hacer una conexión
function attempt_connection(robot_address) {
    data.rosbridge_address = robot_address

    data.ros = new ROSLIB.Ros({
        url: data.rosbridge_address
    })
        
    //  Callback de éxito
    data.ros.on("connection", () => {
        data.connected = true
        console.log("Conexion con ROSBridge correcta")
        connection_box.style.backgroundColor = connectionColor
        connection_button.textContent = disconnect_button
        address_input.disabled = true
    })

    //  Callback de error
    data.ros.on("error", (error) => {
        console.log("Error al conectar")
        console.log(error)
        connection_box.style.backgroundColor = disconnectedColor
        connection_button.textContent = connect_button
        address_input.disabled = false
    })

    //  Callback de cierre de conexión
    data.ros.on("close", () => {
        data.connected = false
        console.log("Conexion cerrada")
        connection_box.style.backgroundColor = disconnectedColor
        connection_button.textContent = connect_button
        address_input.disabled = false
    })
}

    
//  Función de desconexión
function disconnect() {
    if (data.ros) {
        data.ros.close()
    }
    data.connected = false
    console.log('Desconectado')
    connection_box.style.backgroundColor = disconnectedColor
    connection_button.textContent = connect_button
    address_input.disabled = false
}


//  Lectura y Parsing de la dirección introducida por el usuario,
//  así como la desconexión
connection_box.addEventListener("submit", (e) => {
    e.preventDefault();
        
    //  Desconexión
    if(data.connected == true){
        disconnect()
        return
    }

    // Lectura
    const address = document.getElementById("address").value.trim()

    //  Parsing
    let final_address = address
    if (!address.startsWith("ws://") && !address.startsWith("wss://")) {
        final_address = "ws://" + address
    }
        
    //  Conexión
    attempt_connection(final_address)
})