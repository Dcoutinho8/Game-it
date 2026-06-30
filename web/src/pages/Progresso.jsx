import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import GuideModal from '../components/GuideModal.jsx';
import { api } from '../lib/api';
import { SearchInput } from '../components/ui/index.jsx';
import { renderMarkdown, escapeHtml, steamCover, steamHeader, DEFAULT_IMG } from '../lib/format';

export default function Progresso() {
  const [tab, setTab] = useState('chat');
  const [jogos, setJogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [erro, setErro] = useState('');
  const [trending, setTrending] = useState([]);
  const [profile, setProfile] = useState(null);
  const [guia, setGuia] = useState(null);
  const searchRef = useRef(null);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get('/api/steam-data');
    if (data && data.status === 'success') {
      setJogos(data.games || []);
      setLastSync(data.last_synced || null);
      setErro('');
    } else {
      setErro((data && data.message) || 'Não foi possível carregar a biblioteca da Steam.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregarDados();
    api.get('/api/trending').then(({ data }) => {
      if (data && data.status === 'success') setTrending(data.topics || []);
    });
    api.get('/api/profile').then(({ data }) => {
      if (data && data.status === 'success') setProfile(data.profile);
    });
  }, [carregarDados]);

  // Stats
  const total = jogos.length;
  const plat = jogos.filter((j) => j.status === '100%').length;
  const prog = jogos.filter((j) => j.status === 'Em Progresso').length;
  const none = jogos.filter((j) => j.status === 'Sem Conquistas').length;
  const platPct = total > 0 ? ((plat / total) * 100).toFixed(1) : '0';

  // Filtro + busca
  const jogosFiltrados = jogos.filter((j) => {
    if (filtro === '100' && j.status !== '100%') return false;
    if (filtro === 'progresso' && j.status !== 'Em Progresso') return false;
    if (busca && !j.name.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  function abrirGuia(jogo) {
    setGuia(jogo);
  }

  async function sync() {
    setSyncing(true);
    const { data } = await api.post('/api/steam-sync');
    if (data && data.status === 'error') {
      setErro(data.message || 'Falha ao sincronizar com a Steam.');
    } else {
      setErro('');
      await carregarDados();
    }
    setSyncing(false);
  }

  function syncLabel() {
    if (!lastSync) return '';
    const diff = Math.floor((Date.now() - new Date(lastSync).getTime()) / 60000);
    if (diff < 1) return 'Sincronizado agora';
    if (diff < 60) return `Sincronizado há ${diff} min`;
    const h = Math.floor(diff / 60);
    return `Sincronizado há ${h} ${h === 1 ? 'hora' : 'horas'}`;
  }

  return (
    <>
      <Navbar active="Progresso" showTheme onSearch={() => { setTab('biblioteca'); setTimeout(() => searchRef.current?.focus(), 60); }} />

      <div className="profile-layout cscroll">
        {/* ── LEFT ── */}
        <aside className="pcol-left">
          <ProfileCard profile={profile} total={total} plat={plat} />
        </aside>

        {/* ── CENTER ── */}
        <main className="pcol-center">
          <div className="profile-tabs">
            <button className={'ptab' + (tab === 'chat' ? ' active' : '')} onClick={() => setTab('chat')}>
              <i className="fa-solid fa-wand-magic-sparkles" /> Assistente IA
            </button>
            <button className={'ptab' + (tab === 'biblioteca' ? ' active' : '')} onClick={() => setTab('biblioteca')}>
              <i className="fa-solid fa-layer-group" /> Biblioteca
            </button>
            <button className={'ptab' + (tab === 'estatisticas' ? ' active' : '')} onClick={() => setTab('estatisticas')}>
              <i className="fa-solid fa-chart-simple" /> Estatísticas
            </button>
          </div>

          {tab === 'chat' && <ChatPanel />}

          {tab === 'biblioteca' && (
            <div className="ppanel" style={{ display: 'flex' }}>
              <section className="panel pcard">
                <div className="subheader" style={{ marginBottom: 16 }}>
                  <SearchInput ref={searchRef} value={busca} onChange={(e) => setBusca(e.target.value)}
                               onClear={() => setBusca('')} placeholder="Buscar jogo na biblioteca..." />
                  <p className="game-counter"><span className="counter-num">{total}</span> jogos</p>
                  <div className="sync-area">
                    <span className="last-sync-label">{syncLabel()}</span>
                    <button onClick={sync} className="btn-sync" disabled={syncing}>
                      <i className={'fa-solid fa-rotate' + (syncing ? ' fa-spin' : '')} />
                      <span>Sincronizar</span>
                    </button>
                  </div>
                </div>

                <div className="lib-filter-row">
                  <button onClick={() => setFiltro('todos')} className={'lib-chip' + (filtro === 'todos' ? ' active' : '')}>
                    <i className="fa-solid fa-gamepad" /> Todos <span className="lib-chip-count">{total}</span>
                  </button>
                  <button onClick={() => setFiltro('100')} className={'lib-chip' + (filtro === '100' ? ' active gold' : '')}>
                    <i className="fa-solid fa-trophy" style={{ color: '#fbbf24' }} /> Platinados <span className="lib-chip-count">{plat}</span>
                  </button>
                  <button onClick={() => setFiltro('progresso')} className={'lib-chip' + (filtro === 'progresso' ? ' active indigo' : '')}>
                    <i className="fa-solid fa-spinner" style={{ color: '#6366F1' }} /> Em Progresso <span className="lib-chip-count">{prog}</span>
                  </button>
                </div>

                <div className="grid-area">
                  {loading ? (
                    <div className="loading-state">
                      <div className="spinner" />
                      <p className="loading-text">Carregando biblioteca da Steam...</p>
                    </div>
                  ) : erro ? (
                    <div className="empty-panel" style={{ gridColumn: '1/-1' }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f87171' }} />
                      <p>{erro}</p>
                    </div>
                  ) : (
                    <div className="jogos-mini-grid">
                      {jogosFiltrados.length === 0 ? (
                        <div className="empty-panel" style={{ gridColumn: '1/-1' }}>
                          <i className="fa-solid fa-filter" />
                          <p>Nenhum jogo encontrado para este filtro.</p>
                        </div>
                      ) : (
                        jogosFiltrados.map((j) => <GameCard key={j.appid} jogo={j} onClick={() => abrirGuia(j)} />)
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {tab === 'estatisticas' && (
            <div className="ppanel" style={{ display: 'flex' }}>
              <section className="panel pcard">
                <h3 className="pcard-title">Resumo da Biblioteca</h3>
                <div className="stats-grid">
                  <div className="stat-box"><span className="stat-box-num">{total}</span><span className="stat-box-lbl">Total de Jogos</span></div>
                  <div className="stat-box"><span className="stat-box-num" style={{ color: '#fbbf24' }}>{plat}</span><span className="stat-box-lbl">Platinados</span></div>
                  <div className="stat-box"><span className="stat-box-num" style={{ color: '#6366F1' }}>{prog}</span><span className="stat-box-lbl">Em Progresso</span></div>
                  <div className="stat-box"><span className="stat-box-num">{none}</span><span className="stat-box-lbl">Sem Troféus</span></div>
                </div>
              </section>
              <section className="panel pcard">
                <h3 className="pcard-title">Taxa de Platina</h3>
                <div className="progress-track" style={{ marginBottom: 10, height: 12 }}>
                  <div className="progress-fill" style={{ width: platPct + '%' }} />
                </div>
                <p className="plat-pct" style={{ fontSize: 14 }}>{platPct}%</p>
              </section>
            </div>
          )}
        </main>

        {/* ── RIGHT ── */}
        <aside className="pcol-right">
          <section className="panel pcard">
            <h3 className="pcard-title">Trending Topics</h3>
            <div className="trend-list">
              {trending.length === 0 ? (
                <div className="empty-panel"><i className="fa-solid fa-hashtag" /><p>Nenhum trending ainda.</p></div>
              ) : (
                trending.map((t, i) => (
                  <div className="trend" key={i}>
                    <span className="trend-rank">#{i + 1}</span>
                    <div className="trend-meta">
                      <span className="trend-tag">{t.tag}</span>
                      <span className="trend-count">{t.count} {t.count === 1 ? 'menção' : 'menções'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      {guia && <GuideModal game={guia} onClose={() => setGuia(null)} />}
    </>
  );
}

function GameCard({ jogo, onClick }) {
  const is100 = jogo.status === '100%';
  const hasProg = jogo.status === 'Em Progresso';
  const badgeBg = is100 ? 'rgba(251,191,36,0.92)' : hasProg ? 'rgba(99,102,241,0.92)' : 'rgba(15,23,42,0.78)';
  const badgeTxt = is100 ? '#1f2937' : '#fff';
  const label = is100 ? '100%' : hasProg ? (jogo.pct || 0).toFixed(0) + '%' : 'Sem troféus';
  return (
    <div className="jogo-mini" title={jogo.name} onClick={onClick}>
      <span className="jogo-status-badge" style={{ background: badgeBg, color: badgeTxt }}>{label}</span>
      <img src={steamCover(jogo.appid)} alt={jogo.name}
           onError={(e) => { e.target.onerror = null; e.target.src = steamHeader(jogo.appid); e.target.style.aspectRatio = '16/9'; }} />
      <span className="jogo-mini-name">{jogo.name}</span>
    </div>
  );
}

function ProfileCard({ profile, total, plat }) {
  const p = profile || {};
  let nick = p.nickname || 'Jogador';
  if (nick[0] !== '@') nick = '@' + nick;
  const favs = p.favorites || [];
  return (
    <section className="panel pg-profile-card">
      <div className="pg-profile-banner" style={p.cover ? { backgroundImage: `url('${p.cover}')` } : undefined} />
      <div className="pg-profile-avatar">
        <img src={p.avatar || DEFAULT_IMG} alt="Avatar" onError={(e) => { e.target.src = DEFAULT_IMG; }} />
      </div>
      <div className="pg-profile-body">
        <h3 className="pg-profile-name">
          <span>{nick}</span><i className="fa-solid fa-circle-check verified sm" />
        </h3>
        <p className="pg-profile-bio">{p.bio || 'Sem bio ainda.'}</p>
        <p className="pg-profile-meta"><i className="fa-regular fa-calendar" /> {p.joined || 'Recentemente'}</p>
      </div>
      <div className="pg-profile-stats">
        <div className="pg-stat"><span className="pg-stat-num">{total}</span><span className="pg-stat-lbl">Jogos</span></div>
        <div className="pg-stat"><span className="pg-stat-num" style={{ color: '#fbbf24' }}>{plat}</span><span className="pg-stat-lbl">Platinados</span></div>
      </div>
      <div className="pg-fav">
        <p className="pg-fav-title">Jogos Favoritos</p>
        <div className="pg-fav-covers">
          {[0, 1, 2].map((i) => {
            const f = favs[i];
            return f ? (
              <Link key={i} to={`/jogo/${encodeURIComponent(f.appid)}`} className="pg-fav-cover" title={f.name}>
                <img src={f.cover || ''} alt="" onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMG; }} />
              </Link>
            ) : (
              <div key={i} className="pg-fav-cover empty"><i className="fa-solid fa-star" /></div>
            );
          })}
        </div>
      </div>
      <Link to="/perfil" className="pg-profile-link">Ver perfil completo <i className="fa-solid fa-arrow-right" /></Link>
    </section>
  );
}

function ChatPanel() {
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'E aí, gamer! 🎮 Sou seu **Agente Gamer**. Posso montar listas pra zerar, sugerir compras e dar dicas de platina. Manda ver!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  async function enviar(texto) {
    const msg = (texto ?? input).trim();
    if (!msg || loading) return;
    const novo = [...messages, { role: 'user', content: msg }];
    setMessages(novo);
    setInput('');
    setLoading(true);
    const history = novo.slice(-8).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
    const { data } = await api.post('/api/gemini-chat', { message: msg, history });
    setLoading(false);
    if (data && data.status === 'success') {
      setMessages((m) => [...m, { role: 'bot', content: data.reply }]);
    } else {
      setMessages((m) => [...m, { role: 'bot', content: (data && data.message) || 'Erro ao falar com a IA.', error: true }]);
    }
  }

  const sugestoes = [
    ['fa-flag-checkered', 'Lista para zerar', 'Monte uma lista de jogos para eu zerar com base no que eu já joguei.'],
    ['fa-cart-shopping', 'O que comprar', 'Sugira jogos para eu comprar com base nos meus gostos e avaliações.'],
    ['fa-dice', 'Jogar do backlog', 'O que devo jogar agora do meu backlog?'],
    ['fa-trophy', 'Dicas de platina', 'Me dê dicas para platinar meus jogos em progresso.'],
  ];

  return (
    <div className="ppanel" style={{ display: 'flex' }}>
      <section className="panel chat-panel">
        <div className="chat-header">
          <div className="chat-bot-av"><i className="fa-solid fa-robot" /></div>
          <div>
            <p className="chat-bot-name">Agente Gamer</p>
            <p className="chat-bot-status"><span className="online-dot" /> Online • powered by Gemini</p>
          </div>
        </div>

        <div className="chat-messages cscroll">
          {messages.map((m, i) => (
            <div key={i} className={'chat-msg' + (m.role === 'user' ? ' user' : '')}>
              <div className={'chat-msg-av ' + (m.role === 'user' ? 'user-av' : 'bot-av')}>
                <i className={'fa-solid ' + (m.role === 'user' ? 'fa-user' : 'fa-robot')} />
              </div>
              <div className={'chat-bubble' + (m.error ? ' chat-error' : '')}
                   dangerouslySetInnerHTML={{ __html: m.role === 'user' ? escapeHtml(m.content) : renderMarkdown(m.content) }} />
            </div>
          ))}
          {loading && (
            <div className="chat-msg">
              <div className="chat-msg-av bot-av"><i className="fa-solid fa-robot" /></div>
              <div className="chat-bubble"><div className="chat-typing"><span /><span /><span /></div></div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="chat-suggestions">
          {sugestoes.map(([ico, label, prompt]) => (
            <button key={label} className="chat-chip" onClick={() => enviar(prompt)}>
              <i className={'fa-solid ' + ico} /> {label}
            </button>
          ))}
        </div>

        <div className="chat-input-bar">
          <textarea className="chat-input" rows={1} value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                    placeholder="Pergunte ao seu Agente Gamer..." />
          <button className="chat-send" onClick={() => enviar()} disabled={loading} title="Enviar">
            <i className="fa-solid fa-paper-plane" />
          </button>
        </div>
      </section>
    </div>
  );
}
