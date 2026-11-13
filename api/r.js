// Página de uma avaliação compartilhada: devolve o próprio site com as tags de prévia
// (imagem do álbum, título e texto) que WhatsApp, Telegram, Discord etc. mostram ao colar o link.
// Usa só a função pública shared_preview (sem segredos).
const fs = require('fs');
const path = require('path');

const SB_URL = 'https://dwffsxtyielemjfbltlq.supabase.co';
const SB_KEY = 'sb_publishable_1XOdMmR3Xqz1qtUNEaYqbA_Wvq2Y8LZ';
let TEMPLATE = null;

function loadTemplate() {
  if (TEMPLATE) return TEMPLATE;
  const files = [path.join(process.cwd(), 'index.html'), path.join(__dirname, '..', 'index.html')];
  for (const f of files) {
    try { TEMPLATE = fs.readFileSync(f, 'utf8'); return TEMPLATE; } catch (e) { /* tenta o próximo */ }
  }
  return null;
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function metaTags({ title, desc, image, url }) {
  return [
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="MySpotList">',
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    '<meta name="twitter:card" content="summary">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="description" content="${esc(desc)}">`,
  ].join('\n');
}

module.exports = async (req, res) => {
  const token = String((req.query && req.query.token) || '').toLowerCase();
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const origin = `${proto}://${host}`;
  let html = loadTemplate();
  if (!html) {
    res.statusCode = 302;
    res.setHeader('Location', '/#/r/' + encodeURIComponent(token));
    res.end();
    return;
  }

  let prev = null;
  if (/^[0-9a-f-]{36}$/.test(token)) {
    try {
      const r = await fetch(SB_URL + '/rest/v1/rpc/shared_preview', {
        method: 'POST',
        headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (r.ok) { const j = await r.json(); prev = (j && j[0]) || null; }
    } catch (e) { /* sem prévia: usa o texto padrão */ }
  }

  let title, desc, image, url;
  if (prev) {
    const who = prev.display_name || prev.username || 'Alguém';
    const score = prev.score != null ? String(Number(prev.score)).replace('.', ',') : '';
    const what = prev.kind === 'track' ? 'à música' : 'ao álbum';
    title = `${prev.title} · ${prev.artist}`;
    desc = (score ? `${who} deu nota ${score} ${what} no MySpotList.` : `${who} avaliou ${what === 'à música' ? 'uma música' : 'um álbum'} no MySpotList.`) +
      ' Entre para ver a avaliação completa.';
    image = prev.cover || origin + '/app-icon.png';
    url = `${origin}/r/${token}`;
  } else {
    title = 'MySpotList — Diário pessoal de música';
    desc = 'Avalie álbuns faixa por faixa, compare com seus amigos e compartilhe suas reviews.';
    image = origin + '/app-icon.png';
    url = origin + '/';
  }

  html = html
    .replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(title) + '</title>')
    .replace(/<meta (property="og:|name="twitter:|name="description")[^>]*>\s*/g, '')
    .replace('<head>', '<head>\n<base href="/">\n' + metaTags({ title, desc, image, url }));

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.end(html);
};
