import { useEffect, useState } from 'react';
import { useRos } from '../context/RosContext';

function Notificaciones() {
    const { ros, isConnected } = useRos();
    const [notifs, setNotifs] = useState([]);

    // 1. Cargar historial desde la API al montar el componente
    useEffect(() => {
        fetch("http://127.0.0.1:8000/avisos/")
            .then(res => res.json())
            .then(data => {
                const formated = data.map(a => ({ id: Math.random(), hora: a.fecha_creacion, motivo: a.Informacion, nivel: a.Tipo }));
                setNotifs(formated.reverse().slice(0, 15)); // Últimos 15
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

            const nueva = { id: Math.random(), hora: new Date().toLocaleTimeString('es-ES'), motivo: mensaje, nivel: nivel };
            setNotifs(prev => [nueva, ...prev].slice(0, 15)); // Añadir arriba y mantener máx 15
        });

        return () => notifSub.unsubscribe();
    }, [ros, isConnected]);

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', padding: '25px', borderRadius: '8px' }}>
            <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '15px' }}>REGISTRO DE NOTIFICACIONES</h3>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                            <th style={{ padding: '15px' }}>Hora</th>
                            <th style={{ padding: '15px' }}>Motivo</th>
                            <th style={{ padding: '15px' }}>Nivel</th>
                        </tr>
                    </thead>
                    <tbody>
                        {notifs.map((n) => (
                            <tr key={n.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '15px' }}>{n.hora}</td>
                                <td style={{ padding: '15px' }}>{n.motivo}</td>
                                <td style={{ padding: '15px', fontWeight: 'bold', color: n.nivel === 'error' ? 'red' : n.nivel === 'warning' ? 'orange' : 'blue' }}>
                                    {n.nivel.toUpperCase()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Notificaciones;