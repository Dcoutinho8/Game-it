// Utilidades de formatação reaproveitadas pelas páginas.

export function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export const DEFAULT_IMG = '/static/img/Game It Logo.svg';

// Capa vertical da Steam (com fallback para header)
export function steamCover(appid) {
  return `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/library_600x900.jpg`;
}
export function steamHeader(appid) {
  return `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/header.jpg`;
}
export function steamCapsule(appid) {
  return `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/capsule_sm_120.jpg`;
}

// Converte um Markdown simples (títulos, listas, negrito) em HTML — usado no chat.
export function renderMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  html = html.replace(/^### (.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // listas
  html = html.replace(/(?:^|\n)- (.*)/g, '\n<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  // parágrafos / quebras
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = html.replace(/\n/g, '<br/>');
  return `<p>${html}</p>`;
}

export function tempoRelativo(iso) {
  if (!iso) return '';
  const quando = new Date(iso);
  const diffMin = Math.floor((Date.now() - quando.getTime()) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `há ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}
