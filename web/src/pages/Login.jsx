import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Login.css';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('login');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [show2fa, setShow2fa] = useState(false);
  const [showOpt, setShowOpt] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Login
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [totp, setTotp] = useState('');

  // Registro
  const [rName, setRName] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPass, setRPass] = useState('');
  const [steamKey, setSteamKey] = useState('');
  const [steamId, setSteamId] = useState('');
  const [gemKey, setGemKey] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const data = await login(email, pass, totp);
    setBusy(false);
    if (!data) return setErr('Erro de conexão.');
    if (data.status === '2fa_required') {
      setShow2fa(true);
      setErr('Informe o código do seu app autenticador.');
      return;
    }
    if (data.status === 'success') navigate('/perfil');
    else setErr(data.message || 'Email ou senha incorretos.');
  }

  async function handleRegister(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const data = await register({
      name: rName,
      email: rEmail,
      password: rPass,
      steam_api_key: steamKey,
      steam_id: steamId,
      gemini_api_key: gemKey,
    });
    setBusy(false);
    if (!data) return setErr('Erro de conexão.');
    if (data.status === 'success') navigate('/perfil');
    else setErr(data.message || 'Não foi possível criar a conta.');
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/static/img/Game It Logo.svg" alt="Game It" />
          <div className="auth-logo-name">Game <span>It</span></div>
          <p className="auth-logo-sub">Sua biblioteca, conquistas e Agente Gamer num só lugar.</p>
        </div>

        <div className="auth-tabs">
          <button className={'auth-tab' + (tab === 'login' ? ' active' : '')}
                  onClick={() => { setTab('login'); setErr(''); }}>Log in</button>
          <button className={'auth-tab' + (tab === 'register' ? ' active' : '')}
                  onClick={() => { setTab('register'); setErr(''); }}>Sign Up</button>
        </div>

        {err && <div className="auth-err">{err}</div>}

        {tab === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="text" value={email}
                     onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
            <div className="auth-field">
              <label className="auth-label">Senha</label>
              <div className="auth-input-wrap">
                <input className="auth-input with-icon" type={showPass ? 'text' : 'password'}
                       value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
                <button type="button" className="auth-eye" onClick={() => setShowPass((s) => !s)}>
                  <i className={showPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
                </button>
              </div>
            </div>

            {show2fa && (
              <div className="auth-field">
                <label className="auth-label">Código 2FA</label>
                <input className="auth-input" type="text" inputMode="numeric" value={totp}
                       onChange={(e) => setTotp(e.target.value)} placeholder="000000" maxLength={6} />
              </div>
            )}

            <button className="auth-btn" type="submit" disabled={busy}>
              {busy ? 'Entrando...' : 'Log in'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="auth-field">
              <label className="auth-label">Nome</label>
              <input className="auth-input" type="text" value={rName}
                     onChange={(e) => setRName(e.target.value)} placeholder="John Doe" />
            </div>
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" value={rEmail}
                     onChange={(e) => setREmail(e.target.value)} placeholder="your@email.com" />
            </div>
            <div className="auth-field">
              <label className="auth-label">Senha</label>
              <div className="auth-input-wrap">
                <input className="auth-input with-icon" type={showPass ? 'text' : 'password'}
                       value={rPass} onChange={(e) => setRPass(e.target.value)}
                       placeholder="mínimo 6 caracteres" />
                <button type="button" className="auth-eye" onClick={() => setShowPass((s) => !s)}>
                  <i className={showPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
                </button>
              </div>
            </div>

            <div className="auth-opt">
              <div className="auth-opt-hdr" onClick={() => setShowOpt((s) => !s)}>
                <i className="fa-brands fa-steam" />
                <span className="auth-opt-title">Conectar Steam & Gemini (opcional)</span>
                <i className={'fa-solid fa-chevron-down' + (showOpt ? ' fa-rotate-180' : '')} />
              </div>
              {showOpt && (
                <div className="auth-opt-body">
                  <div className="auth-field">
                    <label className="auth-label">Steam API Key</label>
                    <input className="auth-input" type="text" value={steamKey}
                           onChange={(e) => setSteamKey(e.target.value)} placeholder="Sua Steam Web API Key" />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Steam ID</label>
                    <input className="auth-input" type="text" value={steamId}
                           onChange={(e) => setSteamId(e.target.value)} placeholder="SteamID64" />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Gemini API Key</label>
                    <input className="auth-input" type="text" value={gemKey}
                           onChange={(e) => setGemKey(e.target.value)} placeholder="Sua Gemini API Key" />
                  </div>
                </div>
              )}
            </div>

            <button className="auth-btn" type="submit" disabled={busy}>
              {busy ? 'Criando...' : 'Criar conta'}
            </button>
          </form>
        )}

        <p className="auth-bottom">
          {tab === 'login' ? (
            <>Não tem conta? <button onClick={() => setTab('register')}>Criar nova conta</button></>
          ) : (
            <>Já tem conta? <button onClick={() => setTab('login')}>Fazer login</button></>
          )}
        </p>
      </div>
    </div>
  );
}
