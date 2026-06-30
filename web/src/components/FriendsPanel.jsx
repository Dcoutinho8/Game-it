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
        <button className="btn-add-friend" onClick={() => navigate('/descobrir')} title="Adicionar amigos">
          <i className="fa-solid fa-user-plus" />
        </button>
      </div>

      {loading ? (
        <div className="recent-loading"><div className="spinner-sm" /></div>
      ) : friends.length === 0 ? (
        <div className="empty-panel" style={{ padding: '24px 10px' }}>
          <i className="fa-solid fa-user-group" />
          <p>Nenhum amigo ainda.</p>
          <button className="btn-post" onClick={() => navigate('/descobrir')} style={{ marginTop: 8 }}>Adicionar amigos</button>
        </div>
      ) : (
        <div className="friends-list">
          {friends.map((f) => (
            <FriendRow key={f.id} friend={f} onClick={() => navigate(`/usuario/${f.id}`)} />
          ))}
        </div>
      )}
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
