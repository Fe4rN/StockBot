import { useEffect, useRef, useState } from 'react';
import { useRos } from '../context/RosContext';
import yaml from 'js-yaml';

function Teleoperacion() {
    const { ros, isConnected } = useRos();
    const canvasRef = useRef(null);
    const [mapInfo, setMapInfo] = useState(null);
    const [robotPos, setRobotPos] = useState({ x: 0, y: 0 });
    const [statusText, setStatusText] = useState("Esperando órdenes...");

    // SOLUCIÓN: Toggle booleano para desmontar y remontar el tag de la imagen sin alterar la URL
    const [renderCam, setRenderCam] = useState(true);
    const recargarCamara = () => {
        setRenderCam(false);
        setTimeout(() => setRenderCam(true), 50);
    };

    useEffect(() => {
        fetch('/static/map.yaml')
            .then(res => res.text())
            .then(text => setMapInfo(yaml.load(text)))
            .catch(err => console.error("Error cargando YAML", err));
    }, []);

    useEffect(() => {
        if (!ros || !isConnected || !mapInfo || !canvasRef.current) return;

        const amclPoseTopic = new ROSLIB.Topic({
            ros: ros,
            name: '/amcl_pose',
            messageType: 'geometry_msgs/msg/PoseWithCovarianceStamped'
        });

        amclPoseTopic.subscribe((message) => {
            setRobotPos({ x: message.pose.pose.position.x, y: message.pose.pose.position.y });
        });

        return () => amclPoseTopic.unsubscribe();
    }, [ros, isConnected, mapInfo]);

    useEffect(() => {
        if (!mapInfo || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        const mapImage = new Image();
        mapImage.src = '/static/map.png';

        mapImage.onload = () => {
            canvasRef.current.width = mapImage.width;
            canvasRef.current.height = mapImage.height;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(mapImage, 0, 0);

            const res = mapInfo.resolution;
            const origin = mapInfo.origin;
            let pixelX = (robotPos.x - origin[0]) / res;
            let pixelY = canvasRef.current.height - ((robotPos.y - origin[1]) / res); 

            ctx.beginPath();
            ctx.fillStyle = '#1976d2'; 
            ctx.arc(pixelX, pixelY, 20, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 3; 
            ctx.stroke();
        };
    }, [mapInfo, robotPos]);

    const moveRobot = (linearX, angularZ) => {
        if (!ros || !isConnected) return alert("Conéctate primero");
        let cmdVelTopic = new ROSLIB.Topic({
            ros: ros, name: '/cmd_vel', messageType: 'geometry_msgs/msg/TwistStamped' 
        });
        let twist = new ROSLIB.Message({
            header: { stamp: {sec: 0, nanosec: 0}, frame_id: "base_link" },
            twist: { linear: { x: linearX, y: 0, z: 0 }, angular: { x: 0, y: 0, z: angularZ } }
        });
        cmdVelTopic.publish(twist);
        setStatusText(linearX === 0 && angularZ === 0 ? "Robot parado." : "Teleoperando...");
    };

    const sendRobot = (pointId) => {
        if (!ros || !isConnected) return;
        let navClient = new ROSLIB.Service({
            ros: ros, name: '/ir_a_estanteria', serviceType: 'stock_bot_interfaces/srv/GoToPoint'
        });
        setStatusText(`Viajando al punto ${pointId}...`);
        navClient.callService(new ROSLIB.ServiceRequest({ point_id: pointId }), (result) => {
            setStatusText(result.success ? "Llegó al punto." : "Error: " + result.message);
        });
    };

    return (
        <div style={{ display: 'flex', gap: '20px' }}>
            <section style={{ flex: 2 }}>
                <p style={{ color: 'blue', fontWeight: 'bold' }}>{statusText}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, background: '#eee', padding: '10px' }}>
                        <h3>Mapa</h3>
                        <canvas ref={canvasRef} style={{ width: '100%', background: '#fff' }}></canvas>
                    </div>
                    <div style={{ flex: 1, background: '#000', padding: '10px', color: 'white', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Cámara</h3>
                            <button 
                                onClick={recargarCamara} 
                                style={{ background: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.8em' }}>
                                🔄 Recargar
                            </button>
                        </div>
                        {isConnected && renderCam ? (
                            <img src="http://localhost:8080/stream?topic=/camera/image_raw" alt="Feed de StockBot" style={{ width: '100%', minHeight: '300px', objectFit: 'cover', marginTop: '10px' }} />
                        ) : (
                            <div style={{ width: '100%', minHeight: '300px', backgroundColor: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#aaa', borderRadius: '4px', marginTop: '10px' }}>
                                Esperando conexión a la cámara...
                            </div>
                        )}
                    </div>
                </div>
            </section>
            <section style={{ flex: 1 }}>
                <div className="manual-controls" style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
                    <h4>CONTROLES MANUALES</h4>
                    <div className="dpad" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <div />
                        <button onClick={() => moveRobot(0.2, 0)}>DELANTE</button>
                        <div />
                        <button onClick={() => moveRobot(0, 0.5)}>IZQUIERDA</button>
                        <button className="btn-danger" onClick={() => moveRobot(0, 0)}>PARAR</button>
                        <button onClick={() => moveRobot(0, -0.5)}>DERECHA</button>
                        <div />
                        <button onClick={() => moveRobot(-0.2, 0)}>ATRAS</button>
                        <div />
                    </div>
                </div>
                <div style={{ marginTop: '20px', background: 'white', padding: '20px', borderRadius: '8px' }}>
                    <h4>Navegar a punto</h4>
                    <button onClick={() => sendRobot(1)} style={{ marginRight: '10px' }}>Estantería 1</button>
                    <button onClick={() => sendRobot(2)}>Cajas 1</button>
                </div>
            </section>
        </div>
    );
}

export default Teleoperacion;