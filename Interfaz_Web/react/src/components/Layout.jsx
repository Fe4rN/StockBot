import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import PanelHeader from '../PanelHeader';

function Layout() {
    return (
        <div className="app" style={{ display: 'flex', height: '100vh' }}>
            <Sidebar />
            <main className="main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <PanelHeader />
                <div className="content" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                    {/* Aquí se inyectarán los diferentes dashboards */}
                    <Outlet /> 
                </div>
            </main>
        </div>
    );
}

export default Layout;