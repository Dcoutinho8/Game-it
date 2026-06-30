import { useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Settings() {
  const { user, refresh } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [msg, setMsg] = useState(null); // {type, text}

  function flash(type, text) { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000); }

  return (
    <>
      <Navbar active="" showTheme />

      <main className="settings-page cscroll">
        <h1 className="settings-title">Configurações</h1>

        {msg && <div className={'settings-alert ' + msg.type}>{msg.text}</div>}

        <ContaSection user={user} onSaved={() => { flash('success', 'Perfil atualizado!'); refresh(); }} onError={(m) => flash('error', m)} />
        <IntegracoesSection user={user} onSaved={() => { flash('success', 'Integrações salvas!'); refresh(); }} onError={(m) => flash('error', m)} />
        <SenhaSection onSaved={() => flash('success', 'Senha alterada!')} onError={(m) => flash('error', m)} />
        <TwoFactorSection user={user} onChanged={() => refresh()} flash={flash} />

        <section className="panel pcard settings-card">
          <h3 className="pcard-title">Aparência</h3>
          <div className="settings-row">
            <span>Tema {theme === 'light' ? 'claro' : 'escuro'}</span>
            <button className="btn-sync" onClick={toggleTheme}>
              <i className={'fa-solid ' + (theme === 'light' ? 'fa-moon' : 'fa-sun')} /> Alternar
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

function ContaSection({ user, onSaved, onError }) {
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  async function salvar() {
    setSaving(true);
    const { data } = await api.put('/api/auth/profile', { name });
    setSaving(false);
    if (data?.status === 'success') onSaved(); else onError(data?.message || 'Erro');
  }
  return (
    <section className="panel pcard settings-card">
      <h3 className="pcard-title">Conta</h3>
      <label className="g-label">E-mail</label>
      <input className="g-input" value={user?.email || ''} disabled />
      <label className="g-label">Nome</label>
      <input className="g-input" value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn-post" onClick={salvar} disabled={saving} style={{ marginTop: 14 }}>Salvar</button>
    </section>
  );
}

function IntegracoesSection({ user, onSaved, onError }) {
  const [steamKey, setSteamKey] = useState('');
  const [steamId, setSteamId] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [saving, setSaving] = useState(false);
  async function salvar() {
    const payload = {};
    if (steamKey) payload.steam_api_key = steamKey;
    if (steamId) payload.steam_id = steamId;
    if (geminiKey) payload.gemini_api_key = geminiKey;
    if (Object.keys(payload).length === 0) { onError('Preencha algo para salvar.'); return; }
    setSaving(true);
    const { data } = await api.put('/api/auth/profile', payload);
    setSaving(false);
    if (data?.status === 'success') { setSteamKey(''); setSteamId(''); setGeminiKey(''); onSaved(); }
    else onError(data?.message || 'Erro');
  }
  return (
    <section className="panel pcard settings-card">
      <h3 className="pcard-title">Integrações</h3>
      <p className="settings-hint">
        Steam: {user?.has_steam ? <span className="badge-ok">conectada</span> : <span className="badge-off">não conectada</span>} •
        Gemini: {user?.has_gemini ? <span className="badge-ok">configurada</span> : <span className="badge-off">não configurada</span>}
      </p>
      <label className="g-label">Steam API Key</label>
      <input className="g-input" value={steamKey} onChange={(e) => setSteamKey(e.target.value)} placeholder="Deixe vazio para manter" />
      <label className="g-label">Steam ID (64 bits)</label>
      <input className="g-input" value={steamId} onChange={(e) => setSteamId(e.target.value)} placeholder="Deixe vazio para manter" />
      <label className="g-label">Gemini API Key</label>
      <input className="g-input" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder="Deixe vazio para manter" />
      <button className="btn-post" onClick={salvar} disabled={saving} style={{ marginTop: 14 }}>Salvar integrações</button>
    </section>
  );
}

function SenhaSection({ onSaved, onError }) {
  const [cur, setCur] = useState('');
  const [nova, setNova] = useState('');
  const [saving, setSaving] = useState(false);
  async function salvar() {
    if (nova.length < 6) { onError('Nova senha precisa de 6+ caracteres.'); return; }
    setSaving(true);
    const { data } = await api.put('/api/auth/password', { current_password: cur, new_password: nova });
    setSaving(false);
    if (data?.status === 'success') { setCur(''); setNova(''); onSaved(); } else onError(data?.message || 'Erro');
  }
  return (
    <section className="panel pcard settings-card">
      <h3 className="pcard-title">Senha</h3>
      <label className="g-label">Senha atual</label>
      <input className="g-input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
      <label className="g-label">Nova senha</label>
      <input className="g-input" type="password" value={nova} onChange={(e) => setNova(e.target.value)} />
      <button className="btn-post" onClick={salvar} disabled={saving} style={{ marginTop: 14 }}>Alterar senha</button>
    </section>
  );
}

function TwoFactorSection({ user, onChanged, flash }) {
  const enabled = user?.two_factor_enabled;
  const [setup, setSetup] = useState(null); // {qr, secret}
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function iniciar() {
    setBusy(true);
    const { data } = await api.post('/api/auth/2fa/setup');
    setBusy(false);
    if (data?.status === 'success') setSetup({ qr: data.qr, secret: data.secret });
    else flash('error', data?.message || 'Erro');
  }
  async function confirmar() {
    setBusy(true);
    const { data } = await api.post('/api/auth/2fa/confirm', { code });
    setBusy(false);
    if (data?.status === 'success') { setSetup(null); setCode(''); flash('success', '2FA ativado!'); onChanged(); }
    else flash('error', data?.message || 'Código inválido');
  }
  async function desativar() {
    setBusy(true);
    const { data } = await api.post('/api/auth/2fa/disable', { code });
    setBusy(false);
    if (data?.status === 'success') { setCode(''); flash('success', '2FA desativado!'); onChanged(); }
    else flash('error', data?.message || 'Código inválido');
  }

  return (
    <section className="panel pcard settings-card">
      <h3 className="pcard-title">Autenticação em 2 fatores (2FA)</h3>
      {enabled ? (
        <>
          <p className="settings-hint"><span className="badge-ok">Ativado</span> — informe um código do app autenticador para desativar.</p>
          <input className="g-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de 6 dígitos" maxLength={6} />
          <button className="btn-danger" onClick={desativar} disabled={busy} style={{ marginTop: 14 }}>Desativar 2FA</button>
        </>
      ) : setup ? (
        <>
          <p className="settings-hint">Escaneie o QR code no Google Authenticator e digite o código gerado.</p>
          <img src={setup.qr} alt="QR Code 2FA" style={{ width: 180, height: 180, borderRadius: 12, margin: '10px 0' }} />
          <p className="settings-hint">Chave manual: <code>{setup.secret}</code></p>
          <input className="g-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de 6 dígitos" maxLength={6} />
          <button className="btn-post" onClick={confirmar} disabled={busy} style={{ marginTop: 14 }}>Confirmar e ativar</button>
        </>
      ) : (
        <>
          <p className="settings-hint"><span className="badge-off">Desativado</span> — proteja sua conta com um segundo fator.</p>
          <button className="btn-post" onClick={iniciar} disabled={busy} style={{ marginTop: 14 }}>Ativar 2FA</button>
        </>
      )}
    </section>
  );
}
