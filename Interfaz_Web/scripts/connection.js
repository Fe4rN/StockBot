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
let connection_box = document.getElementById("connection_container");
let connection_button = document.getElementById("connection_button");
let address_input = document.getElementById("address");
let control_panel = document.getElementById("control_panel"); // Guardamos la referencia al panel

//  Colores de feedback de conexión
let connectionColor = "#13a200";
let disconnectedColor = "#fb532b";
//  Texto de botones de conexión y desconexión
let connect_button = "➜";
let disconnect_button = "✖";

// Función que gestiona la conexión al robot
function attempt_connection(robot_address) {
    data.rosbridge_address = robot_address;

    data.ros = new ROSLIB.Ros({
        url: data.rosbridge_address
    });
        
    //  Callback de ÉXITO
    data.ros.on("connection", () => {
        data.connected = true;
        console.log("Conexion con ROSBridge correcta");
        connection_box.style.backgroundColor = connectionColor;
        connection_button.textContent = disconnect_button;
        address_input.disabled = true;
        
        // 1. Mostrar el panel al conectar
        control_panel.style.display = "block";
        // 2. Activar la escucha de la cámara
        subscribeToCameraResults();
    });

    //  Callback de ERROR
    data.ros.on("error", (error) => {
        console.log("Error al conectar");
        console.log(error);
        connection_box.style.backgroundColor = disconnectedColor;
        connection_button.textContent = connect_button;
        address_input.disabled = false;
        
        // Ocultar el panel si hay error
        control_panel.style.display = "none";
    });

    //  Callback de CIERRE
    data.ros.on("close", () => {
        data.connected = false;
        console.log("Conexion cerrada");
        connection_box.style.backgroundColor = disconnectedColor;
        connection_button.textContent = connect_button;
        address_input.disabled = false;
        
        // Ocultar el panel si se cierra la conexión
        control_panel.style.display = "none";
    });
}
    
//  Función de desconexión manual
function disconnect() {
    if (data.ros) {
        data.ros.close();
    }
    data.connected = false;
    console.log('Desconectado');
    connection_box.style.backgroundColor = disconnectedColor;
    connection_button.textContent = connect_button;
    address_input.disabled = false;
    
    // Ocultar el panel al desconectar
    control_panel.style.display = "none";
}

//  Lectura y Parsing de la dirección introducida por el usuario
connection_box.addEventListener("submit", (e) => {
    e.preventDefault();
        
    if(data.connected == true){
        disconnect();
        return;
    }

    const address = document.getElementById("address").value.trim();

    let final_address = address;
    if (!address.startsWith("ws://") && !address.startsWith("wss://")) {
        final_address = "ws://" + address;
    }
        
    attempt_connection(final_address);
});


// ---------------------------------------------------------
// --- FUNCIONES DEL ROBOT (Navegación y Visión) -----------
// ---------------------------------------------------------

// Función para enviar al robot a la estantería
function sendRobot(pointId) {
    if (!data.connected) return;

    let navClient = new ROSLIB.Service({
        ros : data.ros,
        name : '/ir_a_estanteria',
        serviceType : 'stock_bot_interfaces/srv/GoToPoint'
    });

    let request = new ROSLIB.ServiceRequest({
        point_id : pointId
    });

    let statusElement = document.getElementById("status_text");
    statusElement.innerText = "Viajando a la estantería " + pointId + "...";
    statusElement.style.color = "blue";

    navClient.callService(request, function(result) {
        if(result.success) {
            statusElement.innerText = "Llegó al punto. Buscando producto...";
            statusElement.style.color = "orange";
        } else {
            statusElement.innerText = "Error: " + result.message;
            statusElement.style.color = "red";
        }
    });
}

// Función para suscribirse a la cámara
function subscribeToCameraResults() {
    let resultSubscriber = new ROSLIB.Topic({
        ros : data.ros,
        name : '/resultado_busqueda',
        messageType : 'std_msgs/String'
    });

    resultSubscriber.subscribe(function(message) {
        let statusElement = document.getElementById("status_text");
        
        // Mejorado: Solo mostramos si lo encuentra o no, SI YA está buscando.
        if (statusElement.innerText.includes("Buscando producto")) {
            if (message.data === "Encontrado") {
                statusElement.innerText = "¡Encontrado! El producto está en la estantería.";
                statusElement.style.color = "green";
            } else if (message.data === "No encontrado") {
                statusElement.innerText = "Buscando producto... (No encontrado en la vista actual)";
                statusElement.style.color = "orange";
            }
        }
    });
}