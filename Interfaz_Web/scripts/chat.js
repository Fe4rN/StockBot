/** @type {ROSLIB.Topic} */
let chatPub = null;
/** @type {ROSLIB.Topic} */
let chatSub = null;

/**
 * Inicializa los topics de ROS para el chat y configura el parser de comandos.
 * @param {ROSLIB.Ros} rosConnection - Conexión activa a ROS Bridge.
 */
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

    chatSub.subscribe(function(msg) {
        let texto = msg.data;
        const history = document.getElementById('chat-history');

        if (texto.includes("[CMD:PATROL_ON]")) {
            texto = texto.replace("[CMD:PATROL_ON]", "").trim();
            controlPatrol(1);
        } 
        else if (texto.includes("[CMD:PATROL_OFF]")) {
            texto = texto.replace("[CMD:PATROL_OFF]", "").trim();
            controlPatrol(0);
        }
        else if (texto.includes("[CMD:NAV_1]")) {
            texto = texto.replace("[CMD:NAV_1]", "").trim();
            sendRobot(1);
        }
        else if (texto.includes("[CMD:NAV_2]")) {
            texto = texto.replace("[CMD:NAV_2]", "").trim();
            sendRobot(2);
        }

        history.innerHTML += `<p style="margin:0; color:#1976d2;"><strong>🤖 StockBot:</strong> ${texto}</p>`;
        history.scrollTop = history.scrollHeight;
    });
}

/**
 * Procesa y envía el mensaje del usuario al topic de entrada de ROS.
 */
function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const texto = input.value.trim();
    
    if(texto === '' || !chatPub) return;

    const history = document.getElementById('chat-history');
    history.innerHTML += `<p style="margin:0; color:#333;"><strong>🧑‍💻 Tú:</strong> ${texto}</p>`;
    history.scrollTop = history.scrollHeight;

    chatPub.publish(new ROSLIB.Message({ data: texto }));
    input.value = '';
}

/**
 * Gestiona el envío de mensajes al pulsar la tecla Enter.
 * @param {KeyboardEvent} event - Evento de teclado capturado.
 */
function handleChatKeyPress(event) {
    if (event.key === "Enter") {
        sendChatMessage();
    }
}

/**
 * Alterna la visibilidad del contenedor de la interfaz del chatbot.
 */
function toggleChat() {
    const chat_ia = document.getElementById("container-chat");
    chat_ia.classList.toggle("hidden");
}