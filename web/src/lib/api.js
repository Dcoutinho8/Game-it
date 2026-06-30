/**
 * Cliente HTTP central do Game It.
 * Usa fetch com credenciais (cookie de sessão do Flask) e centraliza
 * o tratamento de erros e respostas JSON.
 */

const BASE = ''; // mesmo host (proxy em dev, mesma origem em prod)

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

  const res = await fetch(BASE + path, opts);

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
