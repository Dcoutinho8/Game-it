import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

// Navbar compartilhada por todas as páginas autenticadas.
// `showTheme` exibe o botão de tema (usado no Progresso, como no app original).
export default function Navbar({ active, showTheme = false, onSearch }) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();

  const pill = (label, to) => (
    <Link
      to={to}
      className={'nav-pill' + (active === label ? ' active' : '')}
      style={{ textDecoration: 'none' }}
    >
      {label}
    </Link>
  );

  return (
    <nav className="g-nav" id="top-nav">
      <div className="nav-logo">
        <img src="/static/img/Game It Logo.svg" width="32" height="32" alt="Game It Logo" />
        <span className="nav-title">Game <span style={{ color: '#6366F1' }}>It</span></span>
      </div>

      <div className="nav-pills">
        <Link to="/perfil" className="nav-pill" style={{ textDecoration: 'none' }}>Home</Link>
        <span className="nav-pill">Review</span>
        {pill('Perfil', '/perfil')}
        {pill('Progresso', '/progresso')}
        {pill('Descobrir', '/descobrir')}
      </div>

      <div className="nav-actions">
        <button className="btn-search" onClick={() => onSearch && onSearch()}>
          <i className="fa-solid fa-magnifying-glass" /> Pesquisar
        </button>

        {showTheme && (
          <button className="theme-btn" onClick={toggleTheme} title="Alternar tema">
            <i className={theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} />
          </button>
        )}

        <Link
          to="/configuracoes"
          className="theme-btn"
          title="Configurações"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <i className="fa-solid fa-gear" />
        </Link>

        <button
          onClick={logout}
          title="Sair"
          style={{
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
            borderRadius: 10, padding: '7px 13px', color: '#f87171', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
          }}
        >
          <i className="fa-solid fa-arrow-right-from-bracket" />
        </button>
      </div>
    </nav>
  );
}
