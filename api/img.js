// Proxy de imagens do Spotify (capas e fotos). Só para permitir que a imagem compartilhável
// seja desenhada no navegador sem bloqueio de CORS. Aceita apenas domínios do Spotify.
module.exports = async (req, res) => {
  const u = String((req.query && req.query.u) || '');
  let url;
  try { url = new URL(u); } catch (e) { res.statusCode = 400; res.end('url inválida'); return; }
  const okHost = (h) => /(^|\.)scdn\.co$/.test(h) || /(^|\.)spotifycdn\.com$/.test(h);
  if (url.protocol !== 'https:' || !okHost(url.hostname)) { res.statusCode = 403; res.end('domínio não permitido'); return; }
  try {
    const r = await fetch(url.href);
    if (!r.ok) { res.statusCode = 502; res.end('falha ao buscar a imagem'); return; }
    const type = r.headers.get('content-type') || 'image/jpeg';
    if (!/^image\//.test(type)) { res.statusCode = 415; res.end('não é imagem'); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 3 * 1024 * 1024) { res.statusCode = 413; res.end('imagem grande demais'); return; }
    res.statusCode = 200;
    res.setHeader('Content-Type', type);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, immutable');
    res.end(buf);
  } catch (e) { res.statusCode = 502; res.end('erro'); }
};
