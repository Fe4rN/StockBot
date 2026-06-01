import { useEffect, useState } from 'react';
import { useRos } from '../context/RosContext';

function Operaciones() {
    const { ros, isConnected, scanStatus, setScanStatus, securityAlert, patrolMode, setPatrolMode, darkMode } = useRos();
    const [productos, setProductos] = useState([]);
    
    // Comprobamos si hay una alerta activa para cambiar colores
    const isAlert = securityAlert !== "Sistema Normal";

    // Calcular KPIs de inventario de manera reactiva
    const totalTipos = productos.length;
    const totalStock = productos.reduce((sum, p) => sum + p.Cantidad, 0);

    const fetchProductos = () => {
        fetch("http://127.0.0.1:8000/productos/")
            .then(res => res.json())
            .then(data => setProductos(data))
            .catch(err => console.error("Error cargando productos", err));
    };

    useEffect(() => {
        fetchProductos();
        const interval = setInterval(fetchProductos, 3000);
        return () => clearInterval(interval);
    }, []);

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
            
            {/* Cabecera de Alertas y KPIs de Inventario */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div style={{ flex: 1, background: 'linear-gradient(90deg, #0a2540 0%, #173d66 100%)', padding: '20px', borderRadius: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85em', color: '#a3c2e0', textTransform: 'uppercase', letterSpacing: '1px' }}>Modo de Operación</span>
                        <span style={{ fontSize: '1.4em', fontWeight: 'bold' }}>{patrolMode}</span>
                    </div>
                    {patrolMode === 'PATRULLA' && <span style={{ fontSize: '2.5em' }}>🔄</span>}
                </div>

                <div style={{ 
                    flex: 1, 
                    background: isAlert ? 'linear-gradient(90deg, #dc3545 0%, #c82333 100%)' : (darkMode ? '#0d1527' : 'white'), 
                    padding: '20px', 
                    borderRadius: '16px', 
                    color: isAlert ? 'white' : (darkMode ? '#fff' : '#2c3e50'), 
                    border: isAlert ? 'none' : (darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0f0f0'), 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
                    transition: 'all 0.3s' 
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85em', color: isAlert ? '#ffcccc' : (darkMode ? '#a0aec0' : '#888'), textTransform: 'uppercase', letterSpacing: '1px' }}>Vigilancia por Visión Artificial</span>
                        <span style={{ fontSize: '1.4em', fontWeight: 'bold' }}>{securityAlert}</span>
                    </div>
                    <span style={{ fontSize: '2em' }}>{isAlert ? '🚨' : '🛡️'}</span>
                </div>

                {/* Card 3: Categorías Únicas */}
                <div style={{ 
                    flex: 1,
                    background: darkMode ? 'linear-gradient(135deg, #1e3a8a 0%, #0d1b3e 100%)' : 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    color: darkMode ? 'white' : '#0369a1',
                    border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #bae6fd',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
                    transition: 'all 0.3s' 
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85em', color: darkMode ? '#93c5fd' : '#0284c7', textTransform: 'uppercase', letterSpacing: '1px' }}>Categorías Únicas</span>
                        <span style={{ fontSize: '1.4em', fontWeight: 'bold' }}>{totalTipos} tipos</span>
                    </div>
                    <span style={{ fontSize: '2em' }}>📦</span>
                </div>

                {/* Card 4: Total de Productos */}
                <div style={{ 
                    flex: 1,
                    background: darkMode ? 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)' : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    color: darkMode ? 'white' : '#15803d',
                    border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #bbf7d0',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
                    transition: 'all 0.3s' 
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85em', color: darkMode ? '#6ee7b7' : '#16a34a', textTransform: 'uppercase', letterSpacing: '1px' }}>Stock en Almacén</span>
                        <span style={{ fontSize: '1.4em', fontWeight: 'bold' }}>{totalStock} uds</span>
                    </div>
                    <span style={{ fontSize: '2em' }}>📊</span>
                </div>
            </div>

            {/* Tarjetas de Control */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                
                {/* Panel de Patrulla */}
                <div style={{ 
                    background: darkMode ? '#0d1527' : 'white', 
                    padding: '30px', 
                    borderRadius: '16px', 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
                    border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0f0f0', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'all 0.3s'
                }}>
                    <h3 style={{ margin: '0 0 20px 0', color: darkMode ? '#fff' : '#2c3e50', fontSize: '1.2em', borderBottom: darkMode ? '2px solid #1a243d' : '2px solid #f4f7f6', paddingBottom: '15px' }}>Gestión de Patrulla Autónoma</h3>
                    <p style={{ color: darkMode ? '#a0aec0' : '#666', fontSize: '0.95em', marginBottom: '25px', lineHeight: '1.5' }}>Activa la ruta predefinida del robot por el almacén para tareas de supervisión. El robot esquivará obstáculos automáticamente.</p>
                    
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
                <div style={{ 
                    background: darkMode ? '#0d1527' : 'white', 
                    padding: '30px', 
                    borderRadius: '16px', 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
                    border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0f0f0', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'all 0.3s'
                }}>
                    <h3 style={{ margin: '0 0 20px 0', color: darkMode ? '#fff' : '#2c3e50', fontSize: '1.2em', borderBottom: darkMode ? '2px solid #1a243d' : '2px solid #f4f7f6', paddingBottom: '15px' }}>Control de Inventario (Lector)</h3>
                    
                    <div style={{ 
                        background: darkMode ? '#152238' : '#f8f9fa', 
                        padding: '20px', 
                        borderRadius: '12px', 
                        textAlign: 'center', 
                        marginBottom: '25px', 
                        border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e9ecef' 
                    }}>
                        <span style={{ fontSize: '0.9em', color: darkMode ? '#a0aec0' : '#666', display: 'block', marginBottom: '5px' }}>Último producto detectado:</span>
                        <span style={{ 
                            fontSize: '1.8em', 
                            fontWeight: '900', 
                            color: scanStatus === "En espera" ? (darkMode ? '#fff' : '#0a2540') : scanStatus === "BUSCANDO..." ? '#f59f00' : '#2e7d32' 
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
                            style={{ 
                                ...btnStyle, 
                                background: darkMode ? '#152238' : '#eef2f5', 
                                color: '#dc3545', 
                                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #dce1e6' 
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabla de Inventario de Productos */}
            <div style={{ 
                background: darkMode ? '#0d1527' : 'white', 
                padding: '30px', 
                borderRadius: '16px', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
                border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0f0f0', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'all 0.3s'
            }}>
                <h3 style={{ margin: '0 0 20px 0', color: darkMode ? '#fff' : '#2c3e50', fontSize: '1.2em', borderBottom: darkMode ? '2px solid #1a243d' : '2px solid #f4f7f6', paddingBottom: '15px' }}>
                    Inventario en Almacén
                </h3>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: darkMode ? '#152238' : '#f8f9fa' }}>
                                <th style={{ padding: '12px 15px', color: darkMode ? '#fff' : '#333' }}>Producto</th>
                                <th style={{ padding: '12px 15px', color: darkMode ? '#fff' : '#333' }}>Cantidad</th>
                                <th style={{ padding: '12px 15px', color: darkMode ? '#fff' : '#333' }}>Almacén</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productos.length > 0 ? productos.map((p) => (
                                <tr key={p.ID} style={{ borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #eee' }}>
                                    <td style={{ padding: '12px 15px', color: darkMode ? '#e2e8f0' : '#333', fontWeight: 'bold' }}>{p.Nombre}</td>
                                    <td style={{ padding: '12px 15px', color: darkMode ? '#e2e8f0' : '#333' }}>
                                        <span style={{ 
                                            padding: '4px 10px', 
                                            borderRadius: '6px', 
                                            background: 'rgba(59, 130, 246, 0.1)', 
                                            color: '#3b82f6', 
                                            fontWeight: 'bold' 
                                        }}>
                                            {p.Cantidad} uds
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 15px', color: darkMode ? '#cbd5e1' : '#666' }}>{p.Almacen === 1 ? 'PayoLandia' : 'Hachas Jauregui'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                                        No hay productos registrados en el inventario.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Operaciones;