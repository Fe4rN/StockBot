import { useRos } from './context/RosContext';

function PanelHeader() {
    const { isConnected, connectRos, disconnectRos, address, setAddress } = useRos();

    const handleConnect = (e) => {
        e.preventDefault();
        if (isConnected) {
            disconnectRos();
        } else {
            connectRos(address);
        }
    };

    return (
        <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', background: '#0a2540', color: 'white' }}>
            <div className="left-head">
                <form id="connection_container" onSubmit={handleConnect} style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        type="text" 
                        className="field-input" 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isConnected}
                        style={{ padding: '5px', borderRadius: '4px' }}
                    />
                    <button 
                        type="submit" 
                        style={{ backgroundColor: isConnected ? '#fb532b' : '#13a200', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>
                        {isConnected ? "✖ Desconectar" : "➜ Conectar"}
                    </button>
                </form>
            </div>
            <div className="right-head">
                <h2>StockBot Panel</h2>
            </div>
        </header>
    );
}

export default PanelHeader;