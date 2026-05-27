import { useEffect, useState } from 'react';
import { useRos } from '../context/RosContext';

function Notificaciones() {
    const { ros, isConnected, darkMode } = useRos();
    const [notifs, setNotifs] = useState([]);
    const [filtro, setFiltro] = useState('todos');
    const [orden, setOrden] = useState('reciente'); // 'reciente' o 'antiguo'

    // 1. Cargar historial desde la API al montar el componente
    useEffect(() => {
        fetch("http://127.0.0.1:8000/avisos/")
            .then(res => res.json())
            .then(data => {
                const formated = data.map(a => {
                    const rawTime = a.Tiempo || a.fecha_creacion;
                    const horaStr = rawTime ? new Date(rawTime).toLocaleTimeString('es-ES') : '';
                    return { 
                        id: Math.random(),
                        dbId: a.ID, 
                        hora: horaStr, 
                        rawTime: rawTime,
                        motivo: a.Informacion, 
                        nivel: a.Tipo 
                    };
                });
                setNotifs(formated); // Guardamos todos para controlarlos en el cliente
            })
            .catch(err => console.error("Error cargando historial BBDD:", err));
    }, []);

    // 2. Escuchar notificaciones en vivo de ROS
    useEffect(() => {
        if (!ros || !isConnected) return;

        const notifSub = new ROSLIB.Topic({ ros: ros, name: '/notificaciones_robot', messageType: 'std_msgs/String' });
        
        notifSub.subscribe((msg) => {
            let nivel = "info", mensaje = msg.data;
            try {
                const datos = JSON.parse(msg.data);
                nivel = datos.nivel; mensaje = datos.mensaje;
            } catch (e) {}

            const nueva = { 
                id: Math.random(), 
                dbId: null,
                hora: new Date().toLocaleTimeString('es-ES'), 
                rawTime: new Date().toISOString(),
                motivo: mensaje, 
                nivel: nivel 
            };
            setNotifs(prev => [nueva, ...prev]); 
        });

        return () => notifSub.unsubscribe();
    }, [ros, isConnected]);

    // Eliminar aviso por ID (BBDD + Estado frontend)
    const handleEliminar = (id, dbId) => {
        setNotifs(prev => prev.filter(n => n.id !== id));
        if (dbId) {
            fetch(`http://127.0.0.1:8000/avisos/${dbId}`, { method: 'DELETE' })
                .then(res => {
                    if (!res.ok) console.error("Error al borrar en API");
                })
                .catch(err => console.error("Error de red al borrar:", err));
        }
    };

    // Vaciar todas las alertas mostradas
    const handleLimpiarTodo = () => {
        // Borramos primero de base de datos las que tienen dbId
        const promesas = notifs
            .filter(n => n.dbId)
            .map(n => fetch(`http://127.0.0.1:8000/avisos/${n.dbId}`, { method: 'DELETE' }));
        
        Promise.all(promesas)
            .then(() => setNotifs([]))
            .catch(err => console.error("Error al limpiar todas las alertas:", err));
    };

    // Filtrado de las notificaciones
    const notifsFiltradas = notifs.filter(n => {
        if (filtro === 'todos') return true;
        if (filtro === 'danger') return n.nivel === 'danger' || n.nivel === 'error';
        if (filtro === 'warning') return n.nivel === 'warning';
        if (filtro === 'info') return n.nivel === 'info' || n.nivel === 'success';
        return true;
    });

    // Ordenamiento por hora
    const notifsOrdenadas = [...notifsFiltradas].sort((a, b) => {
        const timeA = new Date(a.rawTime || 0).getTime();
        const timeB = new Date(b.rawTime || 0).getTime();
        return orden === 'reciente' ? timeB - timeA : timeA - timeB;
    });

    // Estadísticas rápidas para el panel
    const countDanger = notifs.filter(n => n.nivel === 'danger' || n.nivel === 'error').length;
    const countWarning = notifs.filter(n => n.nivel === 'warning').length;
    const countInfo = notifs.filter(n => n.nivel === 'info' || n.nivel === 'success').length;

    return (
        <div style={{ 
            maxWidth: '1100px', 
            margin: '0 auto', 
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            {/* Fila de Tarjetas de Resumen (Estilo Sala de Control) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '15px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.8em', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Críticos</div>
                        <div style={{ fontSize: '1.8em', fontWeight: '900', color: '#ef4444' }}>{countDanger}</div>
                    </div>
                    <span style={{ fontSize: '1.8em' }}>🛑</span>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '15px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.8em', color: '#f59e0b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alertas</div>
                        <div style={{ fontSize: '1.8em', fontWeight: '900', color: '#f59e0b' }}>{countWarning}</div>
                    </div>
                    <span style={{ fontSize: '1.8em' }}>⚠️</span>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '15px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.8em', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sistemas / OK</div>
                        <div style={{ fontSize: '1.8em', fontWeight: '900', color: '#10b981' }}>{countInfo}</div>
                    </div>
                    <span style={{ fontSize: '1.8em' }}>✅</span>
                </div>
            </div>

            {/* Contenedor Principal */}
            <div style={{ 
                background: darkMode ? '#0d1527' : 'white', 
                padding: '25px', 
                borderRadius: '16px', 
                border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0f0f0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                color: darkMode ? '#fff' : '#2c3e50',
                transition: 'all 0.3s'
            }}>
                <h3 style={{ borderBottom: darkMode ? '2px solid #1a243d' : '2px solid #eee', paddingBottom: '15px', color: darkMode ? '#fff' : '#2c3e50', marginBottom: '20px' }}>
                    REGISTRO DE NOTIFICACIONES DE SEGURIDAD Y CONTROL
                </h3>

                {/* Filtros, Ordenamiento y Limpieza */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: '15px',
                    marginBottom: '25px' 
                }}>
                    {/* Botones de Filtro por nivel */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['todos', 'danger', 'warning', 'info'].map((tipo) => {
                            const label = tipo === 'todos' ? 'Todos' : tipo === 'danger' ? 'Críticos' : tipo === 'warning' ? 'Alertas' : 'Sistemas';
                            const isActive = filtro === tipo;
                            
                            let activeBg = '#0d6efd';
                            if (tipo === 'danger') activeBg = '#ef4444';
                            if (tipo === 'warning') activeBg = '#f59e0b';
                            if (tipo === 'info') activeBg = '#10b981';

                            return (
                                <button 
                                    key={tipo}
                                    onClick={() => setFiltro(tipo)}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: isActive ? activeBg : (darkMode ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9'),
                                        color: isActive ? 'white' : (darkMode ? '#94a3b8' : '#64748b'),
                                        fontWeight: '700',
                                        fontSize: '0.85em',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Ordenamiento y Botón de Limpiar */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <select 
                            value={orden} 
                            onChange={(e) => setOrden(e.target.value)}
                            style={{ 
                                padding: '8px 12px', 
                                borderRadius: '8px', 
                                border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #dce1e6', 
                                background: darkMode ? '#152238' : '#fff',
                                color: darkMode ? '#fff' : '#0a2540',
                                fontWeight: 'bold',
                                fontSize: '0.85em',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="reciente">Más recientes primero</option>
                            <option value="antiguo">Más antiguos primero</option>
                        </select>

                        {notifs.length > 0 && (
                            <button 
                                onClick={handleLimpiarTodo}
                                style={{ 
                                    padding: '8px 14px', 
                                    borderRadius: '8px', 
                                    background: 'rgba(239, 68, 68, 0.1)', 
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444', 
                                    fontWeight: '700',
                                    fontSize: '0.85em',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                                onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                            >
                                Limpiar todo
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabla de Avisos */}
                <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: darkMode ? '#152238' : '#f8f9fa' }}>
                                <th style={{ padding: '15px', color: darkMode ? '#fff' : '#333', width: '120px' }}>Hora</th>
                                <th style={{ padding: '15px', color: darkMode ? '#fff' : '#333' }}>Motivo</th>
                                <th style={{ padding: '15px', color: darkMode ? '#fff' : '#333', width: '120px' }}>Nivel</th>
                                <th style={{ padding: '15px', color: darkMode ? '#fff' : '#333', width: '100px', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notifsOrdenadas.length > 0 ? notifsOrdenadas.map((n) => {
                                let badgeColor = '#3b82f6';
                                if (n.nivel === 'danger' || n.nivel === 'error') badgeColor = '#ef4444';
                                else if (n.nivel === 'warning') badgeColor = '#f59e0b';
                                else if (n.nivel === 'success') badgeColor = '#10b981';

                                return (
                                    <tr key={n.id} style={{ borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid #eee' }}>
                                        <td style={{ padding: '15px', color: darkMode ? '#e2e8f0' : '#333' }}>{n.hora}</td>
                                        <td style={{ padding: '15px', color: darkMode ? '#e2e8f0' : '#333' }}>{n.motivo}</td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{ 
                                                padding: '4px 10px', 
                                                borderRadius: '6px', 
                                                background: badgeColor + '1a', 
                                                color: badgeColor, 
                                                fontWeight: '800',
                                                fontSize: '0.8em',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {n.nivel.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <button 
                                                onClick={() => handleEliminar(n.id, n.dbId)}
                                                style={{ 
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    fontSize: '1em',
                                                    fontWeight: 'bold',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                title="Descartar aviso"
                                            >
                                                Descartar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#999', fontSize: '0.9em' }}>
                                        No hay notificaciones registradas para este filtro.
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

export default Notificaciones;