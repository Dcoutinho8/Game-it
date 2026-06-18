import os
import time
from flask import Blueprint, jsonify, request
from google import genai
from database import get_connection

gemini_bp = Blueprint('gemini', __name__)

_ultima_chamada  = 0.0
INTERVALO_MINIMO = 20.0

MODELOS_FALLBACK = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
]

def _get_cache(appid):
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT html_content FROM guide_cache WHERE appid = %s", (appid,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row['html_content'] if row else None

def _set_cache(appid, game_name, html):
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute(
        """
        INSERT INTO guide_cache (appid, game_name, html_content, updated_at)
        VALUES (%s, %s, %s, NOW())
        ON CONFLICT (appid) DO UPDATE
            SET html_content = EXCLUDED.html_content,
                updated_at   = NOW()
        """,
        (appid, game_name, html)
    )
    conn.commit()
    cur.close()
    conn.close()

@gemini_bp.route('/api/analisar-jogo', methods=['POST'])
def analisar_jogo():
    global _ultima_chamada

    data  = request.get_json()
    appid = str(data.get('appid'))
    nome  = data.get('nome', 'Jogo')
    regen = request.args.get('regen', '0')

    if regen != '1':
        cached = _get_cache(appid)
        if cached:
            return jsonify({'status': 'success', 'html': cached, 'from_cache': True})

    agora  = time.time()
    espera = INTERVALO_MINIMO - (agora - _ultima_chamada)
    if espera > 0:
        time.sleep(espera)

    prompt = f"""
Voce e especialista em conquistas de jogos.
Crie um guia HTML detalhado para 100% as conquistas de: {nome}.

Secoes obrigatorias:
- Resumo (dificuldade 1-10, tempo estimado)
- Roteiro Principal (ordem recomendada)
- Trofeus Perdiveis
- Colecionaveis
- Trofeus de Grind
- Dicas Gerais

Use Tailwind CSS. Fundo #111827, destaque #6366F1, texto #D9D9D9.
Retorne SOMENTE HTML limpo. Idioma: Portugues do Brasil.
"""

    client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

    for modelo in MODELOS_FALLBACK:
        for tentativa in range(2):
            try:
                _ultima_chamada = time.time()
                r    = client.models.generate_content(model=modelo, contents=prompt)
                html = r.text.strip()

                if html.startswith('```'):
                    html = html.split('\n', 1)[-1].rsplit('```', 1)[0].strip()

                _set_cache(appid, nome, html)
                print(f'[Gemini] Sucesso com: {modelo}')
                return jsonify({'status': 'success', 'html': html, 'from_cache': False})

            except Exception as e:
                msg = str(e)
                print(f'[Gemini] Erro ({modelo}, tentativa {tentativa+1}): {msg[:120]}')
                if '429' in msg:
                    if tentativa == 0:
                        time.sleep(15)
                    else:
                        break
                else:
                    return jsonify({'status': 'error', 'message': msg})

    return jsonify({'status': 'error', 'message': 'Cota esgotada. Aguarde 1 minuto e tente novamente.'})
