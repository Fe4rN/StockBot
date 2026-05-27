import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './views/Home';
import Teleoperacion from './views/Teleoperacion';
import Operaciones from './views/Operaciones';
import Notificaciones from './views/Notificaciones';
import { RosProvider } from './context/RosContext';

function App() {
  return (
    <RosProvider>
      <Router>
        <Routes>
          {/* Landing page (sin sidebar) */}
          <Route path="/" element={<Home />} />

          {/* Panel con Layout (con barra lateral) */}
          <Route element={<Layout />}>
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