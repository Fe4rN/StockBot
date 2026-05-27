import { useRos } from './context/RosContext';
import { useNavigate } from 'react-router-dom';

function PanelHeader() {
    const { isConnected, connectRos, disconnectRos, address, setAddress, darkMode, setDarkMode, batteryLevel, setBatteryLevel } = useRos();
    const navigate = useNavigate();

    const handleConnect = (e) => {
        e.preventDefault();
        if (isConnected) {
            disconnectRos();
        } else {
            connectRos(address);
        }
    };

    // Helper para leer cookies
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    // Obtener información del usuario codificado en Base64
    const getUserName = () => {
        const cookieVal = getCookie("session_user");
        if (!cookieVal) return "Invitado";
        try {
            // Decodifica el JSON cifrado en Base64 que envía FastAPI
            const decoded = atob(cookieVal);
            const userObj = JSON.parse(decoded);
            return userObj.nombre || "Usuario";
        } catch (e) {
            return "Usuario";
        }
    };

    const handleLogout = () => {
        // Borramos la cookie seteando una expiración pasada
        document.cookie = "session_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        navigate("/login");
    };

    const isLowBattery = batteryLevel <= 20;

    return (
        <header className="topbar" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 24px',
            background: darkMode ? '#070b13' : '#0a2540',
            color: 'white',
            borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            transition: 'background 0.3s ease'
        }}>
            <style>{`
                @keyframes battery-pulse {
                     0% { opacity: 1; }
                     50% { opacity: 0.3; }
                     100% { opacity: 1; }
                }
                .blink-critical {
                     animation: battery-pulse 1.5s infinite;
                }
            `}</style>
            <div className="left-head">
                <form id="connection_container" onSubmit={handleConnect} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        className="field-input"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isConnected}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: darkMode ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #dce1e6',
                            background: darkMode ? '#152238' : 'white',
                            color: darkMode ? 'white' : 'black',
                            fontWeight: 'bold'
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            backgroundColor: isConnected ? '#fb532b' : '#13a200',
                            color: 'white',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                    >
                        {isConnected ? "✖ Desconectar" : "➜ Conectar"}
                    </button>
                </form>
            </div>
            <div className="right-head" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* BATERÍA: Ahora visible siempre para el operador */}
                <div
                    title={isConnected ? "Batería del robot" : "Batería del robot"}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255,255,255,0.08)',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: isLowBattery ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(74,222,128,0.3)',
                        boxShadow: '0 0 10px rgba(0,0,0,0.1)'
                    }}
                >
                    <span style={{ fontSize: '1.1em' }}>
                        {isLowBattery ? '🪫' : '🔋'}
                    </span>
                    <span style={{
                        fontSize: '0.9em',
                        fontWeight: '800',
                        color: isLowBattery ? '#ef4444' : '#4ade80',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {batteryLevel}%
                        <span style={{
                            fontSize: '0.75em',
                            color: '#94a3b8',
                            fontWeight: 'normal',
                            marginLeft: '4px'
                        }}>
                        </span>
                        {isLowBattery && <span className="blink-critical" style={{ fontSize: '0.85em', color: '#ef4444' }}>(CRÍTICA)</span>}
                    </span>
                    <button
                        onClick={() => setBatteryLevel(100)}
                        style={{
                            background: 'rgba(74, 222, 128, 0.15)',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            borderRadius: '4px',
                            color: '#4ade80',
                            cursor: 'pointer',
                            fontSize: '0.75em',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            marginLeft: '6px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(74, 222, 128, 0.3)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(74, 222, 128, 0.15)'}
                        title="Simular cambio de batería (Reset a 100%)"
                    >
                        🔄 Cambiar
                    </button>
                </div>

                <span style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    👤 {getUserName()}
                </span>
                <button
                    onClick={handleLogout}
                    style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.85em',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.25)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.15)'}
                >
                    Cerrar sesión
                </button>
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    style={{
                        background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)',
                        border: 'none',
                        borderRadius: '30px',
                        padding: '8px 16px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                    }}
                >
                    {darkMode ? "☀️ Modo Claro" : "🌙 Modo Oscuro"}
                </button>
                <h2 style={{ fontSize: '1.2em', fontWeight: '800', letterSpacing: '0.5px' }}>StockBot Panel</h2>
            </div>
        </header>
    );
}

export default PanelHeader;