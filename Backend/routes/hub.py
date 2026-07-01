"""
HUB multiplataforma do Game It.

Consolida as contas de jogos do usuário (Steam com dados reais; demais
plataformas via conexão manual, pois não possuem API pública utilizável)
e expõe endpoints para o cabeçalho expandido do perfil:

  - /api/profile/platforms-summary   → resumo agregado de todas as plataformas
  - /api/connect/<platform>          → conecta/atualiza (manual) uma plataforma
  - /api/disconnect/<platform>       → remove a conexão
  - /api/sync/<platform>             → força atualização (Steam usa cache real)
  - /api/profile/platinum-progress   → jogos mais próximos de 100%/platina
  - /api/profile/activity            → grid de atividade (estilo GitHub)
  - /api/profile/compare/<id>        → comparação lado a lado com outro usuário
  - /api/profile/characters (GET/PUT)→ personagens favoritos
  - /api/profile/badges              → conquistas de gamificação do Game It
"""
from datetime import datetime, timedelta, date
from flask import Blueprint, request, jsonify
from psycopg.types.json import Json
from database import get_connection
from security import login_required, current_user_id, clamp_text

hub_bp = Blueprint('hub', __name__)

COVER_URL = 'https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/library_600x900.jpg'

# Metadados oficiais de cada plataforma (cor de marca + rótulo + ícone FA).
PLATFORMS = {
    'steam':       {'label': 'Steam',        'color': '#66c0f4', 'icon': 'fa-brands fa-steam',        'api': True,  'metrics': ['games', 'achievements', 'platinums', 'hours']},
    'playstation': {'label': 'PlayStation',  'color': '#0070D1', 'icon': 'fa-brands fa-playstation',  'api': False, 'metrics': ['games', 'trophies', 'platinums', 'hours']},
    'xbox':        {'label': 'Xbox',         'color': '#107C10', 'icon': 'fa-brands fa-xbox',         'api': False, 'metrics': ['games', 'achievements', 'gamerscore', 'hours']},
    'nintendo':    {'label': 'Nintendo',     'color': '#E60012', 'icon': 'fa-solid fa-gamepad',       'api': False, 'metrics': ['games', 'hours']},
    'epic':        {'label': 'Epic Games',   'color': '#8A2BE2', 'icon': 'fa-solid fa-gamepad',       'api': False, 'metrics': ['games', 'achievements', 'hours']},
    'ubisoft':     {'label': 'Ubisoft',      'color': '#0070FF', 'icon': 'fa-solid fa-gamepad',       'api': False, 'metrics': ['games', 'achievements', 'hours']},
    'riot':        {'label': 'Riot Games',   'color': '#D13639', 'icon': 'fa-solid fa-gamepad',       'api': False, 'metrics': ['games', 'wins', 'hours']},
}
PLATFORM_ORDER = ['steam', 'playstation', 'xbox', 'nintendo', 'epic', 'ubisoft', 'riot']


def uid():
    return current_user_id()


# ── Agregação de dados reais da Steam (a partir de user_games) ──
def _steam_stats(cur, user_id):
    """Calcula estatísticas reais da Steam a partir do cache local."""
    cur.execute(
        "SELECT appid, name, pct, status, playtime_forever, achievements "
        "FROM user_games WHERE user_id=%s",
        (user_id,)
    )
    rows = cur.fetchall()
    if not rows:
        return None

    total_games = len(rows)
    total_hours = 0
    total_ach = 0
    platinums = 0
    fav = None
    fav_time = -1
    for r in rows:
        mins = int(r.get('playtime_forever') or 0)
        total_hours += mins
        try:
            pct = float(r.get('pct') or 0)
        except (TypeError, ValueError):
            pct = 0
        if pct >= 100 or r.get('status') == '100%':
            platinums += 1
        achs = r.get('achievements') or []
        if isinstance(achs, list):
            total_ach += sum(1 for a in achs if isinstance(a, dict) and a.get('achieved') == 1)
        if mins > fav_time:
            fav_time = mins
            fav = r

    return {
        'total_games': total_games,
        'total_achievements': total_ach,
        'total_platinums': platinums,
        'total_hours': round(total_hours / 60),
        'favorite_game': (fav['name'] if fav else None),
        'favorite_cover': (COVER_URL.format(appid=fav['appid']) if fav else None),
    }


