import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import FriendsPanel from '../components/FriendsPanel.jsx';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import { escapeHtml, steamCover, steamHeader, DEFAULT_IMG } from '../lib/format';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [lists, setLists] = useState([]);
  const [liked, setLiked] = useState([]);
  const [jogos, setJogos] = useState([]);
  const [ratings, setRatings] = useState({ distribution: {}, total: 0 });
  const [composer, setComposer] = useState('');
  const [posting, setPosting] = useState(false);
  const [modal, setModal] = useState(null); // 'editar' | 'review' | 'lista' | 'favoritos'
  const avatarInput = useRef(null);
  const coverInput = useRef(null);

  const carregarPerfil = useCallback(async () => {
    const { data } = await api.get('/api/profile');
    if (data?.status === 'success') setProfile(data.profile);
  }, []);

  const carregarPosts = useCallback(async () => {
    const { data } = await api.get('/api/posts');
    if (data?.status === 'success') setPosts(data.posts || []);
  }, []);

  useEffect(() => {
    carregarPerfil();
    carregarPosts();
    api.get('/api/reviews/ratings').then(({ data }) => {
      if (data?.status === 'success') setRatings({ distribution: data.distribution, total: data.total });
    });
    api.get('/api/steam-data').then(({ data }) => {
      if (data?.status === 'success') setJogos(data.games || []);
    });
  }, [carregarPerfil, carregarPosts]);

  useEffect(() => {
    if (tab === 'reviews' && reviews.length === 0) {
      api.get('/api/reviews').then(({ data }) => { if (data?.status === 'success') setReviews(data.reviews || []); });
    }
    if (tab === 'listas' && lists.length === 0) {
      api.get('/api/lists').then(({ data }) => { if (data?.status === 'success') setLists(data.lists || []); });
    }
    if (tab === 'curtidas') {
      api.get('/api/posts/liked').then(({ data }) => { if (data?.status === 'success') setLiked(data.posts || []); });
    }
  }, [tab]); // eslint-disable-line

  async function publicar() {
    const texto = composer.trim();
    if (!texto || posting) return;
    setPosting(true);
    const { data } = await api.post('/api/posts', { content: texto });
    setPosting(false);
    if (data?.status === 'success') {
      setComposer('');
      carregarPosts();
    }
  }

  async function curtirPost(id) {
    setPosts((ps) => ps.map((p) => p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
    await api.post(`/api/posts/${id}/like`);
  }

  async function apagarPost(id) {
    if (!confirm('Apagar este post?')) return;
    await api.del(`/api/posts/${id}`);
    setPosts((ps) => ps.filter((p) => p.id !== id));
  }

  async function uploadImagem(tipo, file) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.upload(`/api/profile/upload?type=${tipo}`, fd);
    if (data?.status === 'success') carregarPerfil();
  }

  const p = profile || {};
  let nick = p.nickname || 'Jogador';
  if (nick[0] !== '@') nick = '@' + nick;
  const favs = p.favorites || [];

  const total = jogos.length;
  const plat = jogos.filter((j) => j.status === '100%').length;

  return (
    <>
      <Navbar active="Perfil" onSearch={() => {}} />

      <div className="profile-layout cscroll">
        {/* LEFT */}
        <aside className="pcol-left">
          <section className="panel pcard">
            <h3 className="pcard-title">Jogado Recentemente</h3>
            <div className="recent-list">
              {jogos.slice(0, 5).map((j) => (
                <Link to={`/jogo/${encodeURIComponent(j.appid)}`} key={j.appid} className="recent-item">
                  <img src={steamHeader(j.appid)} alt="" onError={(e) => { e.target.src = DEFAULT_IMG; }} />
                  <div className="recent-meta">
                    <span className="recent-name">{j.name}</span>
                    <span className="recent-pct">{(j.pct || 0).toFixed(0)}%</span>
                  </div>
                </Link>
              ))}
              {jogos.length === 0 && <p className="empty-msg">Sincronize sua Steam no Progresso.</p>}
            </div>
          </section>

          <section className="panel pcard">
            <h3 className="pcard-title">Avaliações</h3>
            <div className="rating-bars">
              {[5, 4, 3, 2, 1].map((star) => {
                const c = ratings.distribution?.[star] || 0;
                const pctw = ratings.total > 0 ? (c / ratings.total) * 100 : 0;
                return (
                  <div className="rating-row" key={star}>
                    <span className="rating-star">{star} <i className="fa-solid fa-star" /></span>
                    <div className="rating-track"><div className="rating-fill" style={{ width: pctw + '%' }} /></div>
                    <span className="rating-count">{c}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        {/* CENTER */}
        <main className="pcol-center">
          <section className="panel profile-header">
            <div className="profile-banner" style={p.cover ? { backgroundImage: `url('${p.cover}')` } : undefined}>
              <button className="btn-change-cover" onClick={() => coverInput.current?.click()} title="Trocar capa">
                <i className="fa-solid fa-camera" />
              </button>
            </div>
            <button className="btn-edit-profile" onClick={() => setModal('editar')}>Editar Perfil</button>
            <div className="profile-avatar">
              <img src={p.avatar || DEFAULT_IMG} alt="Avatar" onError={(e) => { e.target.src = DEFAULT_IMG; }} />
              <button className="btn-change-avatar" onClick={() => avatarInput.current?.click()} title="Trocar foto">
                <i className="fa-solid fa-camera" />
              </button>
            </div>
            <hr className="profile-divider" />
            <div className="profile-info">
              <h2 className="profile-name"><span>{nick}</span><i className="fa-solid fa-circle-check verified" /></h2>
              <p className="profile-bio">{p.bio || 'Sem bio ainda.'}</p>
              <p className="profile-meta"><i className="fa-regular fa-calendar" /> {p.joined || 'Recentemente'}</p>
              <p className="profile-follow">
                <span className="follow-num">{p.following || 0}</span> <span className="follow-lbl">Seguindo</span>
                <span className="follow-num">{p.followers || 0}</span> <span className="follow-lbl">Seguidores</span>
              </p>
            </div>
            <div className="fav-games">
              <p className="fav-title">Jogos Favoritos
                <button className="btn-edit-fav" onClick={() => setModal('favoritos')} title="Editar favoritos"><i className="fa-solid fa-pen" /></button>
              </p>
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

          <div className="profile-tabs">
            {['posts', 'reviews', 'listas', 'jogos', 'curtidas'].map((t) => (
              <button key={t} className={'ptab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'posts' && (
            <div className="ppanel" style={{ display: 'flex' }}>
              <div className="composer panel">
                <div className="composer-avatar"><img src={p.avatar || DEFAULT_IMG} alt="" onError={(e) => { e.target.src = DEFAULT_IMG; }} /></div>
                <div className="composer-body">
                  <textarea className="composer-input" rows={2} value={composer} maxLength={1000}
                            onChange={(e) => setComposer(e.target.value)} placeholder="No que você está jogando?" />
                  <div className="composer-actions">
                    <span className="composer-hint">Use #hashtags para entrar no Trending</span>
                    <button className="btn-post" onClick={publicar} disabled={posting}>
                      <i className="fa-solid fa-paper-plane" /> Postar
                    </button>
                  </div>
                </div>
              </div>
              <div className="posts-list">
                {posts.length === 0 ? (
                  <div className="empty-panel"><i className="fa-regular fa-comment" /><p>Nenhum post ainda. Seja o primeiro!</p></div>
                ) : posts.map((post) => (
                  <PostCard key={post.id} post={post} meName={user?.name} onLike={curtirPost} onDelete={apagarPost} />
                ))}
              </div>
            </div>
          )}

          {tab === 'reviews' && (
            <div className="ppanel" style={{ display: 'flex' }}>
              <div className="reviews-toolbar">
                <button className="btn-new-review" onClick={() => setModal('review')}><i className="fa-solid fa-star" /> Nova Avaliação</button>
              </div>
              {reviews.length === 0 ? (
                <div className="empty-panel"><i className="fa-regular fa-star" /><p>Nenhuma avaliação ainda.</p></div>
              ) : reviews.map((r) => <ReviewCard key={r.id} review={r} onDelete={async (id) => {
                if (!confirm('Apagar avaliação?')) return;
                await api.del(`/api/reviews/${id}`); setReviews((rs) => rs.filter((x) => x.id !== id));
              }} />)}
            </div>
          )}

          {tab === 'listas' && (
            <div className="ppanel" style={{ display: 'flex' }}>
              <div className="reviews-toolbar">
                <button className="btn-new-review" onClick={() => setModal('lista')}><i className="fa-solid fa-plus" /> Nova Lista</button>
              </div>
              <div className="listas-grid">
                {lists.length === 0 ? (
                  <div className="empty-panel" style={{ gridColumn: '1/-1' }}><i className="fa-solid fa-list" /><p>Nenhuma lista criada.</p></div>
                ) : lists.map((l) => (
                  <div className="lista-card" key={l.id}>
                    <div className="lista-preview">
                      {(l.preview || []).slice(0, 4).map((src, i) => <img key={i} src={src} alt="" onError={(e) => { e.target.style.visibility = 'hidden'; }} />)}
                    </div>
                    <div className="lista-meta">
                      <p className="lista-title">{l.title}</p>
                      <p className="lista-count">{l.count} {l.count === 1 ? 'jogo' : 'jogos'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'jogos' && (
            <div className="ppanel" style={{ display: 'flex' }}>
              <div className="jogos-mini-grid">
                {jogos.map((j) => (
                  <Link to={`/jogo/${encodeURIComponent(j.appid)}`} className="jogo-mini" key={j.appid} title={j.name}>
                    <img src={steamCover(j.appid)} alt={j.name} onError={(e) => { e.target.onerror = null; e.target.src = steamHeader(j.appid); }} />
                    <span className="jogo-mini-name">{j.name}</span>
                  </Link>
                ))}
                {jogos.length === 0 && <div className="empty-panel" style={{ gridColumn: '1/-1' }}><i className="fa-solid fa-gamepad" /><p>Sincronize sua biblioteca no Progresso.</p></div>}
              </div>
            </div>
          )}

          {tab === 'curtidas' && (
            <div className="ppanel" style={{ display: 'flex' }}>
              <div className="posts-list">
                {liked.length === 0 ? (
                  <div className="empty-panel"><i className="fa-regular fa-heart" /><p>Você ainda não curtiu nenhum post.</p></div>
                ) : liked.map((post) => <PostCard key={post.id} post={post} readonly />)}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT */}
        <aside className="pcol-right">
          <FriendsPanel />

          <section className="panel pcard">
            <h3 className="pcard-title">Resumo</h3>
            <div className="stats-grid">
              <div className="stat-box"><span className="stat-box-num">{total}</span><span className="stat-box-lbl">Jogos</span></div>
              <div className="stat-box"><span className="stat-box-num" style={{ color: '#fbbf24' }}>{plat}</span><span className="stat-box-lbl">Platinados</span></div>
            </div>
            <Link to="/progresso" className="pg-profile-link" style={{ marginTop: 12 }}>Ver progresso completo <i className="fa-solid fa-arrow-right" /></Link>
          </section>
        </aside>
      </div>

      <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => uploadImagem('avatar', e.target.files[0])} />
      <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => uploadImagem('cover', e.target.files[0])} />

      {modal === 'editar' && <EditarPerfilModal profile={p} onClose={() => setModal(null)} onSaved={() => { setModal(null); carregarPerfil(); }} />}
      {modal === 'review' && <NovaReviewModal jogos={jogos} onClose={() => setModal(null)} onSaved={() => { setModal(null); api.get('/api/reviews').then(({ data }) => { if (data?.status === 'success') setReviews(data.reviews || []); }); }} />}
      {modal === 'lista' && <NovaListaModal onClose={() => setModal(null)} onSaved={() => { setModal(null); api.get('/api/lists').then(({ data }) => { if (data?.status === 'success') setLists(data.lists || []); }); }} />}
      {modal === 'favoritos' && <FavoritosModal jogos={jogos} atuais={favs.map((f) => String(f.appid))} onClose={() => setModal(null)} onSaved={() => { setModal(null); carregarPerfil(); }} />}
    </>
  );
}

function PostCard({ post, meName, onLike, onDelete, readonly }) {
  return (
    <div className="post-card panel">
      <div className="post-head">
        <img className="post-avatar" src={post.avatar || DEFAULT_IMG} alt="" onError={(e) => { e.target.src = DEFAULT_IMG; }} />
        <div className="post-author">
          <span className="post-name">{post.name}</span>
          <span className="post-time">{post.time}</span>
        </div>
        {!readonly && post.name && meName && (
          <button className="post-del" onClick={() => onDelete(post.id)} title="Apagar"><i className="fa-solid fa-trash" /></button>
        )}
      </div>
      <p className="post-content" dangerouslySetInnerHTML={{ __html: linkHashtags(post.content) }} />
      {post.image_url && <img className="post-image" src={post.image_url} alt="" />}
      <div className="post-actions">
        <button className={'post-like' + (post.liked ? ' liked' : '')} onClick={readonly ? undefined : () => onLike(post.id)} disabled={readonly}>
          <i className={(post.liked ? 'fa-solid' : 'fa-regular') + ' fa-heart'} /> {post.likes}
        </button>
      </div>
    </div>
  );
}

function ReviewCard({ review, onDelete }) {
  return (
    <div className="review-card panel">
      <div className="review-head">
        {review.cover && <img className="review-cover" src={review.cover} alt="" onError={(e) => { e.target.style.display = 'none'; }} />}
        <div className="review-meta">
          <p className="review-game">{review.game_name}</p>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((s) => <i key={s} className={(s <= review.rating ? 'fa-solid' : 'fa-regular') + ' fa-star'} />)}
          </div>
          <p className="review-time">{review.time} • {review.status}{review.platinum ? ' • 🏆 Platinado' : ''}</p>
        </div>
        <button className="post-del" onClick={() => onDelete(review.id)} title="Apagar"><i className="fa-solid fa-trash" /></button>
      </div>
      {review.spoilers && <p className="review-spoiler-warn"><i className="fa-solid fa-triangle-exclamation" /> Contém spoilers</p>}
      {review.content && <p className="review-content">{review.content}</p>}
      <div className="post-actions">
        <span className="post-like"><i className={(review.liked ? 'fa-solid' : 'fa-regular') + ' fa-heart'} /> {review.likes}</span>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button className="modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button></div>
        {children}
      </div>
    </div>
  );
}

function EditarPerfilModal({ profile, onClose, onSaved }) {
  const [nick, setNick] = useState((profile.nickname || '').replace(/^@/, ''));
  const [bio, setBio] = useState(profile.bio || '');
  const [saving, setSaving] = useState(false);
  async function salvar() {
    setSaving(true);
    await api.put('/api/profile', { nickname: nick, bio });
    setSaving(false); onSaved();
  }
  return (
    <Modal title="Editar Perfil" onClose={onClose}>
      <label className="g-label">Nickname</label>
      <input className="g-input" value={nick} maxLength={40} onChange={(e) => setNick(e.target.value)} />
      <label className="g-label">Bio</label>
      <textarea className="g-input" rows={3} value={bio} maxLength={200} onChange={(e) => setBio(e.target.value)} />
      <button className="btn-post" onClick={salvar} disabled={saving} style={{ marginTop: 14 }}>Salvar</button>
    </Modal>
  );
}

function NovaReviewModal({ jogos, onClose, onSaved }) {
  const [appid, setAppid] = useState('');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [spoilers, setSpoilers] = useState(false);
  const [status, setStatus] = useState('Completed');
  const [saving, setSaving] = useState(false);
  async function salvar() {
    if (!appid || rating < 1) { alert('Escolha o jogo e a nota.'); return; }
    const jogo = jogos.find((j) => String(j.appid) === String(appid));
    setSaving(true);
    const { data } = await api.post('/api/reviews', { appid, game_name: jogo?.name || '', rating, content, spoilers, status });
    setSaving(false);
    if (data?.status === 'success') onSaved(); else alert(data?.message || 'Erro');
  }
  return (
    <Modal title="Nova Avaliação" onClose={onClose}>
      <label className="g-label">Jogo</label>
      <select className="g-input" value={appid} onChange={(e) => setAppid(e.target.value)}>
        <option value="">Selecione...</option>
        {jogos.map((j) => <option key={j.appid} value={j.appid}>{j.name}</option>)}
      </select>
      <label className="g-label">Nota</label>
      <div className="review-stars" style={{ fontSize: 24, marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <i key={s} className={(s <= rating ? 'fa-solid' : 'fa-regular') + ' fa-star'} style={{ cursor: 'pointer', color: s <= rating ? '#fbbf24' : undefined }} onClick={() => setRating(s)} />
        ))}
      </div>
      <label className="g-label">Status</label>
      <select className="g-input" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="Completed">Concluído</option>
        <option value="Playing">Jogando</option>
        <option value="Dropped">Abandonado</option>
        <option value="Backlog">Backlog</option>
      </select>
      <label className="g-label">Comentário</label>
      <textarea className="g-input" rows={3} value={content} maxLength={1000} onChange={(e) => setContent(e.target.value)} />
      <label className="g-check"><input type="checkbox" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} /> Contém spoilers</label>
      <button className="btn-post" onClick={salvar} disabled={saving} style={{ marginTop: 14 }}>Publicar avaliação</button>
    </Modal>
  );
}

function NovaListaModal({ onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('custom');
  const [saving, setSaving] = useState(false);
  async function salvar() {
    if (!title.trim()) { alert('Dê um título.'); return; }
    setSaving(true);
    const { data } = await api.post('/api/lists', { title, kind });
    setSaving(false);
    if (data?.status === 'success') onSaved(); else alert(data?.message || 'Erro');
  }
  return (
    <Modal title="Nova Lista" onClose={onClose}>
      <label className="g-label">Título</label>
      <input className="g-input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      <label className="g-label">Tipo</label>
      <select className="g-input" value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="custom">Personalizada</option>
        <option value="all">Todos os jogos (auto)</option>
      </select>
      <button className="btn-post" onClick={salvar} disabled={saving} style={{ marginTop: 14 }}>Criar lista</button>
    </Modal>
  );
}

function FavoritosModal({ jogos, atuais, onClose, onSaved }) {
  const [sel, setSel] = useState(atuais || []);
  const [busca, setBusca] = useState('');
  const [saving, setSaving] = useState(false);
  function toggle(appid) {
    const id = String(appid);
    setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : (s.length < 3 ? [...s, id] : s));
  }
  async function salvar() {
    setSaving(true);
    await api.put('/api/profile', { favorites: sel });
    setSaving(false); onSaved();
  }
  const filtrados = jogos.filter((j) => j.name.toLowerCase().includes(busca.toLowerCase()));
  return (
    <Modal title={`Favoritos (${sel.length}/3)`} onClose={onClose}>
      <input className="g-input" placeholder="Buscar jogo..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="fav-select-grid">
        {filtrados.slice(0, 60).map((j) => (
          <div key={j.appid} className={'fav-select-item' + (sel.includes(String(j.appid)) ? ' selected' : '')} onClick={() => toggle(j.appid)} title={j.name}>
            <img src={steamCover(j.appid)} alt="" onError={(e) => { e.target.onerror = null; e.target.src = steamHeader(j.appid); }} />
            {sel.includes(String(j.appid)) && <span className="fav-check"><i className="fa-solid fa-check" /></span>}
          </div>
        ))}
      </div>
      <button className="btn-post" onClick={salvar} disabled={saving} style={{ marginTop: 14 }}>Salvar favoritos</button>
    </Modal>
  );
}

function linkHashtags(text) {
  return escapeHtml(text || '').replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
}
