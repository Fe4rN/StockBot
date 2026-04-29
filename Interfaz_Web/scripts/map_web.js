/**
 * Lógica para la visualización del mapa y posición del robot.
 * StockBot 2026
 */

// Configuración de rutas
const mapYamlUrl = 'static/map.yaml'; 
const mapImageUrl = 'static/map.pgm'; 

let mapInfo = null;
let canvas = document.getElementById("mapCanvas");
let ctx = canvas.getContext("2d");
let mapImage = new Image();
let robotPosition = { x: 0, y: 0 };

/**
 * Carga el archivo YAML y la imagen del mapa.
 */
function loadMapData() {
    fetch(mapYamlUrl)
        .then(response => response.text())
        .then(yamlText => {
            mapInfo = jsyaml.load(yamlText);
            mapImage.src = mapImageUrl;
            console.log("Mapa cargado: ", mapInfo);
        })
        .catch(err => console.error("Error cargando mapa: ", err));
}

/**
 * Dibuja el mapa y el robot (punto verde) en el canvas.
 */
function draw() {
    if (!mapInfo || !mapImage.complete) return;

    // 1. Limpiar canvas y dibujar fondo
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapImage, 0, 0);

    // 2. Transformación de coordenadas ROS -> Píxeles
    const res = mapInfo.resolution;
    const origin = mapInfo.origin; // [x, y, z]

    // Fórmula del Colab: (Posición - Origen) / Resolución
    let pixelX = (robotPosition.x - origin[0]) / res;
    let pixelY = canvas.height - ((robotPosition.y - origin[1]) / res); 

    // 3. Dibujar al StockBot
    ctx.beginPath();
    ctx.fillStyle = '#13a200'; // Verde StockBot
    ctx.arc(pixelX, pixelY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
}

/**
 * Suscripción al topic de odometría.
 */
function initOdomSubscription() {
    let odomTopic = new ROSLIB.Topic({
        ros: data.ros, // Usa la conexión global definida en connection.js
        name: '/odom',
        messageType: 'nav_msgs/msg/Odometry'
    });

    odomTopic.subscribe((message) => {
        robotPosition.x = message.pose.pose.position.x;
        robotPosition.y = message.pose.pose.position.y;
        draw(); 
    });
}

// Iniciar carga del mapa al cargar el script
mapImage.onload = () => {
    canvas.width = mapImage.width;
    canvas.height = mapImage.height;
    draw();
};
loadMapData();