import os
import requests
from flask import Blueprint, jsonify

steam_bp = Blueprint('steam', __name__)

STEAM_API = 'https://api.steampowered.com'


def get_key():
    return os.getenv('STEAM_API_KEY')


def get_steamid():
    return os.getenv('STEAM_ID')


# ── Rota principal usada pelo frontend ──────────────────
@steam_bp.route('/api/steam-data')
def steam_data():
    key     = get_key()
    steamid = get_steamid()

    if not key or not steamid:
        return jsonify({'status': 'error', 'message': 'STEAM_API_KEY ou STEAM_ID não configurado no .env'})

    # 1. Busca lista de jogos
    url_games = (
        f'{STEAM_API}/IPlayerService/GetOwnedGames/v1/'
        f'?key={key}&steamid={steamid}'
        f'&include_appinfo=true&include_played_free_games=true'
    )
    try:
        r     = requests.get(url_games, timeout=10)
        games = r.json().get('response', {}).get('games', [])
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

    resultado = []

    for g in games:
        appid = g.get('appid')
        name  = g.get('name', 'Jogo Desconhecido')

        # Só busca conquistas se o jogo tem achievements
        if not g.get('has_community_visible_stats'):
            resultado.append({
                'appid':        appid,
                'name':         name,
                'status':       'Sem Conquistas',
                'pct':          0.0,
                'achievements': []
            })
            continue

        # 2. Busca conquistas do jogo
        url_ach = (
            f'{STEAM_API}/ISteamUserStats/GetPlayerAchievements/v1/'
            f'?key={key}&steamid={steamid}&appid={appid}&l=portuguese'
        )
        try:
            ra   = requests.get(url_ach, timeout=8)
            stats = ra.json().get('playerstats', {})
            achs  = stats.get('achievements', [])

            if not achs:
                status = 'Sem Conquistas'
                pct    = 0.0
            else:
                total     = len(achs)
                desbloq   = sum(1 for a in achs if a.get('achieved') == 1)
                pct       = (desbloq / total * 100) if total > 0 else 0.0

                if pct >= 100:
                    status = '100%'
                elif pct > 0:
                    status = 'Em Progresso'
                else:
                    status = 'Sem Conquistas'

        except Exception:
            achs   = []
            status = 'Sem Conquistas'
            pct    = 0.0

        resultado.append({
            'appid':        appid,
            'name':         name,
            'status':       status,
            'pct':          round(pct, 2),
            'achievements': achs
        })

    # Ordena por progresso decrescente
    resultado.sort(key=lambda x: x['pct'], reverse=True)

    return jsonify({'status': 'success', 'games': resultado})


# ── Rotas auxiliares ────────────────────────────────────
@steam_bp.route('/api/steam/user')
def get_user():
    key     = get_key()
    steamid = get_steamid()
    url     = f'{STEAM_API}/ISteamUser/GetPlayerSummaries/v2/?key={key}&steamids={steamid}'
    r       = requests.get(url, timeout=10)
    players = r.json().get('response', {}).get('players', [])
    if not players:
        return jsonify({'status': 'error', 'message': 'Usuário não encontrado'})
    return jsonify({'status': 'success', 'player': players[0]})
