import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Teleoperacion from './views/Teleoperacion';
import Operaciones from './views/Operaciones';
import Notificaciones from './views/Notificaciones';
import { RosProvider } from './context/RosContext';

function App() {
  return (
    <RosProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/teleoperacion" replace />} />
            <Route path="teleoperacion" element={<Teleoperacion />} />
            <Route path="operaciones" element={<Operaciones />} />
            <Route path="notificaciones" element={<Notificaciones />} />
          </Route>
        </Routes>
      </Router>
    </RosProvider>
  );
}

export default App;