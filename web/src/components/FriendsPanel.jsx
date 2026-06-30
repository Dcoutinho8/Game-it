import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { DEFAULT_IMG } from '../lib/format';

const PLAT_ICON = {
  steam: 'fa-brands fa-steam',
  epic: 'fa-solid fa-gamepad',
  riot: 'fa-solid fa-gun',
  playstation: 'fa-brands fa-playstation',
  xbox: 'fa-brands fa-xbox',
};

export default function FriendsPanel() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const navigate = useNavigate();

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get('/api/friends');
    if (data?.status === 'success') setFriends(data.friends || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const online = friends.filter((f) => f.online);

  return (
    <section className="panel pcard">
      <div className="pcard-title-row">
        <h3 className="pcard-title">Amigos {online.length > 0 && <span className="friends-online-count">{online.length} online</span>}</h3>
        <button className="btn-add-friend" onClick={() => setModal(true)} title="Adicionar amigos">
          <i className="fa-solid fa-user-plus" />
        </button>
      </div>

      {loading ? (
        <div className="recent-loading"><div className="spinner-sm" /></div>
      ) : friends.length === 0 ? (
        <div className="empty-panel" style={{ padding: '24px 10px' }}>
          <i className="fa-solid fa-user-group" />
          <p>Nenhum amigo ainda.</p>
          <button className="btn-post" onClick={() => setModal(true)} style={{ marginTop: 8 }}>Adicionar amigos</button>
        </div>
      ) : (
        <div className="friends-list">
          {friends.map((f) => (
            <FriendRow key={f.id} friend={f} onClick={() => navigate(`/usuario/${f.id}`)} />
          ))}
        </div>
      )}

      {modal && <AddFriendModal onClose={() => setModal(false)} onChanged={carregar} />}
    </section>
  );
}

function FriendRow({ friend, onClick }) {
  return (
    <div className="friend-row" onClick={onClick}>
      <div className="friend-av-wrap">
        <img className="friend-avatar" src={friend.avatar || DEFAULT_IMG} alt="" onError={(e) => { e.target.src = DEFAULT_IMG; }} />
        <span className={'friend-dot' + (friend.online ? ' on' : '')} />
      </div>
      <div className="friend-meta">
        <span className="friend-name">{friend.nickname}</span>
        <div className="friend-platforms">
          {(friend.platforms || []).map((p) => (
            <span key={p.name} className={'plat-badge' + (p.online ? ' on' : '')} title={`${p.name}: ${p.status}`}>
              <i className={PLAT_ICON[p.icon] || 'fa-solid fa-circle'} />
              {p.online && <span className="plat-status">{p.game ? p.game : p.status}</span>}
            </span>
          ))}
          {(!friend.platforms || friend.platforms.length === 0) && (
            <span className="friend-offline-lbl">{friend.online ? 'Online' : 'Offline'}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AddFriendModal({ onClose, onChanged }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
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
    setResults((rs) => rs.map((x) => x.id === u.id ? { ...x, following: !x.following } : x));
    await api.post(`/api/follow/${u.id}`);
    onChanged();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Adicionar amigos</h3><button className="modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button></div>
        <input className="g-input" autoFocus placeholder="Buscar por nome..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="friend-search-results">
          {searching && <div className="recent-loading"><div className="spinner-sm" /></div>}
          {!searching && q.trim().length >= 2 && results.length === 0 && (
            <p className="empty-msg">Nenhum usuário encontrado.</p>
          )}
          {results.map((u) => (
            <div className="friend-search-row" key={u.id}>
              <img className="friend-avatar" src={u.avatar || DEFAULT_IMG} alt="" onClick={() => { onClose(); navigate(`/usuario/${u.id}`); }} onError={(e) => { e.target.src = DEFAULT_IMG; }} />
              <span className="friend-name" onClick={() => { onClose(); navigate(`/usuario/${u.id}`); }} style={{ flex: 1, cursor: 'pointer' }}>{u.nickname}</span>
              <button className={u.following ? 'btn-following' : 'btn-follow'} onClick={() => toggle(u)}>
                {u.following ? <><i className="fa-solid fa-check" /> Amigos</> : <><i className="fa-solid fa-user-plus" /> Adicionar</>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
