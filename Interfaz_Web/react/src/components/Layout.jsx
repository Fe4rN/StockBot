import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PanelHeader from '../PanelHeader';

function Layout() {
    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f4f7f9' }}>
            <Sidebar />
            {/* Usamos un contenedor único libre de colisiones de nombres CSS antiguos */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
                <PanelHeader />
                <main style={{ padding: '30px', flex: 1, overflowY: 'auto', boxSizing: 'border-box', width: '100%' }}>
                    {/* Aquí se inyectarán los diferentes dashboards */}
                    <Outlet /> 
                </main>
            </div>
        </div>
    );
}

export default Layout;