import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api } from '../lib/api';
import {
  Button, Card, CardContent, Badge, Avatar, Input, Tabs, Skeleton,
} from '../components/ui/index.jsx';

const REASON_VARIANT = { steam: 'steam', mutual: 'mutual', region: 'region' };
const REASON_ICON = {
  steam: 'fa-brands fa-steam',
  mutual: 'fa-solid fa-user-group',
  region: 'fa-solid fa-location-dot',
};

// Score máximo aproximado p/ normalizar a barra de compatibilidade.
const MAX_SCORE = 50 + 56 + 12;

export default function Descobrir() {
  const [tab, setTab] = useState('recomendados');
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState({}); // id -> bool

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get('/api/friends/recommendations');
    if (data?.status === 'success') setRecs(data.recommendations || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function adicionar(id) {
    setFollowing((f) => ({ ...f, [id]: true }));
    const { data } = await api.post(`/api/follow/${id}`);
    if (data?.status === 'success' && !data.following) {
      setFollowing((f) => ({ ...f, [id]: false }));
    }
  }

  return (
    <>
      <Navbar active="" showTheme />

      <main className="discover-page cscroll">
        <header className="discover-head">
          <h1 className="discover-title">Descobrir amigos</h1>
          <p className="discover-sub">
            Sugestões personalizadas com base nos seus amigos da Steam, amigos em comum e região.
          </p>
        </header>

        <div className="discover-toolbar">
          <Tabs
            value={tab}
            onValueChange={setTab}
            items={[
              { value: 'recomendados', label: 'Recomendados', icon: 'fa-solid fa-wand-magic-sparkles', count: recs.length },
              { value: 'buscar', label: 'Buscar', icon: 'fa-solid fa-magnifying-glass' },
            ]}
          />
          {tab === 'recomendados' && (
            <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
              <i className={'fa-solid fa-rotate' + (loading ? ' fa-spin' : '')} /> Atualizar
            </Button>
          )}
        </div>

        {tab === 'recomendados'
          ? <Recomendados loading={loading} recs={recs} following={following} onAdd={adicionar} />
          : <Buscar />}
      </main>
    </>
  );
}

function Recomendados({ loading, recs, following, onAdd }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="discover-grid">
        {Array.from({ length: 6 }).map((_, i) => <RecSkeleton key={i} />)}
      </div>
    );
  }

  if (recs.length === 0) {
    return (
      <div className="discover-empty">
        <i className="fa-solid fa-user-group" />
        <h4>Nenhuma sugestão por enquanto</h4>
        <p>
          Conecte sua conta da Steam nas Configurações e siga algumas pessoas —
          assim conseguimos recomendar amigos por interesses em comum.
        </p>
      </div>
    );
  }

  return (
    <div className="discover-grid">
      {recs.map((r) => {
        const isFollowing = !!following[r.id];
        const pct = Math.min(100, Math.round((r.score / MAX_SCORE) * 100));
        return (
          <Card key={r.id} className="rec-card">
            <CardContent>
              <div className="rec-card__top">
                <Avatar
                  src={r.avatar}
                  alt={r.nickname}
                  size={48}
                  className="rec-card__avatar"
                />
                <div className="rec-card__id">
                  <p className="rec-card__name" onClick={() => navigate(`/usuario/${r.id}`)}>
                    {r.nickname}
                  </p>
                  {r.bio
                    ? <p className="rec-card__bio">{r.bio}</p>
                    : <p className="rec-card__bio">Jogador do Game It</p>}
                </div>
              </div>

              <div className="rec-card__reasons">
                {r.motivos.map((m, i) => (
                  <Badge key={i} variant={REASON_VARIANT[m.tipo] || 'secondary'}>
                    <i className={REASON_ICON[m.tipo] || 'fa-solid fa-star'} /> {m.texto}
                  </Badge>
                ))}
              </div>

              <div className="rec-card__match">
                <span>{pct}%</span>
                <span className="rec-card__match-bar">
                  <span className="rec-card__match-fill" style={{ width: pct + '%' }} />
                </span>
                <span>compatível</span>
              </div>
            </CardContent>

            <div className="ui-card__footer">
              {isFollowing ? (
                <Button variant="success" size="sm" style={{ flex: 1 }} onClick={() => onAdd(r.id)}>
                  <i className="fa-solid fa-check" /> Amigos
                </Button>
              ) : (
                <Button variant="default" size="sm" style={{ flex: 1 }} onClick={() => onAdd(r.id)}>
                  <i className="fa-solid fa-user-plus" /> Adicionar
                </Button>
              )}
              <Button variant="ghost" size="icon" title="Ver perfil" onClick={() => navigate(`/usuario/${r.id}`)}>
                <i className="fa-solid fa-arrow-right" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function RecSkeleton() {
  return (
    <Card className="rec-card">
      <CardContent>
        <div className="rec-card__top">
          <Skeleton style={{ width: 48, height: 48, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <Skeleton style={{ height: 14, width: '60%', marginBottom: 8 }} />
            <Skeleton style={{ height: 11, width: '90%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          <Skeleton style={{ height: 20, width: 90, borderRadius: 999 }} />
          <Skeleton style={{ height: 20, width: 70, borderRadius: 999 }} />
        </div>
        <Skeleton style={{ height: 5, width: '100%', marginTop: 16, borderRadius: 999 }} />
      </CardContent>
      <div className="ui-card__footer">
        <Skeleton style={{ height: 32, flex: 1 }} />
      </div>
    </Card>
  );
}

function Buscar() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [following, setFollowing] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await api.get(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
      setSearching(false);
      if (data?.status === 'success') setResults(data.users || []);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  async function toggle(u) {
    const novo = !(following[u.id] ?? u.following);
    setFollowing((f) => ({ ...f, [u.id]: novo }));
    await api.post(`/api/follow/${u.id}`);
  }

  return (
    <div>
      <div className="discover-search" style={{ marginBottom: 6 }}>
        <i className="fa-solid fa-magnifying-glass discover-search-icon" />
        <Input
          autoFocus
          placeholder="Buscar por nome ou e-mail..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="discover-search-list">
        {searching && (
          <>
            <Skeleton style={{ height: 56 }} />
            <Skeleton style={{ height: 56 }} />
          </>
        )}
        {!searching && q.trim().length >= 2 && results.length === 0 && (
          <div className="discover-empty" style={{ padding: '40px 20px' }}>
            <i className="fa-solid fa-user-slash" />
            <h4>Ninguém encontrado</h4>
            <p>Tente outro nome.</p>
          </div>
        )}
        {!searching && q.trim().length < 2 && (
          <div className="discover-empty" style={{ padding: '40px 20px' }}>
            <i className="fa-solid fa-keyboard" />
            <h4>Busque por pessoas</h4>
            <p>Digite ao menos 2 caracteres para procurar.</p>
          </div>
        )}
        {results.map((u) => {
          const isFollowing = following[u.id] ?? u.following;
          return (
            <div className="discover-user-row" key={u.id}>
              <Avatar src={u.avatar} alt={u.nickname} size={40} onClick={() => navigate(`/usuario/${u.id}`)} style={{ cursor: 'pointer' }} />
              <span className="name" onClick={() => navigate(`/usuario/${u.id}`)}>{u.nickname}</span>
              <Button
                variant={isFollowing ? 'success' : 'default'}
                size="sm"
                onClick={() => toggle(u)}
              >
                {isFollowing
                  ? <><i className="fa-solid fa-check" /> Amigos</>
                  : <><i className="fa-solid fa-user-plus" /> Adicionar</>}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