def _steam_username(cur, user_id):
    cur.execute("SELECT display_name, name FROM users WHERE id=%s", (user_id,))
    u = cur.fetchone() or {}
    return u.get('display_name') or u.get('name') or 'Steam'


def _connections(cur, user_id):
    cur.execute("SELECT * FROM platform_connections WHERE user_id=%s", (user_id,))
    return {r['platform']: r for r in cur.fetchall()}


# ═══════════════════════════════════════════════════════
#  RESUMO AGREGADO DE PLATAFORMAS
# ═══════════════════════════════════════════════════════
@hub_bp.route('/api/profile/platforms-summary')
@login_required
def platforms_summary():
    user_id = uid()
    conn = get_connection()
    cur = conn.cursor()

    conns = _connections(cur, user_id)
    steam_real = _steam_stats(cur, user_id)

    cur.execute("SELECT favorite_platform FROM users WHERE id=%s", (user_id,))
    urow = cur.fetchone() or {}
    fav_platform_saved = urow.get('favorite_platform')

    platforms = []
    agg = {'total_games': 0, 'total_achievements': 0, 'total_platinums': 0, 'total_hours': 0}
    best_platform, best_score = None, -1

    for pid in PLATFORM_ORDER:
        meta = PLATFORMS[pid]
        entry = {
            'id': pid,
            'label': meta['label'],
            'brand_color': meta['color'],
            'icon': meta['icon'],
            'api': meta['api'],
            'metrics': meta['metrics'],
            'connected': False,
            'username': None,
            'avatar': None,
            'total_games': 0,
            'total_achievements': 0,
            'total_platinums': 0,
            'total_hours': 0,
            'favorite_game': None,
            'favorite_cover': None,
        }

        if pid == 'steam' and steam_real:
            entry.update({
                'connected': True,
                'username': _steam_username(cur, user_id),
                **steam_real,
            })
        elif pid in conns:
            c = conns[pid]
            entry.update({
                'connected': True,
                'username': c.get('username'),
                'avatar': c.get('avatar_url'),
                'total_games': int(c.get('total_games') or 0),
                'total_achievements': int(c.get('total_achievements') or 0),
                'total_platinums': int(c.get('total_platinums') or 0),
                'total_hours': int(c.get('total_hours') or 0),
                'favorite_game': c.get('favorite_game'),
                'favorite_cover': c.get('favorite_cover'),
            })

        if entry['connected']:
            agg['total_games'] += entry['total_games']
            agg['total_achievements'] += entry['total_achievements']
            agg['total_platinums'] += entry['total_platinums']
            agg['total_hours'] += entry['total_hours']
            score = entry['total_hours'] + entry['total_games'] * 2
            if score > best_score:
                best_score = score
                best_platform = pid

        platforms.append(entry)

    agg['favorite_platform'] = fav_platform_saved or best_platform
    cur.close()
    conn.close()
    return jsonify({'status': 'success', 'platforms': platforms, 'aggregated': agg})


