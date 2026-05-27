import { useRos } from './context/RosContext';

function PanelHeader() {
    const { isConnected, connectRos, disconnectRos, address, setAddress, darkMode, setDarkMode } = useRos();

    const handleConnect = (e) => {
        e.preventDefault();
        if (isConnected) {
            disconnectRos();
        } else {
            connectRos(address);
        }
    };

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
                            border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #dce1e6',
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