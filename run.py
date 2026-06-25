import sys
import os
import webbrowser
import threading

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from app import app, init_app

if __name__ == '__main__':
    init_app()
    # Abre o navegador automaticamente após 1 segundo
    threading.Timer(1, lambda: webbrowser.open('http://127.0.0.1:5000')).start()
    app.run(debug=True, port=5000)
