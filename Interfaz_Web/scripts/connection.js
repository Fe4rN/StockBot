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

        // --- PROTECCIÓN: Solo ejecutamos si el elemento existe ---
        if (connection_box) { 
            connection_box.style.backgroundColor = connectionColor; 
        }
        if (connection_button) { 
            connection_button.textContent = disconnect_button; 
        }
        if (address_input) { 
            address_input.disabled = true; 
        }
        if (control_panel) { 
            control_panel.style.display = "block"; 
        }
        // ---------------------------------------------------------

        // 2. Activar la escucha de la cámara
        subscribeToCameraResults();

        initSecuritySubscriber();

        // 3. Activar el mapa
        if (typeof initMapPoseSubscription === "function") {
            initMapPoseSubscription();
        }
    });

    //  Callback de ERROR
    data.ros.on("error", (error) => {
        console.log("Error al conectar");
        
        // --- PROTECCIÓN ---
        if (connection_button) { 
            connection_button.textContent = connect_button; 
        }
        if (address_input) { 
            address_input.disabled = false; 
        }
        if (control_panel) { 
            control_panel.style.display = "none"; 
        }
    });

    //  Callback de CIERRE
    data.ros.on("close", () => {
        data.connected = false;
        console.log("Conexion cerrada");
        
        // --- PROTECCIÓN ---
        if (connection_button) { 
            connection_button.textContent = connect_button; 
        }
        if (address_input) { 
            address_input.disabled = false; 
        }
        if (control_panel) { 
            control_panel.style.display = "none"; 
        }
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
if (connection_box) {
    connection_box.addEventListener("submit", (e) => {
        e.preventDefault();
            
        if(data.connected == true){
            disconnect();
            return;
        }

        const address_input = document.getElementById("address");
        if (address_input) {
            const address = address_input.value.trim();
            let final_address = address;
            if (!address.startsWith("ws://") && !address.startsWith("wss://")) {
                final_address = "ws://" + address;
            }
            attempt_connection(final_address);
        }
    });
}


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

// Función para activar el escaneo de productos 
function activarEscaneo() {
    if (!data.connected) {
        alert("Primero conéctate al robot");
        return;
    }

    // Definición del servicio Trigger
    let scanClient = new ROSLIB.Service({
        ros : data.ros,
        name : '/activar_escaneo',
        serviceType : 'std_srvs/Trigger'
    });

    // Feedback visual inmediato en la interfaz
    let statusElement = document.getElementById("status_text");
    let scanStatus = document.getElementById("scan-status");

    scanStatus.innerText = "BUSCANDO...";
    scanStatus.style.color = "#1976d2"; // Azul de tu paleta
    statusElement.style.color = "#1976d2";

    scanClient.callService(new ROSLIB.ServiceRequest({}), function(result) {
        console.log("Servicio de escaneo activado con éxito");
    });
}

// Función para suscribirse a la cámara (Escucha lo que detecta el Python)
function subscribeToCameraResults() {
    let resultSubscriber = new ROSLIB.Topic({
        ros : data.ros,
        name : '/resultado_busqueda',
        messageType : 'std_msgs/String'
    });

    resultSubscriber.subscribe(function(message) {
        let statusElement = document.getElementById("status_text");
        let scanStatus = document.getElementById("scan-status");

        // Si recibimos "No encontrado", simplemente actualizamos el estado visual
        if (message.data === "No encontrado") {
            if (scanStatus.innerText === "BUSCANDO...") {
                statusElement.innerText = "Escaneando... asegúrate de que el código esté de frente.";
                statusElement.style.color = "#1976d2"; // Azul UPV/StockBot
            }
        } 
        // Si recibimos CUALQUIER OTRA COSA (el nombre del producto)
        else {
            // 1. Actualizamos el texto grande de estado
            statusElement.innerText = "¡OPERACIÓN EXITOSA!";
            statusElement.style.color = "#2e7d32"; // Tu verde de btn-success

            // 2. Mostramos el nombre del producto detectado en el mini-panel
            scanStatus.innerText = message.data.toUpperCase(); 
            scanStatus.style.color = "#2e7d32";

            console.log("📦 Producto detectado en el almacén: " + message.data);
            
            // Opcional: Podrías hacer que el robot pare de moverse aquí si quieres
            // moveRobot(0,0); 
        }
    });
}

// deteccion de personas 
// Variable fuera de la función para controlar el temporizador
let alertTimer = null;
let isAlertActive = false;

function initSecuritySubscriber() {
    let intruderListener = new ROSLIB.Topic({
        ros : data.ros,
        name : '/alertas_intrusion',
        messageType : 'std_msgs/String'
    });

    intruderListener.subscribe(function(message) {
        // Si ya hay una alerta activa, ignoramos los nuevos mensajes para evitar el parpadeo
        if (isAlertActive) return;

        console.warn('🚨 INTRUSIÓN DETECTADA: Bloqueando interfaz 15s');
        isAlertActive = true;

        let allStatusTexts = document.querySelectorAll("#status_text");
        let securityStatus = document.getElementById("security_status");
        let panelElement = document.getElementById("security_panel");

        // 1. Activamos la alerta en todos los sitios
        allStatusTexts.forEach(element => {
            element.innerText = "🚨 " + message.data;
            element.style.color = "red";
            element.style.fontWeight = "bold";
        });

        if (securityStatus && panelElement) {
            securityStatus.innerText = "🚨 " + message.data;
            securityStatus.style.color = "white";
            panelElement.style.backgroundColor = "#ff0000";
        }

        // 2. Creamos el temporizador de 15 segundos (15000ms)
        alertTimer = setTimeout(() => {
            // Reset de los textos
            allStatusTexts.forEach(element => {
                element.innerText = "Sistema Normal / En espera";
                element.style.color = "black";
                element.style.fontWeight = "normal";
            });

            // Reset del panel
            if (securityStatus && panelElement) {
                securityStatus.innerText = "Sistema Normal";
                securityStatus.style.color = "black";
                panelElement.style.backgroundColor = "#f0f0f0";
            }

            // Liberamos el bloqueo para que pueda volver a saltar si hay otra detección
            isAlertActive = false;
            console.log('✅ Alerta finalizada, sistema rearmado');
        }, 15000); 
    });
}


/**
 * Llama al servicio de patrulla de StockBot.
 * @param {number} command - 1 para iniciar, 0 para detener.
 */
function controlPatrol(command) {
    if (!data.connected) {
        alert("Primero conéctate al robot");
        return;
    }

    // Definición del cliente del servicio
    let patrolClient = new ROSLIB.Service({
        ros : data.ros,
        name : '/control_patrulla',
        serviceType : 'stock_bot_interfaces/srv/GoToPoint'
    });

    // Petición: id 1 (ON) o id 0 (OFF)
    let request = new ROSLIB.ServiceRequest({
        point_id : command
    });

    let statusElement = document.getElementById("status_text");
    let modeBanner = document.getElementById("mode-banner");
    statusElement.innerText = (command === 1) ? "Iniciando patrulla..." : "Deteniendo robot...";
    statusElement.style.color = "blue";

    // Llamada al servicio
    patrolClient.callService(request, function(result) {
        if(result.success) {
            statusElement.innerText = result.message;
            statusElement.style.color = (command === 1) ? "green" : "black";
            modeBanner.innerText = "Modo de operación actual: PATRULLA"
        } else {
            statusElement.innerText = "Fallo en patrulla: " + result.message;
            statusElement.style.color = "red";
        }
    });
}

// ---------------------------------------------------------
// --- CONTROL MANUAL POR TOPICS (/cmd_vel) ----------------
// ---------------------------------------------------------

/**
 * Publica velocidades directamente al topic /cmd_vel
 * @param {number} linearX - Velocidad lineal (positiva=delante, negativa=atrás)
 * @param {number} angularZ - Velocidad angular (positiva=izquierda, negativa=derecha)
 */
function moveRobot(linearX, angularZ) {
    if (!data.connected) {
        alert("Primero conéctate al robot");
        return;
    }

    // Definimos el Topic
    let cmdVelTopic = new ROSLIB.Topic({
        ros: data.ros,
        name: '/cmd_vel',
        // Usamos TwistStamped tal y como pedía el simulador en tus colabs anteriores
        messageType: 'geometry_msgs/msg/TwistStamped' 
    });

    // Construimos el mensaje de velocidad
    let twistMessage = new ROSLIB.Message({
        header: { 
            stamp: {sec: 0, nanosec: 0}, 
            frame_id: "base_link" 
        },
        twist: { 
            linear: { x: linearX, y: 0.0, z: 0.0 }, 
            angular: { x: 0.0, y: 0.0, z: angularZ } 
        }
    });

    // Publicamos el mensaje en ROS
    cmdVelTopic.publish(twistMessage);
    
    // Actualizamos el texto de estado en la web para tener feedback
    let statusElement = document.getElementById("status_text");
    if (linearX === 0 && angularZ === 0) {
        statusElement.innerText = "Robot parado manualmente.";
        statusElement.style.color = "black";
    } else {
        statusElement.innerText = "Teleoperación manual activa...";
        statusElement.style.color = "blue";
    }
}

// ========================================================
// === BLOQUE MOCK: AUTOCONEXIÓN (BORRAR EN PRODUCCIÓN) ===
// ========================================================
// Esta función fuerza la conexión automática para pruebas
/*
(function autoConnectMock() {
    // CAMBIO IMPORTANTE: Puerto 9090 (no 9000)
    const default_robot_ip = "ws://127.0.0.1:9090"; 
    
    console.warn("⚠️ MOCK: Intentando autoconexión a " + default_robot_ip);
    
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (!data.connected) attempt_connection(default_robot_ip);
        }, 1000); 
    });
})();
*/
// ========================================================


function tabChanger(num_tab){
    tab_camara=document.getElementById("tab-camara");
    tab_mapa=document.getElementById("tab-mapa");
    map_container=document.getElementById("map-container");
    cam_container=document.getElementById("cam-container");

    if(num_tab==1 && tab_mapa.classList.contains("active")){
        tab_camara.classList.add("active");
        tab_mapa.classList.remove("active");
        map_container.style.display= "none";
        cam_container.style.display= "block";
    }else if(num_tab==2 && tab_camara.classList.contains("active")){
        tab_camara.classList.remove("active");
        tab_mapa.classList.add("active");
        map_container.style.display= "block";
        cam_container.style.display= "none";
    }
    
}