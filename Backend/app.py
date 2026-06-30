import os
import sys
from datetime import timedelta

# Diretório real deste arquivo (.../Backend) e a raiz do projeto.
# Usar o caminho real evita depender de maiúsculas/minúsculas no nome da pasta.
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BACKEND_DIR)
sys.path.insert(0, ROOT)
sys.path.insert(0, BACKEND_DIR)

from flask import Flask, jsonify, send_from_directory
from database import init_db
from security import load_secret_key
from routes.steam  import steam_bp
from routes.gemini import gemini_bp
from routes.notes  import notes_bp
from routes.auth   import auth_bp
from routes.social import social_bp

# Pasta com o build da SPA React (gerado por `npm run build` em web/)
WEB_DIST = os.path.join(ROOT, 'web', 'dist')

app = Flask(
    __name__,
    static_folder=os.path.join(ROOT,  'Frontend', 'static')
)

# ── CORS (apenas em desenvolvimento, para a SPA na :5173) ──
# Em produção a SPA é servida pelo próprio Flask (web/dist), mesma origem.
try:
    from flask_cors import CORS
    _dev_origins = os.getenv(
        'CORS_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173'
    ).split(',')
    CORS(app, supports_credentials=True, origins=[o.strip() for o in _dev_origins if o.strip()])
except ImportError:
    pass

# ── Segurança ───────────────────────────────────────────
app.secret_key = load_secret_key(ROOT)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,                                   # JS não acessa o cookie
    SESSION_COOKIE_SAMESITE='Lax',                                  # mitiga CSRF
    SESSION_COOKIE_SECURE=os.getenv('COOKIE_SECURE', '0') == '1',   # HTTPS em produção
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
    MAX_CONTENT_LENGTH=5 * 1024 * 1024,                             # uploads até 5 MB
)


@app.after_request
def security_headers(resp):
    """Cabeçalhos de segurança aplicados a todas as respostas."""
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    resp.headers['X-Frame-Options'] = 'SAMEORIGIN'
    resp.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return resp


app.register_blueprint(auth_bp)
app.register_blueprint(steam_bp)
app.register_blueprint(gemini_bp)
app.register_blueprint(notes_bp)
app.register_blueprint(social_bp)


# ── Servir a SPA React (web/dist) ────────────────────────
# Quando o build existe, o Flask entrega a SPA e o roteamento client-side.
# Sem o build, responde um JSON simples (modo API pura / use `npm run dev`).
@app.route('/')
@app.route('/<path:path>')
def serve_spa(path=''):
    # Assets buildados pelo Vite (web/dist/assets, vite.svg, etc.)
    full = os.path.join(WEB_DIST, path)
    if path and os.path.isfile(full):
        return send_from_directory(WEB_DIST, path)

    index = os.path.join(WEB_DIST, 'index.html')
    if os.path.isfile(index):
        return send_from_directory(WEB_DIST, 'index.html')

    return jsonify({
        'status': 'ok',
        'service': 'Game It API',
        'message': 'SPA não buildada. Rode `npm run dev` em web/ ou `npm run build`.'
    })


def init_app():
    init_db()
