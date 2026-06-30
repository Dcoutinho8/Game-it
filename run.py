import sys
import os
import re
import shutil
import subprocess
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

WEB_DIR = os.path.join(ROOT, 'web')
WEB_DIST = os.path.join(WEB_DIR, 'dist')


def _find_npm():
    """Encontra o npm no PATH ou em instalações portáteis comuns."""
    npm = shutil.which('npm')
    if npm:
        return npm
    # Node portátil instalado em %LOCALAPPDATA%\nodejs-portable
    base = os.path.join(os.getenv('LOCALAPPDATA', ''), 'nodejs-portable')
    if os.path.isdir(base):
        for name in os.listdir(base):
            cand = os.path.join(base, name, 'npm.cmd')
            if os.path.isfile(cand):
                return cand
    return None


def _dist_is_stale():
    """True se o build (dist) está ausente, incompleto ou mais antigo que os fontes.
    Evita servir um dist desatualizado ou corrompido (ex.: sync parcial do OneDrive)."""
    dist_index = os.path.join(WEB_DIST, 'index.html')
    if not os.path.isfile(dist_index):
        return True

    # Integridade: todos os assets referenciados no index.html devem existir.
    try:
        with open(dist_index, 'r', encoding='utf-8') as fh:
            html = fh.read()
        for ref in re.findall(r'(?:href|src)="(/assets/[^"]+)"', html):
            asset = os.path.join(WEB_DIST, ref.lstrip('/').replace('/', os.sep))
            if not os.path.isfile(asset):
                return True  # asset faltando → build incompleto
    except OSError:
        return True

    dist_mtime = os.path.getmtime(dist_index)

    # Arquivos/pastas cujo conteúdo afeta o build.
    fontes = [
        os.path.join(WEB_DIR, 'index.html'),
        os.path.join(WEB_DIR, 'package.json'),
        os.path.join(WEB_DIR, 'vite.config.js'),
        os.path.join(WEB_DIR, 'src'),
    ]
    for caminho in fontes:
        if os.path.isfile(caminho):
            if os.path.getmtime(caminho) > dist_mtime:
                return True
        elif os.path.isdir(caminho):
            for raiz, _dirs, arquivos in os.walk(caminho):
                for nome in arquivos:
                    if os.path.getmtime(os.path.join(raiz, nome)) > dist_mtime:
                        return True
    return False


def _build_spa():
    """Gera o build da SPA React (npm install + npm run build) se possível.
    Retorna True se o build existe ao final.
    """
    if not os.path.isdir(WEB_DIR):
        return False

    # Build atual já existe e está atualizado? Nada a fazer.
    if not _dist_is_stale():
        return True

    npm = _find_npm()
    if not npm:
        print('⚠ Node.js/npm não encontrado — não foi possível buildar a interface React.')
        print('  Instale o Node.js (https://nodejs.org) e rode em web/: npm install && npm run build')
        # Se há um dist (mesmo que antigo), ainda dá pra servir algo.
        return os.path.isfile(os.path.join(WEB_DIST, 'index.html'))

    npm_dir = os.path.dirname(npm)
    env = dict(os.environ, PATH=npm_dir + os.pathsep + os.environ.get('PATH', ''))

    try:
        if not os.path.isdir(os.path.join(WEB_DIR, 'node_modules')):
            print('▶ Instalando dependências da interface (npm install)... isso pode demorar.')
            subprocess.run([npm, 'install'], cwd=WEB_DIR, env=env, shell=True, check=True)
        print('▶ Gerando build da interface React (npm run build)...')
        subprocess.run([npm, 'run', 'build'], cwd=WEB_DIR, env=env, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f'⚠ Falha ao buildar a interface React: {e}')
        return os.path.isfile(os.path.join(WEB_DIST, 'index.html'))

    return os.path.isfile(os.path.join(WEB_DIST, 'index.html'))


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

    # Tenta garantir o build da SPA (gera automaticamente se faltar e houver Node).
    spa_built = _build_spa()

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
