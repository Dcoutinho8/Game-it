import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api } from '../lib/api';
import { DEFAULT_IMG, steamCover } from '../lib/format';

const PLAT_ICON = {
  steam: 'fa-brands fa-steam',
  epic: 'fa-solid fa-gamepad',
  riot: 'fa-solid fa-gun',
  playstation: 'fa-brands fa-playstation',
  xbox: 'fa-brands fa-xbox',
};

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get(`/api/users/${id}`);
    if (data?.status === 'success') {
      if (data.profile.is_me) { navigate('/perfil', { replace: true }); return; }
      setP(data.profile);
    }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { carregar(); }, [carregar]);

  async function toggleFollow() {
    setBusy(true);
    const { data } = await api.post(`/api/follow/${id}`);
    setBusy(false);
    if (data?.status === 'success') {
      setP((prev) => ({
        ...prev,
        is_following: data.following,
        followers: prev.followers + (data.following ? 1 : -1),
      }));
    }
  }

  if (loading) {
    return (
      <>
        <Navbar active="" showTheme />
        <div className="loading-state" style={{ height: '70vh' }}><div className="spinner" /><p className="loading-text">Carregando perfil...</p></div>
      </>
    );
  }

  if (!p) {
    return (
      <>
        <Navbar active="" showTheme />
        <div className="empty-panel" style={{ marginTop: 80 }}><i className="fa-solid fa-ghost" /><p>Usuário não encontrado.</p><Link to="/perfil" className="btn-post" style={{ marginTop: 12 }}>Voltar</Link></div>
      </>
    );
  }

  let nick = p.nickname || 'Jogador';
  if (nick[0] !== '@') nick = '@' + nick;
  const favs = p.favorites || [];

  return (
    <>
      <Navbar active="" showTheme />

      <div className="profile-layout cscroll">
        <aside className="pcol-left">
          <section className="panel pcard">
            <h3 className="pcard-title">Plataformas</h3>
            {(p.platforms || []).length === 0 ? (
              <p className="empty-msg">Nenhuma plataforma conectada.</p>
            ) : (
              <div className="pub-platforms">
                {p.platforms.map((pl) => (
                  <div className={'pub-plat' + (pl.online ? ' on' : '')} key={pl.name}>
                    <i className={PLAT_ICON[pl.icon] || 'fa-solid fa-circle'} />
                    <div>
                      <span className="pub-plat-name">{pl.name}</span>
                      <span className="pub-plat-status">{pl.status}</span>
                    </div>
                    <span className={'friend-dot' + (pl.online ? ' on' : '')} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>

        <main className="pcol-center">
          <section className="panel profile-header">
            <div className="profile-banner" style={p.cover ? { backgroundImage: `url('${p.cover}')` } : undefined} />
            <button className={'btn-edit-profile' + (p.is_following ? ' following' : '')} onClick={toggleFollow} disabled={busy}>
              {p.is_following ? <><i className="fa-solid fa-check" /> Amigos</> : <><i className="fa-solid fa-user-plus" /> Adicionar</>}
            </button>
            <div className="profile-avatar">
              <img src={p.avatar || DEFAULT_IMG} alt="Avatar" onError={(e) => { e.target.src = DEFAULT_IMG; }} />
              <span className={'friend-dot lg' + (p.online ? ' on' : '')} />
            </div>
            <hr className="profile-divider" />
            <div className="profile-info">
              <h2 className="profile-name"><span>{nick}</span><i className="fa-solid fa-circle-check verified" />
                {p.online && <span className="online-pill"><span className="online-dot" /> Online</span>}
              </h2>
              <p className="profile-bio">{p.bio || 'Sem bio ainda.'}</p>
              <p className="profile-meta"><i className="fa-regular fa-calendar" /> {p.joined}</p>
              <p className="profile-follow">
                <span className="follow-num">{p.following || 0}</span> <span className="follow-lbl">Seguindo</span>
                <span className="follow-num">{p.followers || 0}</span> <span className="follow-lbl">Seguidores</span>
                <span className="follow-num">{p.total_games || 0}</span> <span className="follow-lbl">Jogos</span>
              </p>
            </div>
            <div className="fav-games">
              <p className="fav-title">Jogos Favoritos</p>
              <div className="fav-covers">
                {[0, 1, 2].map((i) => {
                  const f = favs[i];
                  return f ? (
                    <Link to={`/jogo/${encodeURIComponent(f.appid)}`} key={i} className="fav-cover" title={f.name}>
                      <img src={f.cover || steamCover(f.appid)} alt="" onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMG; }} />
                    </Link>
                  ) : <div className="fav-cover empty" key={i} />;
                })}
              </div>
            </div>
          </section>

          <section className="panel pcard">
            <h3 className="pcard-title">Avaliações recentes</h3>
            {(p.reviews || []).length === 0 ? (
              <div className="empty-panel"><i className="fa-regular fa-star" /><p>Nenhuma avaliação ainda.</p></div>
            ) : p.reviews.map((r) => (
              <div className="review-card" key={r.id} style={{ background: 'transparent', padding: '12px 0', borderBottom: '1px solid var(--border, rgba(255,255,255,.06))' }}>
                <div className="review-head">
                  {r.cover && <img className="review-cover" src={r.cover} alt="" onError={(e) => { e.target.style.display = 'none'; }} />}
                  <div className="review-meta">
                    <p className="review-game">{r.game_name}</p>
                    <div className="review-stars">{[1, 2, 3, 4, 5].map((s) => <i key={s} className={(s <= r.rating ? 'fa-solid' : 'fa-regular') + ' fa-star'} />)}</div>
                    <p className="review-time">{r.time}</p>
                  </div>
                </div>
                {r.content && <p className="review-content">{r.content}</p>}
              </div>
            ))}
          </section>
        </main>

        <aside className="pcol-right" />
      </div>
    </>
  );
}
