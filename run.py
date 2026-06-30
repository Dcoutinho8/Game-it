import sys
import os
import webbrowser
import threading

ROOT = os.path.dirname(os.path.abspath(__file__))

# Localiza a pasta do backend (aceita 'Backend' ou 'backend', em qualquer SO).
BACKEND_DIR = next(
    (os.path.join(ROOT, name) for name in ('Backend', 'backend')
     if os.path.isfile(os.path.join(ROOT, name, 'app.py'))),
    os.path.join(ROOT, 'Backend')
)
sys.path.insert(0, BACKEND_DIR)

from app import app, init_app

WEB_DIST = os.path.join(ROOT, 'web', 'dist')

if __name__ == '__main__':
    try:
        init_app()
    except Exception as e:
        print('⚠ Não foi possível inicializar o banco de dados.')
        print(f'  {type(e).__name__}: {e}')
        print('  Configure DATABASE_URL no arquivo .env (veja .env.example).')
        print('  O servidor vai subir, mas a API falhará até o banco estar acessível.\n')

    # debug/reloader só quando explicitamente habilitado (evita expor o debugger)
    debug = os.getenv('FLASK_DEBUG', '0') == '1'

    spa_built = os.path.isfile(os.path.join(WEB_DIST, 'index.html'))

    if spa_built:
        # SPA buildada: o Flask serve tudo em http://127.0.0.1:5000
        print('▶ Game It rodando em http://127.0.0.1:5000 (SPA + API)')
        threading.Timer(1, lambda: webbrowser.open('http://127.0.0.1:5000')).start()
    else:
        # Sem build: API no :5000. Para a interface React, rode o Vite:
        print('▶ API Game It em http://127.0.0.1:5000')
        print('  Interface React: em outro terminal, dentro de web/, rode:')
        print('      npm install   (apenas na primeira vez)')
        print('      npm run dev   → abre http://localhost:5173')
        print('  (ou gere o build com `npm run build` para o Flask servir tudo no :5000)')

    app.run(debug=debug, port=5000, threaded=True)
