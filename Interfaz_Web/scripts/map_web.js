/**
 * @file map_web.js
 * @description Gestión de la visualización cartográfica y localización en tiempo real del robot.
 * Realiza la transformación de coordenadas entre el sistema de referencia de ROS 2 (metros) 
 * y el sistema de renderizado del Canvas HTML (píxeles).
 * * @author David Bayona Lujan
 * @project StockBot
 * @date Mayo 2026
 */

// --- CONFIGURACIÓN DE RECURSOS ESTÁTICOS ---
const mapYamlUrl = 'static/map.yaml'; 
const mapImageUrl = 'static/map.png'; 

// --- VARIABLES DE ESTADO ---
/** @type {Object|null} Metadatos técnicos del mapa (resolución, origen) cargados desde el YAML. */
let mapInfo = null;

/** @type {HTMLCanvasElement} Elemento del DOM donde se renderiza el mapa. */
let canvas = document.getElementById("mapCanvas");

/** @type {CanvasRenderingContext2D} Contexto de dibujo 2D para el renderizado. */
let ctx = canvas.getContext("2d");

/** @type {HTMLImageElement} Objeto de imagen que contiene el plano del almacén. */
let mapImage = new Image();

/** @type {Object} Almacena la posición actual del robot en coordenadas reales (metros). */
let robotPosition = { x: 0, y: 0 };

/**
 * @function loadMapData
 * @description Recupera de forma asíncrona los metadatos del mapa desde un archivo YAML 
 * y dispara la carga de la imagen asociada (.png).
 * @throws {Error} Si el archivo YAML no es accesible o el formato es inválido.
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
 * @function draw
 * @description Ciclo de renderizado principal. Limpia el canvas, dibuja el mapa de fondo 
 * y superpone la posición del robot mediante una transformación de coordenadas ROS -> Canvas.
 * * La fórmula utilizada para la transformación es: 
 * pixel = (posicion_metros - origen_metros) / resolucion_metros_pixel.
 */
function draw() {
    if (!mapInfo || !mapImage.complete) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapImage, 0, 0);

    const res = mapInfo.resolution;
    const origin = mapInfo.origin;

    let pixelX = (robotPosition.x - origin[0]) / res;
    let pixelY = canvas.height - ((robotPosition.y - origin[1]) / res); 

    ctx.beginPath();
    ctx.fillStyle = '#13a200'; 
    ctx.arc(pixelX, pixelY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
}

/**
 * @function initMapPoseSubscription
 * @description Inicializa la comunicación con ROS 2 mediante Rosbridge para recibir la 
 * localización corregida (Global Localization) a través del topic /amcl_pose.
 */
function initMapPoseSubscription() {
    let amclPoseTopic = new ROSLIB.Topic({
        ros: data.ros,
        name: '/amcl_pose',
        messageType: 'geometry_msgs/msg/PoseWithCovarianceStamped'
    });

    amclPoseTopic.subscribe((message) => {
        robotPosition.x = message.pose.pose.position.x;
        robotPosition.y = message.pose.pose.position.y;
        draw(); 
    });
}

// --- GESTORES DE EVENTOS ---

/**
 * Al completar la carga de la imagen, se ajustan las dimensiones del canvas 
 * al tamaño real de la imagen para evitar distorsiones en el escalado.
 */
mapImage.onload = () => {
    canvas.width = mapImage.width;
    canvas.height = mapImage.height;
    draw();
};

// Disparo inicial de carga de datos
loadMapData();