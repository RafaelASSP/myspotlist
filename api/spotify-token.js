// Função serverless da Vercel: guarda o Client ID/Secret no servidor (variáveis de ambiente)
// e entrega ao site apenas um token temporário de leitura do catálogo.
let cache = { token: null, exp: 0 };

module.exports = async (req, res) => {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) {
    res.status(503).json({ error: 'not_configured' });
    return;
  }
  try {
    if (!cache.token || Date.now() > cache.exp - 60000) {
      const r = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
        },
        body: 'grant_type=client_credentials',
      });
      const d = await r.json();
      if (!d.access_token) {
        res.status(502).json({ error: 'spotify_auth_failed' });
        return;
      }
      cache = { token: d.access_token, exp: Date.now() + d.expires_in * 1000 };
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      access_token: cache.token,
      expires_in: Math.max(60, Math.floor((cache.exp - Date.now()) / 1000)),
    });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
};
