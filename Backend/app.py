import os
import webbrowser
from flask import Flask, render_template
from flask_cors import CORS
from dotenv import load_dotenv

CURRENT_FILE = os.path.abspath(__file__)
BACKEND_DIR  = os.path.dirname(CURRENT_FILE)
ROOT_DIR     = os.path.dirname(BACKEND_DIR)

load_dotenv(os.path.join(ROOT_DIR, '.env'))

TEMPLATE_DIR = os.path.join(ROOT_DIR, 'Frontend', 'template')
STATIC_DIR   = os.path.join(ROOT_DIR, 'Frontend', 'static')

app = Flask(
    __name__,
    template_folder=TEMPLATE_DIR,
    static_folder=STATIC_DIR,
    static_url_path='/static'
)

CORS(app)

from routes.steam  import steam_bp
from routes.gemini import gemini_bp
from routes.notes  import notes_bp

app.register_blueprint(steam_bp)
app.register_blueprint(gemini_bp)
app.register_blueprint(notes_bp)

@app.route('/')
def home():
    return render_template('index.html')

def init_app():
    from database import init_db
    init_db()
    print('Iniciando em http://127.0.0.1:5000')
    webbrowser.open('http://127.0.0.1:5000')
    app.run(debug=True, port=5000, use_reloader=False)

if __name__ == '__main__':
    init_app()