# ═══════════════════════════════════════════════════════
#  CONECTAR / DESCONECTAR / SINCRONIZAR
# ═══════════════════════════════════════════════════════
@hub_bp.route('/api/connect/<platform>', methods=['POST'])
@login_required
def connect_platform(platform):
    user_id = uid()
    if platform not in PLATFORMS:
        return jsonify({'status': 'error', 'message': 'Plataforma inválida.'}), 400
    if platform == 'steam':
        return jsonify({'status': 'error', 'message': 'A Steam é conectada nas Configurações (API Key + SteamID).'}), 400

    d = request.get_json() or {}
    username = clamp_text(d.get('username'), 120)
    if not username:
        return jsonify({'status': 'error', 'message': 'Informe seu usuário/gamertag.'}), 400

    def _num(v):
        try:
            return max(0, int(v))
        except (TypeError, ValueError):
            return 0

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO platform_connections "
        "(user_id, platform, username, avatar_url, total_games, total_achievements, "
        " total_platinums, total_hours, favorite_game, favorite_cover, last_synced) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW()) "
        "ON CONFLICT (user_id, platform) DO UPDATE SET "
        "  username=EXCLUDED.username, avatar_url=EXCLUDED.avatar_url, "
        "  total_games=EXCLUDED.total_games, total_achievements=EXCLUDED.total_achievements, "
        "  total_platinums=EXCLUDED.total_platinums, total_hours=EXCLUDED.total_hours, "
        "  favorite_game=EXCLUDED.favorite_game, favorite_cover=EXCLUDED.favorite_cover, "
        "  last_synced=NOW()",
        (user_id, platform, username, clamp_text(d.get('avatar'), 500),
         _num(d.get('total_games')), _num(d.get('total_achievements')),
         _num(d.get('total_platinums')), _num(d.get('total_hours')),
         clamp_text(d.get('favorite_game'), 255), clamp_text(d.get('favorite_cover'), 500))
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'status': 'success'})


@hub_bp.route('/api/disconnect/<platform>', methods=['DELETE'])
@login_required
def disconnect_platform(platform):
    user_id = uid()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM platform_connections WHERE user_id=%s AND platform=%s",
                (user_id, platform))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'status': 'success'})


@hub_bp.route('/api/sync/<platform>', methods=['POST'])
@login_required
def sync_platform(platform):
    """Para plataformas manuais apenas atualiza o carimbo; a Steam é
    re-sincronizada pelo endpoint próprio (/api/steam-sync)."""
    user_id = uid()
    if platform not in PLATFORMS:
        return jsonify({'status': 'error', 'message': 'Plataforma inválida.'}), 400
    if platform == 'steam':
        return jsonify({'status': 'success', 'message': 'Use Sincronizar no Progresso para a Steam.'})
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE platform_connections SET last_synced=NOW() WHERE user_id=%s AND platform=%s",
                (user_id, platform))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'status': 'success'})


