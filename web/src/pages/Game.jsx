import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import GuideModal from '../components/GuideModal.jsx';
import { api } from '../lib/api';
import { DEFAULT_IMG } from '../lib/format';

const STATUS = [
  ['jogando', 'fa-play', 'Jogando'],
  ['jogado', 'fa-check', 'Jogado'],
  ['backlog', 'fa-box-archive', 'Backlog'],
  ['wishlist', 'fa-gift', 'Wishlist'],
  ['platinado', 'fa-gamepad', 'Platinado'],
];

export default function Game() {
  const { appid } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [replay, setReplay] = useState(0);
  const [date, setDate] = useState('');
  const [guia, setGuia] = useState(false);
  const [toast, setToast] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: d } = await api.get(`/api/game/${encodeURIComponent(appid)}`);
    if (d?.status === 'success') {
      setData(d);
      setStatus(d.user_status?.status || null);
      setReplay(d.user_status?.replay_count || 0);
      setDate(d.user_status?.started_at ? String(d.user_status.started_at).slice(0, 10) : '');
    }
    setLoading(false);
  }, [appid]);

  useEffect(() => { carregar(); }, [carregar]);

  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  async function salvarStatus(novo, extra = {}) {
    const payload = {
      status: novo,
      game_name: data?.game?.name || '',
      started_at: extra.date ?? date ?? null,
      replay_count: extra.replay ?? replay ?? 0,
    };
    const { data: r } = await api.post(`/api/game/${encodeURIComponent(appid)}/status`, payload);
    if (r?.status === 'success') flash('Status atualizado!');
  }

  function definirStatus(s) {
    const novo = status === s ? null : s;
    setStatus(novo);
    salvarStatus(novo);
  }

  if (loading) {
    return (
      <>
        <Navbar active="" />
        <div className="loading-state" style={{ height: '70vh' }}><div className="spinner" /><p className="loading-text">Carregando jogo...</p></div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Navbar active="" />
        <div className="empty-panel" style={{ marginTop: 80 }}><i className="fa-solid fa-ghost" /><p>Jogo não encontrado.</p><Link to="/progresso" className="btn-post" style={{ marginTop: 12 }}>Voltar</Link></div>
      </>
    );
  }

  const g = data.game;
  const counts = data.status_counts || {};
  const reviews = data.reviews || [];
  const achievements = data.achievements || [];
  const playedMin = data.user_status?.played_minutes || 0;
  const horas = playedMin > 0 ? (playedMin / 60).toFixed(1) : 0;

  return (
    <>
      <Navbar active="" showTheme />

      <main className="game-page cscroll">
        <section className="game-hero panel">
          <div className="game-hero-bg" style={{ backgroundImage: `url('${g.header}')` }} />
          <div className="game-hero-content">
            <img className="game-cover" src={g.cover} alt={g.name} onError={(e) => { e.target.onerror = null; e.target.src = g.header || DEFAULT_IMG; }} />
            <div className="game-head">
              <h1 className="game-name">{g.name}</h1>
              <div className="game-genres">{(g.genres || []).map((gen) => <span className="genre-pill" key={gen}>{gen}</span>)}</div>
              <p className="game-meta">{[g.developers?.join(', '), g.release].filter(Boolean).join(' • ')}</p>
              <p className="game-desc">{g.description}</p>
              <div className="game-scores">
                <div className="score-card">
                  <span className="score-label">Média Game It</span>
                  <span className="score-value">{data.community_avg ? data.community_avg.toFixed(1) : '—'}</span>
                  <span className="score-sub">{data.community_count ? `${data.community_count} avaliações` : 'sem avaliações'}</span>
                </div>
                <div className="score-card">
                  <span className="score-label">Conquistas</span>
                  <span className="score-value">{achievements.length ? `${achievements.filter((a) => a.achieved).length}/${achievements.length}` : '—'}</span>
                  <span className="score-sub">{achievements.length ? 'desbloqueadas' : 'sem dados'}</span>
                </div>
              </div>
              {achievements.length > 0 && (
                <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => setGuia(true)}>
                  <i className="fa-solid fa-wand-magic-sparkles" /> Gerar Guia IA
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="game-grid">
          <main className="game-main">
            <section className="panel pcard">
              <h3 className="pcard-title">Seu status</h3>
              <div className="status-buttons">
                {STATUS.map(([s, ico, label]) => (
                  <button key={s} className={'status-btn' + (s === 'platinado' ? ' platinum' : '') + (status === s ? ' active' : '')} onClick={() => definirStatus(s)}>
                    <i className={'fa-solid ' + ico} /> {label}
                  </button>
                ))}
              </div>
              <div className="status-extra">
                <label className="status-field">
                  <span className="pfield-label">Comecei a jogar em</span>
                  <input type="date" className="pfield" value={date} onChange={(e) => { setDate(e.target.value); salvarStatus(status, { date: e.target.value }); }} />
                </label>
                <label className="status-field">
                  <span className="pfield-label">Jogadas (replays)</span>
                  <div className="replay-control">
                    <button type="button" onClick={() => { const v = Math.max(0, replay - 1); setReplay(v); salvarStatus(status, { replay: v }); }}><i className="fa-solid fa-minus" /></button>
                    <span>{replay}</span>
                    <button type="button" onClick={() => { const v = replay + 1; setReplay(v); salvarStatus(status, { replay: v }); }}><i className="fa-solid fa-plus" /></button>
                  </div>
                </label>
              </div>
              {playedMin > 0 && <p className="played-info"><i className="fa-solid fa-clock" /> {horas}h jogadas na Steam</p>}
            </section>

            <section className="panel pcard">
              <div className="pcard-title-row">
                <h3 className="pcard-title">Avaliações da comunidade</h3>
              </div>
              <div className="game-reviews">
                {reviews.length === 0 ? (
                  <div className="empty-panel"><i className="fa-regular fa-star" /><p>Nenhuma avaliação ainda.</p></div>
                ) : reviews.map((r) => <GameReview key={r.id} review={r} appid={appid} />)}
              </div>
            </section>
          </main>

          <aside className="game-side">
            <section className="panel pcard">
              <h3 className="pcard-title">Coleção da comunidade</h3>
              <div className="count-box">
                {STATUS.map(([s, ico, label]) => (
                  <div key={s} className={'count-row' + (s === 'platinado' ? ' platinum' : '')}>
                    <span><i className={'fa-solid ' + ico} /> {label}</span><b>{counts[s] || 0}</b>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>

      {toast && <div className="toast show">{toast}</div>}
      {guia && <GuideModal game={{ appid, name: g.name, achievements, pct: achievements.length ? (achievements.filter((a) => a.achieved).length / achievements.length) * 100 : 0, status: '' }} onClose={() => setGuia(false)} />}
    </>
  );
}

function GameReview({ review, appid }) {
  const [likes, setLikes] = useState(review.likes || 0);
  const [liked, setLiked] = useState(review.liked || false);
  async function curtir() {
    setLiked(!liked); setLikes((l) => l + (liked ? -1 : 1));
    await api.post(`/api/reviews/${review.id}/like`);
  }
  return (
    <div className="game-review">
      <img className="gr-avatar" src={review.avatar || DEFAULT_IMG} alt="" onError={(e) => { e.target.src = DEFAULT_IMG; }} />
      <div className="gr-body">
        <div className="gr-head">
          <span className="gr-author">{review.author}</span>
          <span className="gr-time">{review.time}</span>
        </div>
        <div className="review-stars">
          {[1, 2, 3, 4, 5].map((s) => <i key={s} className={(s <= review.rating ? 'fa-solid' : 'fa-regular') + ' fa-star'} />)}
          {review.platinum && <span className="gr-plat"> 🏆</span>}
        </div>
        {review.spoilers && <p className="review-spoiler-warn"><i className="fa-solid fa-triangle-exclamation" /> Contém spoilers</p>}
        {review.content && <p className="gr-content">{review.content}</p>}
        <button className={'post-like' + (liked ? ' liked' : '')} onClick={curtir}>
          <i className={(liked ? 'fa-solid' : 'fa-regular') + ' fa-heart'} /> {likes}
        </button>
      </div>
    </div>
  );
}
