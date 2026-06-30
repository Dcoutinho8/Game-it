/**
 * Cliente HTTP central do Game It.
 * Usa fetch com credenciais (cookie de sessão do Flask) e centraliza
 * o tratamento de erros e respostas JSON.
 */

const BASE = ''; // mesmo host (proxy em dev, mesma origem em prod)

// Timeout padrão por requisição (ms). Evita "carregar pra sempre" se o
// backend travar (ex.: banco inacessível, Steam lenta).
const TIMEOUT_MS = 30000;

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
  };

  if (body !== undefined) {
    if (isForm) {
      opts.body = body; // FormData — não setar Content-Type
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  opts.signal = ctrl.signal;

  const t0 = performance.now();
  console.log(`[api] → ${method} ${path}`);

  let res;
  try {
    res = await fetch(BASE + path, opts);
  } catch (err) {
    clearTimeout(timer);
    const aborted = err && err.name === 'AbortError';
    const msg = aborted
      ? `Tempo esgotado (${TIMEOUT_MS / 1000}s). O servidor não respondeu — verifique se o backend está rodando e se o banco de dados está acessível.`
      : `Falha de rede: ${err && err.message ? err.message : err}`;
    console.error(`[api] ✗ ${method} ${path}`, msg);
    return { ok: false, status: 0, data: { status: 'error', message: msg } };
  }
  clearTimeout(timer);

  const dt = Math.round(performance.now() - t0);
  console.log(`[api] ← ${method} ${path} ${res.status} (${dt}ms)`);

  // Sessão expirada → redireciona ao login (exceto se já for a checagem /me)
  if (res.status === 401 && !path.includes('/auth/me')) {
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { status: 'error', message: text || 'Resposta inválida do servidor.' };
  }

  return { ok: res.ok, status: res.status, data };
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData, isForm: true }),
};
