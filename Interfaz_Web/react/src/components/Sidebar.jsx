import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useRos } from '../context/RosContext';

function Sidebar() {
    const { ros, isConnected } = useRos();
    const [chatOpen, setChatOpen] = useState(false);
    const [history, setHistory] = useState([{ sender: 'bot', text: '¡Hola! Soy el cerebro de tu almacén. ¿Qué necesitas?' }]);
    const [inputVal, setInputVal] = useState('');

    useEffect(() => {
        if (!ros || !isConnected) return;
        
        const chatSub = new ROSLIB.Topic({ ros: ros, name: '/chat_output', messageType: 'std_msgs/String' });
        
        chatSub.subscribe((msg) => {
            let texto = msg.data;
            // Parseo básico de comandos (la ejecución real de patrulla ahora está en Operaciones.jsx, 
            // pero el chatbot te avisará por texto de que lo ha activado).
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
        <aside className="sidebar">
            <div className="logo">StockBot</div>
            
            <nav className="main-nav" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <NavLink to="/teleoperacion" className={({isActive}) => isActive ? "nav-btn active" : "nav-btn"}>🎮 Teleoperación</NavLink>
                <NavLink to="/operaciones" className={({isActive}) => isActive ? "nav-btn active" : "nav-btn"}>⚙️ Operaciones</NavLink>
                <NavLink to="/notificaciones" className={({isActive}) => isActive ? "nav-btn active" : "nav-btn"}>📋 Notificaciones</NavLink>
            </nav>

            <div className="sidebar-buttons" style={{ marginTop: '40px' }}>
                <h3 className="sidebar-title">Mis Robots</h3>
                <nav className="robot-list">
                    <button className="robot-btn active">StockBot 4</button>
                    <button className="robot-btn">BayonaBot</button>
                </nav>
                
                {/* Chatbot */}
                <div className="div-ia" style={{ position: 'absolute', bottom: '20px', left: '20px', width: '210px' }}>
                    <button onClick={() => setChatOpen(!chatOpen)} className="btn-ia" style={{ width: '100%', padding: '10px' }}>🤖 Asistente IA</button>
                    
                    {chatOpen && (
                        <div className="chat-container" style={{ background: 'white', padding: '10px', borderRadius: '8px', marginTop: '10px', color: 'black' }}>
                            <div style={{ height: '150px', overflowY: 'auto', fontSize: '0.85em', marginBottom: '10px' }}>
                                {history.map((h, i) => (
                                    <p key={i} style={{ color: h.sender === 'bot' ? '#1976d2' : '#333' }}>
                                        <strong>{h.sender === 'bot' ? 'StockBot:' : 'Tú:'}</strong> {h.text}
                                    </p>
                                ))}
                            </div>
                            <input 
                                type="text" 
                                value={inputVal} 
                                onChange={(e) => setInputVal(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Escribe algo..." 
                                style={{ width: '100%', padding: '5px' }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;