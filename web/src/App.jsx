import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import Progresso from './pages/Progresso.jsx';
import Game from './pages/Game.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-state" style={{ height: '100vh' }}>
        <div className="spinner" />
        <p className="loading-text">Carregando Game It...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/perfil" replace />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/usuario/:id" element={<PublicProfile />} />
        <Route path="/progresso" element={<Progresso />} />
        <Route path="/jogo/:appid" element={<Game />} />
        <Route path="/configuracoes" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/perfil" replace />} />
    </Routes>
  );
}