# ═══════════════════════════════════════════════════════
#  PROGRESSO DE PLATINA (jogos mais perto de 100%)
# ═══════════════════════════════════════════════════════
@hub_bp.route('/api/profile/platinum-progress')
@login_required
def platinum_progress():
    user_id = uid()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT appid, name, pct, achievements FROM user_games "
        "WHERE user_id=%s AND pct > 0 AND pct < 100 "
        "ORDER BY pct DESC LIMIT 5",
        (user_id,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    games = []
    for r in rows:
        achs = r.get('achievements') or []
        restantes = []
        if isinstance(achs, list):
            for a in achs:
                if isinstance(a, dict) and a.get('achieved') != 1:
                    restantes.append(a.get('name') or a.get('apiname') or 'Conquista')
        games.append({
            'appid': r['appid'],
            'name': r['name'],
            'platform': 'steam',
            'pct': round(float(r.get('pct') or 0), 1),
            'cover': COVER_URL.format(appid=r['appid']),
            'remaining_count': len(restantes),
            'remaining': restantes[:3],
        })
    return jsonify({'status': 'success', 'games': games})


# ═══════════════════════════════════════════════════════
#  GRID DE ATIVIDADE (estilo GitHub)
# ═══════════════════════════════════════════════════════
@hub_bp.route('/api/profile/activity')
@login_required
def activity():
    """Conta eventos por dia nos últimos ~12 meses a partir de posts,
    reviews e atualizações de status de jogo (proxy de 'dias ativos')."""
    user_id = uid()
    since = date.today() - timedelta(days=364)
    conn = get_connection()
    cur = conn.cursor()

    counts = {}

    def _acc(rows):
        for r in rows:
            d = r['d']
            if d is None:
                continue
            key = d.isoformat() if hasattr(d, 'isoformat') else str(d)[:10]
            counts[key] = counts.get(key, 0) + int(r.get('c') or 1)

    cur.execute("SELECT created_at::date AS d, COUNT(*) AS c FROM posts "
                "WHERE user_id=%s AND created_at >= %s GROUP BY 1", (user_id, since))
    _acc(cur.fetchall())
    cur.execute("SELECT created_at::date AS d, COUNT(*) AS c FROM reviews "
                "WHERE user_id=%s AND created_at >= %s GROUP BY 1", (user_id, since))
    _acc(cur.fetchall())
    try:
        cur.execute("SELECT updated_at::date AS d, COUNT(*) AS c FROM game_status "
                    "WHERE user_id=%s AND updated_at >= %s GROUP BY 1", (user_id, since))
        _acc(cur.fetchall())
    except Exception:
        pass

    cur.close()
    conn.close()

    days = []
    d = since
    today = date.today()
    while d <= today:
        key = d.isoformat()
        days.append({'date': key, 'count': counts.get(key, 0)})
        d += timedelta(days=1)

    active_days = sum(1 for x in days if x['count'] > 0)
    # Sequência atual (contando de hoje para trás)
    streak = 0
    for x in reversed(days):
        if x['count'] > 0:
            streak += 1
        else:
            break

    return jsonify({'status': 'success', 'days': days,
                    'active_days': active_days, 'current_streak': streak})


# ═══════════════════════════════════════════════════════
#  COMPARAR COM AMIGO
# ═══════════════════════════════════════════════════════
def _aggregate_for(cur, user_id):
    steam = _steam_stats(cur, user_id) or {
        'total_games': 0, 'total_achievements': 0, 'total_platinums': 0, 'total_hours': 0}
    cur.execute("SELECT COALESCE(SUM(total_games),0) g, COALESCE(SUM(total_achievements),0) a, "
                "COALESCE(SUM(total_platinums),0) p, COALESCE(SUM(total_hours),0) h "
                "FROM platform_connections WHERE user_id=%s", (user_id,))
    m = cur.fetchone() or {}
    return {
        'games': steam['total_games'] + int(m.get('g') or 0),
        'achievements': steam['total_achievements'] + int(m.get('a') or 0),
        'platinums': steam['total_platinums'] + int(m.get('p') or 0),
        'hours': steam['total_hours'] + int(m.get('h') or 0),
    }


def _user_card(cur, user_id):
    cur.execute("SELECT display_name, name, avatar_url FROM users WHERE id=%s", (user_id,))
    u = cur.fetchone() or {}
    return {
        'id': user_id,
        'name': u.get('display_name') or u.get('name') or 'Jogador',
        'avatar': u.get('avatar_url') or '/static/img/Game It Logo.svg',
    }


@hub_bp.route('/api/profile/compare/<int:target_id>')
@login_required
def compare(target_id):
    user_id = uid()
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT 1 FROM users WHERE id=%s", (target_id,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'status': 'error', 'message': 'Usuário não encontrado.'}), 404

    me = _user_card(cur, user_id)
    other = _user_card(cur, target_id)
    me_stats = _aggregate_for(cur, user_id)
    other_stats = _aggregate_for(cur, target_id)

    # Jogos em comum (Steam)
    cur.execute(
        "SELECT a.appid, a.name FROM user_games a "
        "JOIN user_games b ON a.appid=b.appid AND b.user_id=%s "
        "WHERE a.user_id=%s ORDER BY a.playtime_forever DESC LIMIT 12",
        (target_id, user_id)
    )
    common = [{'appid': r['appid'], 'name': r['name'],
               'cover': COVER_URL.format(appid=r['appid'])} for r in cur.fetchall()]

    cur.close()
    conn.close()
    return jsonify({
        'status': 'success',
        'me': {**me, 'stats': me_stats},
        'other': {**other, 'stats': other_stats},
        'common_games': common,
    })


# ═══════════════════════════════════════════════════════
#  PERSONAGENS FAVORITOS
# ═══════════════════════════════════════════════════════
@hub_bp.route('/api/profile/characters')
@login_required
def get_characters():
    user_id = uid()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT favorite_characters FROM users WHERE id=%s", (user_id,))
    row = cur.fetchone() or {}
    cur.close()
    conn.close()
    chars = row.get('favorite_characters') or []
    if not isinstance(chars, list):
        chars = []
    return jsonify({'status': 'success', 'characters': chars})


@hub_bp.route('/api/profile/characters', methods=['PUT'])
@login_required
def set_characters():
    user_id = uid()
    d = request.get_json() or {}
    items = d.get('characters') or []
    if not isinstance(items, list):
        return jsonify({'status': 'error', 'message': 'Formato inválido.'}), 400
    clean = []
    for it in items[:4]:
        if not isinstance(it, dict):
            continue
        name = clamp_text(it.get('name'), 60)
        if not name:
            continue
        clean.append({
            'name': name,
            'game': clamp_text(it.get('game'), 120) or '',
            'appid': clamp_text(it.get('appid'), 20) or '',
        })
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE users SET favorite_characters=%s, updated_at=NOW() WHERE id=%s",
                (Json(clean), user_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'status': 'success', 'characters': clean})


