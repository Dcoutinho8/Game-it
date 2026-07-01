import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { steamCover, steamHeader, DEFAULT_IMG } from '../../lib/format';
import { Dialog, Button, Input, Label, SearchInput } from '../ui/index.jsx';

/* Formata números grandes: 11720 -> 11.720 */
function fmtNum(n) {
  return (Number(n) || 0).toLocaleString('pt-BR');
}

/* ═══════════════════════════════════════════════════════
   CARROSSEL DE PLATAFORMAS CONECTADAS
═══════════════════════════════════════════════════════ */
export function PlatformCarousel() {
  const [data, setData] = useState(null);
  const [connect, setConnect] = useState(null); // plataforma sendo conectada

  const carregar = useCallback(() => {
    api.get('/api/profile/platforms-summary').then(({ data }) => {
      if (data?.status === 'success') setData(data);
    });
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  if (!data) {
    return (
      <section className="panel pcard hub-block">
        <div className="hub-head"><h3 className="pcard-title">Contas Conectadas</h3></div>
        <div className="hub-skeleton-row">{[0, 1, 2].map((i) => <div key={i} className="hub-skeleton-card" />)}</div>
      </section>
    );
  }

  const { platforms, aggregated } = data;
  const conectadas = platforms.filter((p) => p.connected).length;

  const METRIC_LABELS = {
    games: 'Jogos', achievements: 'Conquistas', platinums: 'Platinas',
    hours: 'Horas', trophies: 'Troféus', gamerscore: 'Gamerscore', wins: 'Vitórias',
  };
  function metricValue(p, m) {
    if (m === 'hours') return `${fmtNum(p.total_hours)}h`;
    if (m === 'games') return fmtNum(p.total_games);
    if (m === 'platinums') return fmtNum(p.total_platinums);
    return fmtNum(p.total_achievements);
  }

  return (
    <section className="panel pcard hub-block">
      <div className="hub-head">
        <h3 className="pcard-title">Contas Conectadas</h3>
        <span className="hub-sub">{conectadas} de {platforms.length} conectadas</span>
      </div>

      {/* Banner agregado */}
      <div className="plat-agg">
        <div className="plat-agg-icon"><i className="fa-solid fa-bolt" /></div>
        <div className="plat-agg-metrics">
          <div><b>{fmtNum(aggregated.total_games)}</b><span>Total Jogos</span></div>
          <div><b>{fmtNum(aggregated.total_achievements)}</b><span>Conquistas</span></div>
          <div><b>{fmtNum(aggregated.total_platinums)}</b><span>Platinas</span></div>
          <div><b>{fmtNum(aggregated.total_hours)}h</b><span>Horas Totais</span></div>
        </div>
        <div className="plat-agg-label">Todas as<br />plataformas</div>
      </div>

      {/* Carrossel */}
      <div className="plat-carousel cscroll-x">
        {platforms.map((p) => (
          <div key={p.id}
               className={'plat-card' + (p.connected ? ' connected' : ' empty')}
               style={p.connected ? { '--brand': p.brand_color } : undefined}>
            <div className="plat-card-head">
              <span className="plat-logo" style={{ color: p.connected ? p.brand_color : undefined }}>
                <i className={p.icon} />
              </span>
              <div className="plat-id">
                <span className="plat-name">{p.label}</span>
                <span className="plat-user">{p.connected ? (p.username || '—') : 'Conta não conectada'}</span>
              </div>
              {p.connected && p.id !== 'steam' && (
                <button className="plat-remove" title="Desconectar"
                        onClick={() => { api.del(`/api/disconnect/${p.id}`).then(carregar); }}>
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>

            {p.connected ? (
              <>
                <div className="plat-metrics">
                  {p.metrics.map((m) => (
                    <div key={m} className="plat-metric">
                      <b>{metricValue(p, m)}</b>
                      <span>{METRIC_LABELS[m] || m}</span>
                    </div>
                  ))}
                </div>
                {p.favorite_game && (
                  <div className="plat-fav">
                    <img src={p.favorite_cover || (p.id === 'steam' ? steamHeader(0) : DEFAULT_IMG)} alt=""
                         onError={(e) => { e.target.src = DEFAULT_IMG; }} />
                    <div><span className="plat-fav-lbl">Jogo favorito</span><span className="plat-fav-name">{p.favorite_game}</span></div>
                  </div>
                )}
              </>
            ) : (
              <div className="plat-connect-area">
                <p className="plat-connect-hint">
                  {p.id === 'steam' ? 'Configure a Steam nas Configurações.' : 'Conecte manualmente sua conta.'}
                </p>
                {p.id === 'steam' ? (
                  <Link to="/configuracoes" className="ui-btn ui-btn--outline ui-btn--sm">Configurar Steam</Link>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setConnect(p)}>
                    <i className="fa-solid fa-plus" /> Conectar {p.label}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {connect && (
        <ConnectPlatformModal platform={connect} onClose={() => setConnect(null)}
                              onSaved={() => { setConnect(null); carregar(); }} />
      )}
    </section>
  );
}

function ConnectPlatformModal({ platform, onClose, onSaved }) {
  const [form, setForm] = useState({
    username: '', total_games: '', total_achievements: '', total_platinums: '',
    total_hours: '', favorite_game: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function salvar() {
    if (!form.username.trim()) return;
    setSaving(true);
    const { data } = await api.post(`/api/connect/${platform.id}`, form);
    setSaving(false);
    if (data?.status === 'success') onSaved(); else alert(data?.message || 'Erro');
  }

  return (
    <Dialog title={`Conectar ${platform.label}`}
            description="Sem API pública, informe seus dados manualmente. Você pode atualizar quando quiser."
            size="md" onClose={onClose}
            footer={<>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={salvar} disabled={saving || !form.username.trim()}>Conectar</Button>
            </>}>
      <Label>Usuário / Gamertag</Label>
      <Input value={form.username} onChange={set('username')} placeholder={`Seu ID na ${platform.label}`} />
      <div className="form-row-2">
        <div><Label>Jogos</Label><Input type="number" min="0" value={form.total_games} onChange={set('total_games')} /></div>
        <div><Label>Horas</Label><Input type="number" min="0" value={form.total_hours} onChange={set('total_hours')} /></div>
      </div>
      <div className="form-row-2">
        <div><Label>Conquistas</Label><Input type="number" min="0" value={form.total_achievements} onChange={set('total_achievements')} /></div>
        <div><Label>Platinas</Label><Input type="number" min="0" value={form.total_platinums} onChange={set('total_platinums')} /></div>
      </div>
      <Label>Jogo favorito</Label>
      <Input value={form.favorite_game} onChange={set('favorite_game')} placeholder="Nome do jogo favorito" />
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   PROGRESSO DE PLATINA
═══════════════════════════════════════════════════════ */
export function PlatinumProgress() {
  const [games, setGames] = useState(null);
  useEffect(() => {
    api.get('/api/profile/platinum-progress').then(({ data }) => {
      if (data?.status === 'success') setGames(data.games || []);
    });
  }, []);

  if (!games) return null;
  if (games.length === 0) return null;

  return (
    <section className="panel pcard hub-block">
      <div className="hub-head"><h3 className="pcard-title"><i className="fa-solid fa-trophy" style={{ color: '#fbbf24' }} /> Perto de Platinar</h3></div>
      <div className="plat-prog-carousel cscroll-x">
        {games.map((g) => (
          <Link to={`/jogo/${encodeURIComponent(g.appid)}`} key={g.appid} className="plat-prog-card">
            <img className="plat-prog-cover" src={g.cover} alt={g.name}
                 onError={(e) => { e.target.onerror = null; e.target.src = steamHeader(g.appid); }} />
            <div className="plat-prog-body">
              <div className="plat-prog-top">
                <span className="plat-prog-name">{g.name}</span>
                <span className="plat-prog-plat" title="Steam"><i className="fa-brands fa-steam" style={{ color: '#66c0f4' }} /></span>
              </div>
              <div className="plat-prog-bar"><div className="plat-prog-fill" style={{ width: g.pct + '%' }} /></div>
              <span className="plat-prog-pct">{g.pct}% concluído</span>
              {g.remaining_count > 0 && (
                <span className="plat-prog-rem">
                  Faltam {g.remaining_count}{g.remaining.length ? ': ' + g.remaining.join(', ') : ''}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   TIMELINE DE ATIVIDADE (estilo GitHub)
═══════════════════════════════════════════════════════ */
export function ActivityTimeline() {
  const [data, setData] = useState(null);
  const [tip, setTip] = useState(null);
  useEffect(() => {
    api.get('/api/profile/activity').then(({ data }) => {
      if (data?.status === 'success') setData(data);
    });
  }, []);

  if (!data) return null;

  // Agrupa dias em semanas (colunas). Cada coluna = 7 dias.
  const days = data.days;
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const max = Math.max(1, ...days.map((d) => d.count));
  function level(c) {
    if (c <= 0) return 0;
    const r = c / max;
    if (r > 0.66) return 4;
    if (r > 0.4) return 3;
    if (r > 0.15) return 2;
    return 1;
  }
  function fmtDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  return (
    <section className="panel pcard hub-block">
      <div className="hub-head">
        <h3 className="pcard-title">Atividade</h3>
        <span className="hub-sub">{data.active_days} dias ativos · Sequência atual: {data.current_streak} dias</span>
      </div>
      <div className="act-graph-wrap cscroll-x">
        <div className="act-graph">
          {weeks.map((w, wi) => (
            <div className="act-col" key={wi}>
              {w.map((d) => (
                <div key={d.date} className={'act-cell lvl-' + level(d.count)}
                     onMouseEnter={() => setTip({ date: d.date, count: d.count })}
                     onMouseLeave={() => setTip(null)} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="act-legend">
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map((l) => <span key={l} className={'act-cell lvl-' + l} />)}
        <span>Mais</span>
        {tip && <span className="act-tip">{fmtDate(tip.date)} · {tip.count} {tip.count === 1 ? 'atividade' : 'atividades'}</span>}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   COMPARAR COM AMIGO
═══════════════════════════════════════════════════════ */
const PIN_KEY = 'gameit:compare-pin';

export function CompareModal({ onClose, onPinned }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setUsers([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/users/search?q=${encodeURIComponent(q.trim())}`).then(({ data }) => {
        if (data?.status === 'success') setUsers(data.users || []);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function comparar(u) {
    setLoading(true);
    const { data } = await api.get(`/api/profile/compare/${u.id}`);
    setLoading(false);
    if (data?.status === 'success') { setResult(data); setUsers([]); setQ(''); }
    else alert(data?.message || 'Erro');
  }

  function fixar() {
    localStorage.setItem(PIN_KEY, JSON.stringify(result));
    onPinned && onPinned(result);
    onClose();
  }

  const METRICS = [
    { k: 'games', label: 'Jogos', icon: 'fa-gamepad' },
    { k: 'hours', label: 'Horas', icon: 'fa-clock', suffix: 'h' },
    { k: 'achievements', label: 'Conquistas', icon: 'fa-medal' },
    { k: 'platinums', label: 'Platinas', icon: 'fa-trophy' },
  ];

  return (
    <Dialog title="Comparar com amigo" size="lg" onClose={onClose}
            footer={result ? <>
              <Button variant="ghost" onClick={() => setResult(null)}>Voltar</Button>
              <Button onClick={fixar}><i className="fa-solid fa-thumbtack" /> Fixar no perfil</Button>
            </> : <Button variant="ghost" onClick={onClose}>Fechar</Button>}>
      {!result ? (
        <>
          <Label>Buscar usuário</Label>
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')}
                       placeholder="Digite o nome de um jogador..." />
          <div className="cmp-search-list">
            {users.map((u) => (
              <button key={u.id} className="cmp-search-item" onClick={() => comparar(u)} disabled={loading}>
                <img src={u.avatar} alt="" onError={(e) => { e.target.src = DEFAULT_IMG; }} />
                <span>{u.nickname}</span>
                <i className="fa-solid fa-arrow-right" />
              </button>
            ))}
            {q.trim().length >= 2 && users.length === 0 && <p className="empty-msg">Nenhum jogador encontrado.</p>}
          </div>
        </>
      ) : (
        <CompareResult result={result} metrics={METRICS} />
      )}
    </Dialog>
  );
}

function CompareResult({ result, metrics }) {
  const { me, other, common_games } = result;
  return (
    <div className="cmp-result">
      <div className="cmp-heads">
        <div className="cmp-head"><img src={me.avatar} alt="" onError={(e) => { e.target.src = DEFAULT_IMG; }} /><span>{me.name}</span></div>
        <span className="cmp-vs">VS</span>
        <div className="cmp-head"><img src={other.avatar} alt="" onError={(e) => { e.target.src = DEFAULT_IMG; }} /><span>{other.name}</span></div>
      </div>
      {metrics.map((m) => {
        const a = me.stats[m.k] || 0, b = other.stats[m.k] || 0;
        const tot = a + b || 1;
        const aw = (a / tot) * 100, bw = (b / tot) * 100;
        return (
          <div className="cmp-row" key={m.k}>
            <span className={'cmp-val' + (a >= b ? ' win' : '')}>{a >= b && <i className="fa-solid fa-crown" />} {a.toLocaleString('pt-BR')}{m.suffix || ''}</span>
            <div className="cmp-bars">
              <div className="cmp-bar-label"><i className={'fa-solid ' + m.icon} /> {m.label}</div>
              <div className="cmp-bar-track">
                <div className="cmp-bar me" style={{ width: aw + '%' }} />
                <div className="cmp-bar other" style={{ width: bw + '%' }} />
              </div>
            </div>
            <span className={'cmp-val' + (b >= a ? ' win' : '')}>{b >= a && <i className="fa-solid fa-crown" />} {b.toLocaleString('pt-BR')}{m.suffix || ''}</span>
          </div>
        );
      })}
      {common_games.length > 0 && (
        <>
          <p className="cmp-common-title">Jogos em comum ({common_games.length})</p>
          <div className="cmp-common">
            {common_games.map((g) => (
              <Link to={`/jogo/${encodeURIComponent(g.appid)}`} key={g.appid} title={g.name}>
                <img src={g.cover} alt="" onError={(e) => { e.target.onerror = null; e.target.src = steamHeader(g.appid); }} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function CompareWidget({ pinned, onClear }) {
  if (!pinned) return null;
  const { me, other } = pinned;
  const rows = [
    { k: 'games', label: 'Jogos' },
    { k: 'hours', label: 'Horas' },
    { k: 'achievements', label: 'Conquistas' },
    { k: 'platinums', label: 'Platinas' },
  ];
  return (
    <section className="panel pcard">
      <div className="hub-head">
        <h3 className="pcard-title">Comparação</h3>
        <button className="plat-remove" onClick={onClear} title="Remover"><i className="fa-solid fa-xmark" /></button>
      </div>
      <div className="cmp-widget-heads">
        <span>{me.name}</span><span className="cmp-vs-sm">vs</span><span>{other.name}</span>
      </div>
      {rows.map((r) => {
        const a = me.stats[r.k] || 0, b = other.stats[r.k] || 0;
        return (
          <div className="cmp-widget-row" key={r.k}>
            <b className={a >= b ? 'win' : ''}>{a.toLocaleString('pt-BR')}</b>
            <span>{r.label}</span>
            <b className={b >= a ? 'win' : ''}>{b.toLocaleString('pt-BR')}</b>
          </div>
        );
      })}
    </section>
  );
}

export function readPinnedCompare() {
  try { return JSON.parse(localStorage.getItem(PIN_KEY) || 'null'); } catch { return null; }
}
export function clearPinnedCompare() { localStorage.removeItem(PIN_KEY); }

/* ═══════════════════════════════════════════════════════
   PERSONAGENS FAVORITOS
═══════════════════════════════════════════════════════ */
export function FavoriteCharacters() {
  const [chars, setChars] = useState([]);
  const [editing, setEditing] = useState(false);
  const carregar = useCallback(() => {
    api.get('/api/profile/characters').then(({ data }) => {
      if (data?.status === 'success') setChars(data.characters || []);
    });
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <section className="panel pcard">
      <div className="hub-head">
        <h3 className="pcard-title">Personagens Favoritos</h3>
        <button className="btn-edit-fav" onClick={() => setEditing(true)} title="Editar"><i className="fa-solid fa-pen" /></button>
      </div>
      {chars.length === 0 ? (
        <p className="empty-msg">Adicione seus personagens favoritos.</p>
      ) : (
        <div className="char-grid">
          {chars.map((c, i) => (
            <div className="char-card" key={i}>
              <span className="char-mask"><i className="fa-solid fa-masks-theater" /></span>
              <span className="char-name">{c.name}</span>
              {c.game && <span className="char-game">{c.game}</span>}
            </div>
          ))}
        </div>
      )}
      {editing && <CharactersModal initial={chars} onClose={() => setEditing(false)}
                                   onSaved={(cs) => { setChars(cs); setEditing(false); }} />}
    </section>
  );
}

function CharactersModal({ initial, onClose, onSaved }) {
  const [items, setItems] = useState(() => {
    const base = [...(initial || [])];
    while (base.length < 4) base.push({ name: '', game: '' });
    return base.slice(0, 4);
  });
  const [saving, setSaving] = useState(false);
  const set = (i, k) => (e) => setItems((arr) => arr.map((it, idx) => idx === i ? { ...it, [k]: e.target.value } : it));

  async function salvar() {
    setSaving(true);
    const clean = items.filter((it) => it.name.trim());
    const { data } = await api.put('/api/profile/characters', { characters: clean });
    setSaving(false);
    if (data?.status === 'success') onSaved(data.characters || clean); else alert(data?.message || 'Erro');
  }

  return (
    <Dialog title="Personagens Favoritos" description="Até 4 personagens marcantes." size="md" onClose={onClose}
            footer={<>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={salvar} disabled={saving}>Salvar</Button>
            </>}>
      {items.map((it, i) => (
        <div className="char-edit-row" key={i}>
          <Input value={it.name} onChange={set(i, 'name')} placeholder={`Personagem ${i + 1}`} />
          <Input value={it.game} onChange={set(i, 'game')} placeholder="Jogo" />
        </div>
      ))}
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   BADGES DO GAME IT
═══════════════════════════════════════════════════════ */
export function GameBadges() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/api/profile/badges').then(({ data }) => {
      if (data?.status === 'success') setData(data);
    });
  }, []);
  if (!data) return null;

  return (
    <section className="panel pcard">
      <div className="hub-head">
        <h3 className="pcard-title">Badges Game It</h3>
        <span className="hub-sub">{data.earned}/{data.total}</span>
      </div>
      <div className="badge-grid">
        {data.badges.map((b) => (
          <div key={b.id} className={'badge-item' + (b.earned ? ' earned' : ' locked')} title={`${b.label} — ${b.desc}`}>
            <span className="badge-ic"><i className={b.earned ? b.icon : 'fa-solid fa-lock'} /></span>
            <span className="badge-lbl">{b.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
