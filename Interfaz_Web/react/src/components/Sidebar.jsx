import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useRos } from '../context/RosContext';

function Sidebar() {
    const { ros, isConnected } = useRos();
    const [chatOpen, setChatOpen] = useState(false);
    const [history, setHistory] = useState([{ sender: 'bot', text: '¡Hola! Soy StockBot. ¿Qué necesitas?' }]);
    const [inputVal, setInputVal] = useState('');

    useEffect(() => {
        if (!ros || !isConnected) return;
        
        const chatSub = new ROSLIB.Topic({ ros: ros, name: '/chat_output', messageType: 'std_msgs/String' });
        
        chatSub.subscribe((msg) => {
            let texto = msg.data;
            if (texto.includes("[CMD:")) {
                texto = texto.replace(/\[CMD:.*\]/, "").trim();
            }
            setHistory(prev => [...prev, { sender: 'bot', text: texto }]);
        });

        return () => chatSub.unsubscribe();
    }, [ros, isConnected]);

    const sendMessage = () => {
        if (inputVal.trim() === '' || !ros || !isConnected) return;
        
        const chatPub = new ROSLIB.Topic({ ros: ros, name: '/chat_input', messageType: 'std_msgs/String' });
        chatPub.publish(new ROSLIB.Message({ data: inputVal }));
        
        setHistory(prev => [...prev, { sender: 'user', text: inputVal }]);
        setInputVal('');
    };

    return (
        <aside className="sidebar" style={{ position: 'relative', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
            <div className="logo" style={{ textAlign: 'center', marginBottom: '10px' }}>StockBot</div>
            
            <nav className="main-nav" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <NavLink to="/teleoperacion" className={({isActive}) => isActive ? "nav-btn active" : "nav-btn"}>Panel de control</NavLink>
                <NavLink to="/operaciones" className={({isActive}) => isActive ? "nav-btn active" : "nav-btn"}>Operaciones</NavLink>
                <NavLink to="/notificaciones" className={({isActive}) => isActive ? "nav-btn active" : "nav-btn"}>Notificaciones</NavLink>
            </nav>

            <div className="sidebar-buttons" style={{ marginTop: '30px' }}>
                <h3 className="sidebar-title" style={{ paddingLeft: '15px', color: '#888', fontSize: '0.85em', textTransform: 'uppercase' }}>Mis Robots</h3>
                <nav className="robot-list" style={{ padding: '0 10px' }}>
                    <button className="robot-btn active" style={{ width: '100%', textAlign: 'left', padding: '10px 15px', borderRadius: '8px' }}>🟢 StockBot 4</button>
                    <button className="robot-btn" style={{ width: '100%', textAlign: 'left', padding: '10px 15px', borderRadius: '8px', opacity: 0.6 }}>🔴 BayonaBot</button>
                </nav>
            </div>
            
            {/* Chatbot Modernizado y Flotante */}
            <div style={{ position: 'absolute', bottom: '20px', left: '15px', right: '15px' }}>
                {chatOpen && (
                    <div style={{ 
                        position: 'absolute', 
                        bottom: '60px', /* Lo subimos para que flote por encima del botón */
                        left: '0', 
                        width: '340px', /* Ancho fijo para que no se aplaste con el menú */
                        background: 'white', 
                        borderRadius: '16px', 
                        padding: '15px', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)', 
                        border: '1px solid #e1e4e8', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        height: '450px', /* Más alto para ver el historial bien */
                        zIndex: 1000 
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px', marginBottom: '10px' }}>
                            <strong style={{ color: '#0a2540', fontSize: '1.1em' }}>✨ IA Asistente</strong>
                            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1.2em' }}>✖</button>
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>
                            {history.map((h, i) => (
                                <div key={i} style={{ 
                                    alignSelf: h.sender === 'bot' ? 'flex-start' : 'flex-end', 
                                    background: h.sender === 'bot' ? '#f1f3f5' : '#0d6efd', 
                                    color: h.sender === 'bot' ? '#333' : 'white', 
                                    padding: '10px 14px', 
                                    borderRadius: '16px', 
                                    borderBottomLeftRadius: h.sender === 'bot' ? '4px' : '16px',
                                    borderBottomRightRadius: h.sender === 'user' ? '4px' : '16px',
                                    maxWidth: '85%',
                                    fontSize: '0.95em',
                                    lineHeight: '1.4'
                                }}>
                                    {h.text}
                                </div>
                            ))}
                        </div>

                        <input 
                            type="text" 
                            value={inputVal} 
                            onChange={(e) => setInputVal(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Ej: Activa la patrulla..." 
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '12px', boxSizing: 'border-box', outline: 'none', fontSize: '0.95em' }}
                        />
                    </div>
                )}
                
                <button 
                    onClick={() => setChatOpen(!chatOpen)} 
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #0d6efd, #0056b3)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(13, 110, 253, 0.3)', transition: 'transform 0.2s' }}>
                    {chatOpen ? 'Cerrar Chat' : '✨ Hablar con IA'}
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;