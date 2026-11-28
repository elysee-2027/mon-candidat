// Compteur global de simulations : Cloudflare Worker + base D1.
// GET  -> {"total": n}      POST -> incrémente de 1 puis {"total": n}
// Aucune donnée personnelle : un seul nombre est stocké, aucune adresse IP n'est écrite.
// Variables : ALLOWED_ORIGIN (adresses du site séparées par des virgules, ex. https://elysee-2027.github.io).
// Liaisons : DB (D1) ; LIMITER (facultative, limitation de débit native de Cloudflare).

export default {
  async fetch(req, env) {
    const origins = (env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
    const o = req.headers.get('origin') || '';
    const cors = origins.includes(o)
      ? { 'Access-Control-Allow-Origin': o, Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '86400' }
      : {};
    const send = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors } });

    if (!origins.length) return send({ error: 'ALLOWED_ORIGIN non configuré' }, 500);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (new URL(req.url).pathname !== '/counter' && new URL(req.url).pathname !== '/') return send({ error: 'introuvable' }, 404);
    if (req.method !== 'GET' && req.method !== 'POST') return send({ error: 'méthode non autorisée' }, 405);

    if (req.method === 'POST') {
      if (!origins.includes(o)) return send({ error: 'origine non autorisée' }, 403);
      if (env.LIMITER) {
        const { success } = await env.LIMITER.limit({ key: req.headers.get('cf-connecting-ip') || 'x' });
        if (!success) return send({ error: 'trop de requêtes' }, 429);
      }
      await env.DB.prepare('UPDATE counter SET n = n + 1 WHERE k = ?').bind('simulations').run();
    }
    const row = await env.DB.prepare('SELECT n FROM counter WHERE k = ?').bind('simulations').first();
    return send({ total: row ? row.n : 0 });
  },
};
