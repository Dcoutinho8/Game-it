# Game It — Frontend React (SPA)

Frontend moderno em **Vite + React** que consome a API Flask existente.

## Como rodar em desenvolvimento

São necessários **dois processos** rodando ao mesmo tempo:

### 1. Backend Flask (porta 5000)
Na raiz do projeto:
```bash
python run.py
```

### 2. Frontend React (porta 5173)
Dentro da pasta `web/`:
```bash
npm install      # apenas na primeira vez
npm run dev
```

Abra **http://localhost:5173**.

O Vite faz proxy de `/api` e `/static` para o Flask em `http://127.0.0.1:5000`,
mantendo o cookie de sessão funcionando sem precisar de CORS.

## Build de produção
```bash
npm run build    # gera web/dist/
npm run preview  # testa o build localmente
```

## Estrutura
```
web/
  index.html
  vite.config.js
  src/
    main.jsx            # bootstrap (Router + Providers)
    App.jsx             # rotas
    lib/
      api.js            # cliente HTTP (cookie de sessão)
      format.js         # helpers (markdown, imagens Steam, escape)
    context/
      AuthContext.jsx   # usuário logado
      ThemeContext.jsx  # tema claro/escuro
    components/
      Navbar.jsx
      ProtectedRoute.jsx
      GuideModal.jsx     # guia de conquistas (IA) + troféus + notas
    pages/
      Login.jsx / Login.css
      Profile.jsx        # /perfil
      Progresso.jsx      # /progresso
      Game.jsx           # /jogo/:appid
      Settings.jsx       # /configuracoes
    styles/
      extra.css          # estilos complementares da SPA
```

## Notas
- A SPA reaproveita o `style.css` servido pelo Flask (via proxy `/static`).
- Em produção, sirva `web/dist` num host estático (Vercel/Netlify) apontando a API
  para o backend, **ou** copie `web/dist` para ser servido pelo próprio Flask.
