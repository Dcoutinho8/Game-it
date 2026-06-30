import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { escapeHtml } from '../lib/format';

// Modal de guia do jogo: Análise IA (Gemini), Troféus e Anotações.
export default function GuideModal({ game, onClose }) {
  const [tab, setTab] = useState('analysis');
  const [aiHtml, setAiHtml] = useState('');
  const [aiState, setAiState] = useState('loading'); // loading | done | completo | error
  const [aiMsg, setAiMsg] = useState('');
  const [forcado, setForcado] = useState(false);
  const [notes, setNotes] = useState([]);

  const chamarGemini = useCallback(async (opts = {}) => {
    setAiState('loading');
    const params = [];
    if (opts.regen) params.push('regen=1');
    if (opts.force) params.push('force=1');
    const qs = params.length ? '?' + params.join('&') : '';
    const { data } = await api.post('/api/analisar-jogo' + qs, {
      appid: game.appid,
      nome: game.name,
      conquistas: game.achievements || [],
      status: game.status || '',
      pct: game.pct || 0,
    });
    if (!data || data.status !== 'success') {
      setAiState('error');
      setAiMsg((data && data.message) || 'Erro na API Gemini.');
      return;
    }
    if (data.completo && !opts.force) {
      setForcado(false);
      setAiHtml(data.html);
      setAiState('completo');
      return;
    }
    setAiHtml(
      `<div class="guia-cache-label">${data.from_cache
        ? '<i class="fa-solid fa-bolt"></i> Carregado do cache'
        : '<i class="fa-solid fa-wand-magic-sparkles"></i> Gerado agora'}</div>` + data.html
    );
    setAiState('done');
  }, [game]);

  useEffect(() => {
    setForcado(false);
    chamarGemini();
  }, [chamarGemini]);

  const loadNotes = useCallback(async () => {
    const { data } = await api.get('/api/notes/' + game.appid);
    if (data && data.status === 'success') setNotes(data.notes || []);
  }, [game.appid]);

  useEffect(() => {
    if (tab === 'notes') loadNotes();
  }, [tab, loadNotes]);

  const bloqueadas = (game.achievements || []).filter((a) => a.achieved === 0);

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box open">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{game.name}</h2>
            <p className="modal-subtitle">
              {(game.pct || 0).toFixed(1)}% Concluído • AppID: {game.appid}
            </p>
          </div>
          <div className="modal-actions">
            <button onClick={onClose} className="btn-close-modal"><i className="fa-solid fa-xmark" /></button>
          </div>
        </div>

        <div className="modal-tabs">
          <button className={'modal-tab' + (tab === 'analysis' ? ' active' : '')} onClick={() => setTab('analysis')}>
            <i className="fa-solid fa-wand-magic-sparkles" /> Análise IA
          </button>
          <button className={'modal-tab' + (tab === 'achievements' ? ' active' : '')} onClick={() => setTab('achievements')}>
            <i className="fa-solid fa-list-check" /> Troféus
          </button>
          <button className={'modal-tab' + (tab === 'notes' ? ' active' : '')} onClick={() => setTab('notes')}>
            <i className="fa-solid fa-note-sticky" /> Anotações
          </button>
        </div>

        <div className="modal-body cscroll">
          {tab === 'analysis' && (
            <div className="tab-panel">
              <div className="panel ai-box">
                {aiState === 'loading' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="spinner-sm" />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Gerando análise com IA...</span>
                  </div>
                )}
                {aiState === 'error' && (
                  <div style={{ padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                    <p style={{ color: '#f87171', fontWeight: 600, marginBottom: 8 }}>Erro na API Gemini</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{aiMsg}</p>
                    <button className="btn-regen" style={{ marginTop: 12 }} onClick={() => chamarGemini({ regen: true })}>
                      Tentar Novamente
                    </button>
                  </div>
                )}
                {(aiState === 'done' || aiState === 'completo') && (
                  <>
                    <div dangerouslySetInnerHTML={{ __html: aiHtml }} />
                    {aiState === 'completo' ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18, justifyContent: 'center' }}>
                        <button className="btn-regen" onClick={() => { setForcado(true); chamarGemini({ force: true }); }}>
                          <i className="fa-solid fa-wand-magic-sparkles" /> Gerar guia bônus
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
                        <button className="btn-regen" onClick={() => chamarGemini({ regen: true, force: forcado })}>
                          🔄 Gerar Novamente
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'achievements' && (
            <div className="tab-panel">
              <div className="ach-list">
                {game.status === '100%' ? (
                  <div style={{ textAlign: 'center', padding: 24, fontSize: 13, color: 'var(--text-muted)' }}>
                    🏆 Todas as conquistas desbloqueadas!
                  </div>
                ) : bloqueadas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, fontSize: 13, color: 'var(--text-muted)' }}>
                    Sem conquistas disponíveis.
                  </div>
                ) : (
                  bloqueadas.map((ach, i) => {
                    const nome = ach.name || ach.apiname;
                    const desc = ach.description || 'Conquista secreta ou sem descrição.';
                    const qYT = encodeURIComponent(game.name + ' ' + nome + ' conquista');
                    const qPST = encodeURIComponent(game.name + ' ' + nome);
                    return (
                      <div className="ach-item" key={i}>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <p className="ach-name">🛡 {nome}</p>
                          <p className="ach-desc">{desc}</p>
                        </div>
                        <div className="ach-links">
                          <a href={`https://forum.mypst.com.br/index.php?/search/&q=${qPST}&type=forums_topic&nodes=19`}
                             target="_blank" rel="noreferrer" className="btn-mypst">
                            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 10 }} /> MyPST
                          </a>
                          <a href={`https://www.youtube.com/results?search_query=${qYT}`}
                             target="_blank" rel="noreferrer" className="btn-yt">
                            <i className="fa-brands fa-youtube" style={{ fontSize: 10 }} /> YouTube
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {tab === 'notes' && (
            <div className="tab-panel">
              <NotesPanel appid={game.appid} gameName={game.name} notes={notes} reload={loadNotes} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotesPanel({ appid, gameName, notes, reload }) {
  const [criando, setCriando] = useState(false);

  async function novaNota() {
    setCriando(true);
    await api.post('/api/notes', { appid, game_name: gameName, title: 'Anotação', content: '' });
    setCriando(false);
    reload();
  }
  async function salvar(n, title, content) {
    await api.put('/api/notes/' + n.id, { title, content });
    reload();
  }
  async function excluir(n) {
    await api.del('/api/notes/' + n.id);
    reload();
  }

  return (
    <>
      <div className="notes-toolbar">
        <button onClick={novaNota} className="btn-new-note" disabled={criando}>
          <i className="fa-solid fa-plus" /> Nova Anotação
        </button>
      </div>
      <div className="notes-list">
        {notes.length === 0 ? (
          <p className="empty-msg" style={{ textAlign: 'center', padding: '32px 0' }}>
            Nenhuma anotação ainda. Clique em "Nova Anotação".
          </p>
        ) : (
          notes.map((n) => (
            <div className="note-card" key={n.id}>
              <div className="note-header">
                <input className="note-title-input" defaultValue={n.title}
                       onBlur={(e) => salvar(n, e.target.value, n.content)} />
              </div>
              <textarea className="note-content-input" defaultValue={n.content}
                        onBlur={(e) => salvar(n, n.title, e.target.value)} />
              <div className="note-footer">
                <span className="note-meta">{escapeHtml(n.updated_at || '')}</span>
                <button className="btn-del-note" onClick={() => excluir(n)}>
                  <i className="fa-solid fa-trash" /> Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
