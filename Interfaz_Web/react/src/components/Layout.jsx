import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import PanelHeader from '../PanelHeader';
import { useRos } from '../context/RosContext';

function Layout() {
    const { darkMode } = useRos();
    const navigate = useNavigate();

    // Helper para leer cookies
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    };

    useEffect(() => {
        const sessionUser = getCookie("session_user");
        if (!sessionUser) {
            navigate("/login");
        }
    }, [navigate]);

    return (
        <div style={{ 
            display: 'flex', 
            height: '100vh', 
            width: '100vw', 
            overflow: 'hidden', 
            background: darkMode ? '#090e1a' : '#f4f7f9',
            transition: 'background 0.3s ease'
        }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
                <PanelHeader />
                <main style={{ padding: '30px', flex: 1, overflowY: 'auto', boxSizing: 'border-box', width: '100%' }}>
                    <Outlet /> 
                </main>
            </div>
        </div>
    );
}

export default Layout;