import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useRos } from '../context/RosContext';

function Sidebar() {
    const { ros, isConnected, darkMode } = useRos();
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

    // Estilos de botones de navegación (inyecciones directas para evitar sobreescritura de CSS global)
    const getNavBtnStyle = (isActive) => ({
        background: isActive ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 100%)' : 'transparent',
        borderLeft: isActive ? '4px solid #3b82f6' : '4px solid transparent',
        color: isActive ? '#ffffff' : '#94a3b8',
        fontWeight: isActive ? '700' : '600',
        padding: '12px 20px',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderRadius: '0 8px 8px 0',
        fontSize: '15px',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
    });

    return (
        <aside className="sidebar" style={{ 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column', 
            zIndex: 50,
            width: '260px',
            minWidth: '260px',
            background: 'linear-gradient(180deg, #070b13 0%, #0f172a 100%)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '4px 0 25px rgba(0, 0, 0, 0.4)',
            padding: '24px 0'
        }}>
            {/* Logo Premium */}
            <div className="logo" style={{ 
                background: 'linear-gradient(135deg, #0052d4 0%, #4364f7 100%)',
                color: '#fff',
                fontSize: '22px',
                fontWeight: '900',
                padding: '14px 20px',
                borderRadius: '12px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                boxShadow: '0 4px 15px rgba(67, 100, 247, 0.3)',
                margin: '0 20px 30px',
                textAlign: 'center'
            }}>
                StockBot
            </div>
            
            {/* Menú de Navegación principal */}
            <nav className="main-nav" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <NavLink to="/teleoperacion" style={({isActive}) => getNavBtnStyle(isActive)}>
                    Panel de control
                </NavLink>
                <NavLink to="/operaciones" style={({isActive}) => getNavBtnStyle(isActive)}>
                    Operaciones
                </NavLink>
                <NavLink to="/notificaciones" style={({isActive}) => getNavBtnStyle(isActive)}>
                    Notificaciones
                </NavLink>
            </nav>

            {/* Selector de Robots */}
            <div style={{ marginTop: '35px', padding: '0 20px' }}>
                <h3 style={{ 
                    fontSize: '11px', 
                    fontWeight: '700', 
                    color: '#64748b', 
                    textTransform: 'uppercase', 
                    letterSpacing: '1.5px', 
                    marginBottom: '12px',
                    paddingLeft: '4px'
                }}>
                    Mis Robots
                </h3>
                <nav className="robot-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: 0 }}>
                    <button style={{ 
                        width: '100%', 
                        textAlign: 'left', 
                        padding: '12px 16px', 
                        borderRadius: '10px', 
                        background: 'linear-gradient(135deg, #0d6efd 0%, #0056b3 100%)',
                        color: '#fff',
                        border: 'none',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(13, 110, 253, 0.25)',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', marginRight: '8px' }}></span>
                        StockBot 4
                    </button>
                    <button style={{ 
                        width: '100%', 
                        textAlign: 'left', 
                        padding: '12px 16px', 
                        borderRadius: '10px', 
                        background: 'rgba(255, 255, 255, 0.03)',
                        color: '#94a3b8',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        opacity: 0.5,
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', marginRight: '8px' }}></span>
                        BayonaBot
                    </button>
                </nav>
            </div>
            
            {/* Chatbot Modernizado y Flotante */}
            <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px' }}>
                {chatOpen && (
                    <div style={{ 
                        position: 'absolute', 
                        bottom: '60px', 
                        left: '0', 
                        width: '320px', 
                        background: darkMode ? '#0f172a' : 'white', 
                        borderRadius: '16px', 
                        padding: '15px', 
                        boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.15)', 
                        border: darkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e1e4e8', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        height: '420px', 
                        zIndex: 1000,
                        color: darkMode ? '#f8fafc' : '#0a2540'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #f0f0f0', 
                            paddingBottom: '10px', 
                            marginBottom: '10px' 
                        }}>
                            <strong style={{ color: darkMode ? '#fff' : '#0a2540', fontSize: '1.1em' }}>Asistente IA</strong>
                            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1.2em' }}>✖</button>
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>
                            {history.map((h, i) => (
                                <div key={i} style={{ 
                                    alignSelf: h.sender === 'bot' ? 'flex-start' : 'flex-end', 
                                    background: h.sender === 'bot' ? (darkMode ? 'rgba(255, 255, 255, 0.05)' : '#f1f3f5') : '#0d6efd', 
                                    color: h.sender === 'bot' ? (darkMode ? '#cbd5e1' : '#333') : 'white', 
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

                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', width: '100%' }}>
                            <input 
                                type="text" 
                                value={inputVal} 
                                onChange={(e) => setInputVal(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Ej: Activa la patrulla..." 
                                style={{ 
                                    flex: 1, 
                                    padding: '12px', 
                                    borderRadius: '8px', 
                                    border: darkMode ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #ddd', 
                                    background: darkMode ? 'rgba(255, 255, 255, 0.03)' : '#fff',
                                    color: darkMode ? '#fff' : '#111',
                                    boxSizing: 'border-box', 
                                    outline: 'none', 
                                    fontSize: '0.95em', 
                                    minWidth: 0 
                                }}
                            />
                            <button 
                                onClick={sendMessage}
                                style={{ background: '#0d6efd', color: 'white', border: 'none', borderRadius: '8px', padding: '0 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9em', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.target.style.background = '#0056b3'}
                                onMouseLeave={(e) => e.target.style.background = '#0d6efd'}
                            >
                                Enviar
                            </button>
                        </div>
                    </div>
                )}
                
                <button 
                    onClick={() => setChatOpen(!chatOpen)} 
                    style={{ 
                        width: '100%', 
                        padding: '12px', 
                        borderRadius: '12px', 
                        background: 'linear-gradient(135deg, #0d6efd, #0056b3)', 
                        color: 'white', 
                        border: 'none', 
                        cursor: 'pointer', 
                        fontWeight: 'bold', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px', 
                        boxShadow: '0 4px 15px rgba(13, 110, 253, 0.3)', 
                        transition: 'transform 0.2s' 
                    }}>
                    Hablar con IA
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
