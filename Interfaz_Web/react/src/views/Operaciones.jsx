import { useRos } from '../context/RosContext';

function Operaciones() {
    // Ya no necesitamos useEffects aquí, todo viene del cerebro global
    const { ros, isConnected, scanStatus, setScanStatus, securityAlert, patrolMode, setPatrolMode } = useRos();
    
    // Comprobamos si hay una alerta activa para cambiar colores
    const isAlert = securityAlert !== "Sistema Normal";

    const controlPatrol = (command) => {
        if (!ros || !isConnected) return;
        let patrolClient = new ROSLIB.Service({ ros: ros, name: '/control_patrulla', serviceType: 'stock_bot_interfaces/srv/GoToPoint' });
        
        patrolClient.callService(new ROSLIB.ServiceRequest({ point_id: command }), (res) => {
            if (res.success) {
                setPatrolMode(command === 1 ? "PATRULLA" : "MANUAL");
            }
        });
    };

    const triggerScan = (active) => {
        if (!ros || !isConnected) return;
        let srv = new ROSLIB.Service({ ros: ros, name: active ? '/activar_escaneo' : '/detener_escaneo', serviceType: 'std_srvs/Trigger' });
        
        if (active) setScanStatus("BUSCANDO...");
        
        srv.callService(new ROSLIB.ServiceRequest({}), () => {
            if (!active) setScanStatus("En espera");
        });
    };

    // Estilos reutilizables para botones
    const btnStyle = { padding: '15px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '1em', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            
            {/* Cabecera de Alertas y Modos */}
            <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1, background: 'linear-gradient(90deg, #0a2540 0%, #173d66 100%)', padding: '20px', borderRadius: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85em', color: '#a3c2e0', textTransform: 'uppercase', letterSpacing: '1px' }}>Modo de Operación</span>
                        <span style={{ fontSize: '1.4em', fontWeight: 'bold' }}>{patrolMode}</span>
                    </div>
                    {patrolMode === 'PATRULLA' && <span style={{ fontSize: '2em' }}>🔄</span>}
                </div>

                <div style={{ flex: 1, background: isAlert ? 'linear-gradient(90deg, #dc3545 0%, #c82333 100%)' : 'white', padding: '20px', borderRadius: '16px', color: isAlert ? 'white' : '#2c3e50', border: isAlert ? 'none' : '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', transition: 'all 0.3s' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85em', color: isAlert ? '#ffcccc' : '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Vigilancia por Visión Artificial</span>
                        <span style={{ fontSize: '1.4em', fontWeight: 'bold' }}>{securityAlert}</span>
                    </div>
                    <span style={{ fontSize: '2em' }}>{isAlert ? '🚨' : '🛡️'}</span>
                </div>
            </div>

            {/* Tarjetas de Control */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                
                {/* Panel de Patrulla */}
                <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50', fontSize: '1.2em', borderBottom: '2px solid #f4f7f6', paddingBottom: '15px' }}>Gestión de Patrulla Autónoma</h3>
                    <p style={{ color: '#666', fontSize: '0.95em', marginBottom: '25px', lineHeight: '1.5' }}>Activa la ruta predefinida del robot por el almacén para tareas de supervisión. El robot esquivará obstáculos automáticamente.</p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: 'auto' }}>
                        <button 
                            onClick={() => controlPatrol(1)} 
                            style={{ ...btnStyle, background: '#198754', color: 'white', opacity: patrolMode === 'PATRULLA' ? 0.5 : 1 }}
                            disabled={patrolMode === 'PATRULLA'}
                        >
                            Iniciar Patrulla
                        </button>
                        <button 
                            onClick={() => controlPatrol(0)} 
                            style={{ ...btnStyle, background: '#dc3545', color: 'white', opacity: patrolMode === 'MANUAL' ? 0.5 : 1 }}
                            disabled={patrolMode === 'MANUAL'}
                        >
                            Detener Robot
                        </button>
                    </div>
                </div>

                {/* Panel de Escáner de Inventario */}
                <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50', fontSize: '1.2em', borderBottom: '2px solid #f4f7f6', paddingBottom: '15px' }}>Control de Inventario (Lector)</h3>
                    
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '25px', border: '1px solid #e9ecef' }}>
                        <span style={{ fontSize: '0.9em', color: '#666', display: 'block', marginBottom: '5px' }}>Último producto detectado:</span>
                        <span style={{ 
                            fontSize: '1.8em', 
                            fontWeight: '900', 
                            color: scanStatus === "En espera" ? '#0a2540' : scanStatus === "BUSCANDO..." ? '#f59f00' : '#2e7d32' 
                        }}>
                            {scanStatus}
                        </span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginTop: 'auto' }}>
                        <button 
                            onClick={() => triggerScan(true)} 
                            style={{ ...btnStyle, background: '#0d6efd', color: 'white', boxShadow: '0 4px 12px rgba(13,110,253,0.2)' }}
                        >
                            Activar Escáner
                        </button>
                        <button 
                            onClick={() => triggerScan(false)} 
                            style={{ ...btnStyle, background: '#eef2f5', color: '#dc3545', border: '1px solid #dce1e6' }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Operaciones;