# ═══════════════════════════════════════════════════════
#  BADGES DO GAME IT (gamificação da plataforma)
# ═══════════════════════════════════════════════════════
BADGES = [
    {'id': 'first_review', 'label': 'Primeira Avaliação', 'icon': 'fa-solid fa-star',      'desc': 'Publicou sua primeira avaliação.'},
    {'id': 'critic',       'label': 'Crítico',            'icon': 'fa-solid fa-pen-nib',   'desc': '10 avaliações publicadas.'},
    {'id': 'collector',    'label': 'Colecionador',       'icon': 'fa-solid fa-layer-group','desc': '50 jogos na biblioteca.'},
    {'id': 'platinum',     'label': 'Platinador',         'icon': 'fa-solid fa-trophy',    'desc': 'Platinou pelo menos 1 jogo.'},
    {'id': 'social',       'label': 'Social',             'icon': 'fa-solid fa-comments',  'desc': 'Publicou seu primeiro post.'},
    {'id': 'lister',       'label': 'Curador',            'icon': 'fa-solid fa-list-check','desc': 'Criou sua primeira lista.'},
    {'id': 'connected',    'label': 'Multiplataforma',    'icon': 'fa-solid fa-plug',      'desc': 'Conectou 2+ plataformas.'},
    {'id': 'veteran',      'label': 'Veterano',           'icon': 'fa-solid fa-medal',     'desc': '500+ horas jogadas.'},
]


@hub_bp.route('/api/profile/badges')
@login_required
def badges():
    user_id = uid()
    conn = get_connection()
    cur = conn.cursor()

    def _count(sql):
        cur.execute(sql, (user_id,))
        r = cur.fetchone()
        return int((r or {}).get('c') or 0)

    reviews = _count("SELECT COUNT(*) c FROM reviews WHERE user_id=%s")
    posts = _count("SELECT COUNT(*) c FROM posts WHERE user_id=%s")
    lists = _count("SELECT COUNT(*) c FROM game_lists WHERE user_id=%s")
    games = _count("SELECT COUNT(*) c FROM user_games WHERE user_id=%s")
    platinums = _count("SELECT COUNT(*) c FROM user_games WHERE user_id=%s AND (pct>=100 OR status='100%')")
    conns_extra = _count("SELECT COUNT(*) c FROM platform_connections WHERE user_id=%s")
    cur.execute("SELECT COALESCE(SUM(playtime_forever),0) c FROM user_games WHERE user_id=%s", (user_id,))
    hours = round(int((cur.fetchone() or {}).get('c') or 0) / 60)
    steam_connected = 1 if games > 0 else 0

    earned = {
        'first_review': reviews >= 1,
        'critic': reviews >= 10,
        'collector': games >= 50,
        'platinum': platinums >= 1,
        'social': posts >= 1,
        'lister': lists >= 1,
        'connected': (conns_extra + steam_connected) >= 2,
        'veteran': hours >= 500,
    }
    cur.close()
    conn.close()

    result = [{**b, 'earned': bool(earned.get(b['id']))} for b in BADGES]
    total = sum(1 for b in result if b['earned'])
    return jsonify({'status': 'success', 'badges': result, 'earned': total, 'total': len(BADGES)})
