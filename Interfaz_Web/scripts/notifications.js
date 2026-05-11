// Función para formatear la fecha y la hora exacta
function formatExactDateTime(date) {
    return date.toLocaleString('es-ES', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

// Función que inserta filas en la tabla
function addRobotNotification(message, level) {
    const tbody = document.getElementById('notifications-body');
    if (!tbody) return;

    const row = document.createElement('tr');
    
    // Asignar colores según el nivel visualmente
    let color = "#333";
    if (level === "error") color = "#e74c3c"; // Rojo
    if (level === "warning") color = "#f1c40f"; // Amarillo
    if (level === "info") color = "#3498db"; // Azul

    row.innerHTML = `
        <td style="padding: 5px; border-bottom: 1px solid #eee;">${formatExactDateTime(new Date())}</td>
        <td style="padding: 5px; border-bottom: 1px solid #eee;">${message}</td>
        <td style="padding: 5px; border-bottom: 1px solid #eee; font-weight: bold; color: ${color};">${level.toUpperCase()}</td>
    `;

    // Inserta la notificación arriba del todo
    tbody.insertBefore(row, tbody.firstChild);

    // Mantiene un máximo de 10 notificaciones para no saturar el panel
    if (tbody.children.length > 10) {
        tbody.removeChild(tbody.lastChild);
    }
}

// Llama a esta función desde connection.js cuando el robot se conecte
function suscribirNotificaciones(rosInstance) {
    var notificationListener = new ROSLIB.Topic({
        ros : rosInstance,
        name : '/notificaciones_robot', 
        messageType : 'std_msgs/String' 
    });

    notificationListener.subscribe(function(message) {
        try {
            // El robot enviará un texto en formato JSON, por ejemplo:
            // '{"nivel": "error", "mensaje": "Batería al 10%"}'
            let datos = JSON.parse(message.data);
            
            // Llamamos a la tabla con los datos reales
            addRobotNotification(datos.mensaje, datos.nivel);
            
        } catch (e) {
            // Si el robot manda un texto normal sin formato JSON, lo ponemos como INFO
            addRobotNotification(message.data, "info");
        }
    });
}