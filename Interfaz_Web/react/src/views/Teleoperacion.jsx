import { useEffect, useRef, useState } from 'react';
import { useRos } from '../context/RosContext';
import yaml from 'js-yaml';

function Teleoperacion() {
    // CORREGIDO: Importamos statusText y setStatusText del contexto global
    const { ros, isConnected, patrolMode, statusText, setStatusText } = useRos();
    
    const canvasRef = useRef(null);
    const [mapInfo, setMapInfo] = useState(null);
    const [robotPos, setRobotPos] = useState({ x: 0, y: 0 });
    const [renderCam, setRenderCam] = useState(true);

    const [puntoSeleccionado, setPuntoSeleccionado] = useState('1');
    const [busqueda, setBusqueda] = useState('');
    const [desplegableAbierto, setDesplegableAbierto] = useState(false);

    const isDrivingRef = useRef(false);

    const puntosAlmacen = [
        { id: '1', nombre: 'Estantería 1' },
        { id: '2', nombre: 'Zona de Cajas 1' },
        { id: '3', nombre: 'Ejemplo 3 (no hace nada)' },
    ];

    const puntosFiltrados = puntosAlmacen.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    const nombreSeleccionado = puntosAlmacen.find(p => p.id === puntoSeleccionado)?.nombre || 'Selecciona un punto...';

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
        const amclPoseTopic = new ROSLIB.Topic({ ros: ros, name: '/amcl_pose', messageType: 'geometry_msgs/msg/PoseWithCovarianceStamped' });
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
            ctx.fillStyle = '#0d6efd'; 
            ctx.arc(pixelX, pixelY, 20, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 3; 
            ctx.stroke();
        };
    }, [mapInfo, robotPos]);

    const forzarParadaPatrulla = () => {
        if (patrolMode === 'PATRULLA') {
            let patrolClient = new ROSLIB.Service({ ros: ros, name: '/control_patrulla', serviceType: 'stock_bot_interfaces/srv/GoToPoint' });
            patrolClient.callService(new ROSLIB.ServiceRequest({ point_id: 0 }), () => {});
        }
    };

    const moveRobot = (linearX, angularZ) => {
        if (!ros || !isConnected) return;
        
        forzarParadaPatrulla();
        
        let cmdVelTopic = new ROSLIB.Topic({ ros: ros, name: '/cmd_vel', messageType: 'geometry_msgs/msg/TwistStamped' });
        let twist = new ROSLIB.Message({
            header: { stamp: {sec: 0, nanosec: 0}, frame_id: "base_link" },
            twist: { linear: { x: linearX, y: 0, z: 0 }, angular: { x: 0, y: 0, z: angularZ } }
        });
        cmdVelTopic.publish(twist);
        setStatusText(linearX === 0 && angularZ === 0 ? "🛑 Robot parado en seco." : "Controlando manualmente...");
    };

    const startMoving = (linearX, angularZ) => {
        isDrivingRef.current = true;
        moveRobot(linearX, angularZ);
    };

    const stopMoving = () => {
        if (isDrivingRef.current) {
            moveRobot(0, 0);
            isDrivingRef.current = false;
        }
    };

    const sendRobot = (pointId) => {
        if (!ros || !isConnected) return;
        
        forzarParadaPatrulla();
        
        const destinoObj = puntosAlmacen.find(p => parseInt(p.id) === pointId);
        const nombreDestino = destinoObj ? destinoObj.nombre : `Punto ${pointId}`;
        
        let navClient = new ROSLIB.Service({ ros: ros, name: '/ir_a_estanteria', serviceType: 'stock_bot_interfaces/srv/GoToPoint' });
        setStatusText(`Viajando a destino: ${nombreDestino}...`);
        
        navClient.callService(new ROSLIB.ServiceRequest({ point_id: pointId }), (result) => {
            setStatusText(result.success ? `✅ ¡Llegó a: ${nombreDestino}!` : `❌ Error viajando a ${nombreDestino}: ` + result.message);
        });
    };

    const dpadBtnStyle = { background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '12px', padding: '15px', cursor: 'pointer', fontSize: '1.5em', transition: 'all 0.1s', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '65px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };

    return (
        <div style={{ display: 'flex', gap: '30px', width: '100%', boxSizing: 'border-box' }}>
            
            <section style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                
                <div style={{ background: 'linear-gradient(90deg, #0a2540 0%, #173d66 100%)', padding: '15px 25px', borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: isConnected ? '#28a745' : '#dc3545', display: 'inline-block' }}></span>
                        {isConnected ? 'Sistema StockBot Conectado' : 'Esperando Conexión ROSBridge'}
                    </span>
                    
                    <span style={{ 
                        background: patrolMode === 'PATRULLA' ? 'rgba(40, 167, 69, 0.2)' : 'rgba(255,255,255,0.15)', 
                        padding: '6px 16px', 
                        borderRadius: '20px', 
                        fontSize: '0.9em', 
                        fontWeight: '500',
                        color: patrolMode === 'PATRULLA' ? '#a3ffb4' : 'white',
                        border: patrolMode === 'PATRULLA' ? '1px solid rgba(40, 167, 69, 0.5)' : 'none'
                    }}>
                        {patrolMode === 'PATRULLA' ? 'Modo patrulla activo' : statusText}
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', height: '480px' }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50', fontSize: '1.1em', borderBottom: '2px solid #f4f7f6', paddingBottom: '10px' }}>🗺️ Mapa del Almacén</h3>
                        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee', flex: 1, display: 'flex', background: '#f8f9fa' }}>
                            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }}></canvas>
                        </div>
                    </div>

                    <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', height: '480px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 15px 0', borderBottom: '2px solid #f4f7f6', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '1.1em' }}>📷 Cámara Frontal</h3>
                            <button onClick={recargarCamara} style={{ background: '#f0f4f8', color: '#2c3e50', border: '1px solid #dce1e6', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.85em', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                Refrescar
                            </button>
                        </div>
                        <div style={{ borderRadius: '12px', overflow: 'hidden', background: '#1a1a1a', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isConnected && renderCam ? (
                                <img src="http://localhost:8080/stream?topic=/camera/image_raw" alt="Feed" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ color: '#aaa', fontSize: '0.9em' }}>{isConnected ? 'Cargando feed de vídeo...' : 'Sin conexión a la cámara'}</span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
                    <h3 style={{ margin: '0 0 25px 0', color: '#2c3e50', textAlign: 'center', fontSize: '1.1em' }}>Control Manual</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '240px', margin: '0 auto' }}>
                        <div />
                        <button onMouseDown={() => startMoving(0.2, 0)} onMouseUp={stopMoving} onMouseLeave={stopMoving} style={dpadBtnStyle}>⬆️</button>
                        <div />
                        <button onMouseDown={() => startMoving(0, 0.5)} onMouseUp={stopMoving} onMouseLeave={stopMoving} style={dpadBtnStyle}>⬅️</button>
                        <button onClick={() => { isDrivingRef.current = false; moveRobot(0, 0); }} style={{...dpadBtnStyle, background: '#dc3545', color: 'white', border: 'none', boxShadow: '0 4px 10px rgba(220,53,69,0.3)'}}>🛑</button>
                        <button onMouseDown={() => startMoving(0, -0.5)} onMouseUp={stopMoving} onMouseLeave={stopMoving} style={dpadBtnStyle}>➡️</button>
                        <div />
                        <button onMouseDown={() => startMoving(-0.2, 0)} onMouseUp={stopMoving} onMouseLeave={stopMoving} style={dpadBtnStyle}>⬇️</button>
                        <div />
                    </div>
                    <p style={{ textAlign: 'center', margin: '20px 0 0 0', fontSize: '0.8em', color: '#888' }}>Mantén pulsado para dirigir al robot</p>
                </div>

                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50', fontSize: '1.1em' }}>Navegación Autónoma</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <label style={{ fontSize: '0.85em', color: '#666', fontWeight: 'bold' }}>Buscar destino objetivo:</label>
                        
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input 
                                type="text" 
                                placeholder="🔍 Ej: Estantería..."
                                value={desplegableAbierto ? busqueda : nombreSeleccionado}
                                onFocus={() => { setDesplegableAbierto(true); setBusqueda(''); }}
                                onChange={(e) => setBusqueda(e.target.value)}
                                onBlur={() => setTimeout(() => setDesplegableAbierto(false), 200)}
                                style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #dce1e6', background: '#f8f9fa', color: '#0a2540', fontWeight: 'bold', fontSize: '0.9em', outline: 'none', boxSizing: 'border-box' }}
                            />
                            
                            {desplegableAbierto && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #eee', borderRadius: '8px', marginTop: '5px', maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', zIndex: 10 }}>
                                    {puntosFiltrados.length > 0 ? puntosFiltrados.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => { setPuntoSeleccionado(p.id); setDesplegableAbierto(false); }}
                                            style={{ padding: '12px 15px', cursor: 'pointer', borderBottom: '1px solid #f8f9fa', color: '#333', fontSize: '0.9em' }}
                                            onMouseEnter={(e) => e.target.style.background = '#f0f4f8'}
                                            onMouseLeave={(e) => e.target.style.background = 'white'}
                                        >
                                            {p.nombre}
                                        </div>
                                    )) : (
                                        <div style={{ padding: '12px 15px', color: '#999', fontSize: '0.9em', textAlign: 'center' }}>No se encontraron puntos.</div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={() => sendRobot(parseInt(puntoSeleccionado))} 
                            style={{ width: '100%', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '10px', padding: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95em', boxShadow: '0 4px 12px rgba(13,110,253,0.25)', transition: 'background 0.2s', marginTop: '5px' }}
                            onMouseEnter={(e) => e.target.style.background = '#0056b3'}
                            onMouseLeave={(e) => e.target.style.background = '#0d6efd'}
                        >
                            Enviar al punto seleccionado
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Teleoperacion;