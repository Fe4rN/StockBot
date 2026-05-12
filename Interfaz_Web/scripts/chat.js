// Variables para los topics de ROS
let chatPub = null;
let chatSub = null;

// Esta función se llama para preparar los topics (deberías llamarla cuando ROS conecte con éxito)
function initChatROS(rosConnection) {
    chatPub = new ROSLIB.Topic({
        ros: rosConnection,
        name: '/chat_input',
        messageType: 'std_msgs/String'
    });

    chatSub = new ROSLIB.Topic({
        ros: rosConnection,
        name: '/chat_output',
        messageType: 'std_msgs/String'
    });

    // Qué hacer cuando StockBot nos responde
    chatSub.subscribe(function(msg) {
        let texto = msg.data;
        let history = document.getElementById('chat-history');

        // --- MAGIA DE LA IA: DETECCIÓN DE CÓDIGOS SECRETOS ---
        if (texto.includes("[CMD:PATROL_ON]")) {
            texto = texto.replace("[CMD:PATROL_ON]", "").trim(); // Borramos el código para que el usuario no lo vea
            controlPatrol(1); // Simulamos que el usuario pulsó el botón "Activar Patrulla"
        } 
        else if (texto.includes("[CMD:PATROL_OFF]")) {
            texto = texto.replace("[CMD:PATROL_OFF]", "").trim();
            controlPatrol(0); // Simulamos botón "Parar Patrulla"
        }
        else if (texto.includes("[CMD:NAV_1]")) {
            texto = texto.replace("[CMD:NAV_1]", "").trim();
            sendRobot(1); // Simulamos botón "Estantería 1"
        }
        else if (texto.includes("[CMD:NAV_2]")) {
            texto = texto.replace("[CMD:NAV_2]", "").trim();
            sendRobot(2); // Simulamos botón "Cajas 1"
        }

        // Imprimimos el mensaje limpio en el chat
        history.innerHTML += `<p style="margin:0; color:#1976d2;"><strong>🤖 StockBot:</strong> ${texto}</p>`;
        history.scrollTop = history.scrollHeight; // Auto-scroll hacia abajo
    });
}

// Función para enviar mensajes
function sendChatMessage() {
    let input = document.getElementById('chat-input');
    let texto = input.value.trim();
    
    if(texto === '' || !chatPub) return;

    // 1. Mostrar mi propio mensaje en la pantalla
    let history = document.getElementById('chat-history');
    history.innerHTML += `<p style="margin:0; color:#333;"><strong>🧑‍💻 Tú:</strong> ${texto}</p>`;
    history.scrollTop = history.scrollHeight;

    // 2. Enviar a ROS 2
    let msg = new ROSLIB.Message({ data: texto });
    chatPub.publish(msg);

    // 3. Limpiar la caja de texto
    input.value = '';
}

// Para poder enviar dándole al "Enter"
function handleChatKeyPress(event) {
    if (event.key === "Enter") {
        sendChatMessage();
    }
}

function toggleChat() {
    console.log("Dado");
    const chat_ia = document.getElementById("container-chat");

    chat_ia.classList.toggle("hidden");
}