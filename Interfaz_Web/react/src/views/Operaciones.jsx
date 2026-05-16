import { useEffect, useState } from 'react';
import { useRos } from '../context/RosContext';

function Operaciones() {
    const { ros, isConnected, scanStatus, setScanStatus, securityAlert, setSecurityAlert, patrolMode, setPatrolMode } = useRos();
    const [isAlert, setIsAlert] = useState(false);

    useEffect(() => {
        if (!ros || !isConnected) return;

        const resultSub = new ROSLIB.Topic({ ros: ros, name: '/resultado_busqueda', messageType: 'std_msgs/String' });
        resultSub.subscribe((msg) => {
            if (msg.data !== "No encontrado") setScanStatus(msg.data.toUpperCase());
        });

        const intruderSub = new ROSLIB.Topic({ ros: ros, name: '/alertas_intrusion', messageType: 'std_msgs/String' });
        intruderSub.subscribe((msg) => {
            setSecurityAlert(`🚨 ${msg.data}`);
            setIsAlert(true);
            setTimeout(() => {
                setSecurityAlert("Sistema Normal");
                setIsAlert(false);
            }, 5000);
        });

        return () => { resultSub.unsubscribe(); intruderSub.unsubscribe(); };
    }, [ros, isConnected, setScanStatus, setSecurityAlert]);

    const controlPatrol = (command) => {
        if (!ros || !isConnected) return alert("Conéctate primero");
        let patrolClient = new ROSLIB.Service({ ros: ros, name: '/control_patrulla', serviceType: 'stock_bot_interfaces/srv/GoToPoint' });
        
        patrolClient.callService(new ROSLIB.ServiceRequest({ point_id: command }), (res) => {
            if (res.success) {
                // Seteamos el estado global según el comando enviado (1 = PATRULLA, 0 = MANUAL)
                setPatrolMode(command === 1 ? "PATRULLA" : "MANUAL");
            }
        });
    };

    const triggerScan = (active) => {
        if (!ros || !isConnected) return alert("Conéctate primero");
        let srv = new ROSLIB.Service({ ros: ros, name: active ? '/activar_escaneo' : '/detener_escaneo', serviceType: 'std_srvs/Trigger' });
        if (active) setScanStatus("BUSCANDO...");
        srv.callService(new ROSLIB.ServiceRequest({}), () => {
            if (!active) setScanStatus("En espera");
        });
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* NUEVO: Banner de estado de operación persistente */}
            <div id="mode-banner" className="mode-banner" style={{ padding: '15px', backgroundColor: '#e2e8f0', textAlign: 'center', marginBottom: '20px', borderRadius: '8px', fontWeight: 'bold', color: '#0a2540' }}>
                Modo de operación actual: {patrolMode}
            </div>

            <div style={{ padding: '15px', backgroundColor: isAlert ? '#ff0000' : '#f0f0f0', color: isAlert ? 'white' : 'black', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                Estado de Seguridad: {securityAlert}
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
                <div className="panel" style={{ flex: 1, padding: '20px', background: 'white', borderRadius: '8px' }}>
                    <h3>Gestión de Patrulla</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button onClick={() => controlPatrol(1)} className="btn-success">Activar Patrulla</button>
                        <button onClick={() => controlPatrol(0)} className="btn-danger">Parar Patrulla</button>
                    </div>
                </div>

                <div className="panel" style={{ flex: 1, padding: '20px', background: 'white', borderRadius: '8px' }}>
                    <h3>Control de Inventario</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => triggerScan(true)} className="btn-success" style={{ flex: 2 }}>🔍 ESCANEAR</button>
                        <button onClick={() => triggerScan(false)} className="btn-danger" style={{ flex: 1 }}>PARAR</button>
                    </div>
                    <p style={{ marginTop: '20px', fontWeight: 'bold', color: scanStatus === "En espera" ? '#0a2540' : '#2e7d32' }}>
                        Estado: {scanStatus}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Operaciones;