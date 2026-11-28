// Serveur d'Élysée 2027 pour NAS : statistiques anonymes + formulaire de contact.
// Aucune dépendance : Node 22 (module node:sqlite intégré).
//
// Ce que le service conserve :
//   - des COMPTEURS (question × réponse, série atteinte, nombre d'envois par jour) ;
//   - les messages du formulaire de contact (objet, texte, adresse e-mail si donnée), supprimés
//     automatiquement après RETENTION_DAYS jours.
// Ce qu'il ne conserve JAMAIS : adresses IP, identifiants, en-têtes, journaux de requêtes.
// Pour limiter les abus, l'adresse du client est lue UNIQUEMENT pour calculer une empreinte salée
// gardée en mémoire vive (jamais écrite sur disque), vidée toutes les heures ; le sel change chaque jour.

import http from 'node:http';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const ANSWERS = new Set(['2', '1', '0', '-1', '-2', 'na']);
const QID = /^q\d{1,3}$/;
const MAX_BODY = 8192;
const MAX_ITEMS = 200;
const OBJETS = ['Signaler une erreur sur une position', "Droit de réponse d'un candidat ou de son équipe", 'Proposer une question ou une source', 'Autre'];
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,120}\.[^\s@]{2,40}$/;

export function validateHit(body) {
  if (!body || body.v !== 1) return null;
  const items = Array.isArray(body.items) ? body.items : [];
  const events = Array.isArray(body.events) ? body.events : [];
  if (items.length > MAX_ITEMS || events.length > 20) return null;
  const keys = [];
  for (const it of items) {
    if (!it || typeof it.q !== 'string' || typeof it.a !== 'string' || !QID.test(it.q) || !ANSWERS.has(it.a)) return null;
    keys.push(`a:${it.q}:${it.a}`);
  }
  for (const ev of events) {
    if (!ev || ev.e !== 'serie' || !Number.isInteger(ev.k) || ev.k < 1 || ev.k > 40) return null;
    keys.push(`s:${ev.k}`);
  }
  if (!keys.length) return null;
  keys.push(`d:${new Date().toISOString().slice(0, 10)}`);
  return keys;
}

export function validateContact(b) {
  if (!b || typeof b !== 'object') return null;
  const objet = String(b.objet ?? '').slice(0, 120);
  const question = String(b.question ?? '').slice(0, 300);
  const message = String(b.message ?? '').trim();
  const email = String(b.email ?? '').trim();
  if (!OBJETS.includes(objet)) return null;
  if (message.length < 10 || message.length > 3000) return null;
  if (email && (email.length > 200 || !EMAIL.test(email))) return null;
  return { objet, question, message, email: email || null };
}

export function createApp(env = {}, deps = {}) {
  const retentionDays = Number(env.RETENTION_DAYS || 365);
  const ipHeader = (env.IP_HEADER || 'cf-connecting-ip').toLowerCase();
  const origins = (env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
  const adminToken = env.ADMIN_TOKEN || '';
  const notify = deps.notify || (async (title) => {
    if (!env.NTFY_URL) return;
    try { await fetch(env.NTFY_URL, { method: 'POST', headers: { Title: 'Élysée 2027', Priority: 'default' }, body: title }); } catch { /* notification facultative */ }
  });

  const db = new DatabaseSync(env.DB_PATH || ':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS counters (k TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, objet TEXT NOT NULL, question TEXT, message TEXT NOT NULL, email TEXT, lu INTEGER NOT NULL DEFAULT 0);`);
  const up = db.prepare('INSERT INTO counters (k, n) VALUES (?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1');
  const addMsg = db.prepare('INSERT INTO messages (day, objet, question, message, email) VALUES (?, ?, ?, ?, ?)');

  function purge() {
    const limit = new Date(Date.now() - retentionDays * 864e5).toISOString().slice(0, 10);
    return db.prepare('DELETE FROM messages WHERE day < ?').run(limit).changes;
  }
  purge();

  // Limitation des abus : empreinte salée de l'adresse, en mémoire vive uniquement.
  let salt = crypto.randomBytes(16);
  const buckets = new Map();
  const timers = [
    setInterval(() => buckets.clear(), 3600e3),
    setInterval(() => { salt = crypto.randomBytes(16); buckets.clear(); purge(); }, 864e5),
  ];
  timers.forEach((t) => t.unref?.());
  function limited(req, name, max, windowMs) {
    const ip = req.headers.get(ipHeader) || 'inconnue';
    const key = name + ':' + crypto.createHash('sha256').update(salt).update(ip).digest('hex').slice(0, 20);
    const now = Date.now(), arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) { buckets.set(key, arr); return true; }
    arr.push(now); buckets.set(key, arr); return false;
  }

  const cors = (req) => {
    const o = req.headers.get('origin') || '';
    return origins.includes(o) ? { 'Access-Control-Allow-Origin': o, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Max-Age': '86400' } : {};
  };
  const send = (obj, status, h) => new Response(obj === null ? null : JSON.stringify(obj), { status, headers: { ...(obj === null ? {} : { 'Content-Type': 'application/json' }), 'Cache-Control': 'no-store', ...h } });
  const safeEq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  const isAdmin = (req) => adminToken.length >= 24 && safeEq(req.headers.get('authorization') || '', 'Bearer ' + adminToken);
  const originOk = (req) => !origins.length || origins.includes(req.headers.get('origin') || '');

  async function readJson(req) {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return { error: 413 };
    try { return { body: JSON.parse(raw) }; } catch { return { error: 400 }; }
  }

  async function fetchHandler(req) {
    const url = new URL(req.url), h = cors(req), { pathname: path } = url;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method === 'GET' && path === '/health') return new Response('ok', { status: 200 });

    // Compteur global de simulations : GET -> {total}, POST -> +1 puis {total} (format attendu par COUNTER_URL du site).
    if (path === '/counter' && (req.method === 'GET' || req.method === 'POST')) {
      if (req.method === 'POST') {
        if (!originOk(req)) return send({ error: 'origine non autorisée' }, 403, h);
        if (limited(req, 'counter', 10, 3600e3)) return send({ error: 'trop de requêtes' }, 429, h);
        up.run('simulations');
      }
      const row = db.prepare('SELECT n FROM counters WHERE k = ?').get('simulations');
      return send({ total: row ? row.n : 0 }, 200, h);
    }

    if (req.method === 'POST' && path === '/hit') {
      if (!originOk(req)) return send({ error: 'origine non autorisée' }, 403, h);
      if (limited(req, 'hit', 60, 60e3)) return send({ error: 'trop de requêtes' }, 429, h);
      const r = await readJson(req); if (r.error) return send({ error: 'requête invalide' }, r.error, h);
      const keys = validateHit(r.body); if (!keys) return send({ error: 'requête invalide' }, 400, h);
      db.exec('BEGIN'); try { for (const k of keys) up.run(k); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
      return new Response(null, { status: 204, headers: h });
    }

    if (req.method === 'POST' && path === '/contact') {
      if (!originOk(req)) return send({ error: 'origine non autorisée' }, 403, h);
      if (limited(req, 'contact', 5, 3600e3)) return send({ error: 'trop de messages, réessayez plus tard' }, 429, h);
      const r = await readJson(req); if (r.error) return send({ error: 'requête invalide' }, r.error, h);
      const m = validateContact(r.body); if (!m) return send({ error: 'message invalide' }, 400, h);
      addMsg.run(new Date().toISOString().slice(0, 10), m.objet, m.question, m.message, m.email);
      notify('Nouveau message : ' + m.objet);
      return new Response(null, { status: 204, headers: h });
    }

    if (path.startsWith('/admin/')) {
      if (!isAdmin(req)) return send({ error: 'non autorisé' }, 401, h);
      if (req.method === 'GET' && path === '/admin/totals') {
        const rows = db.prepare('SELECT k, n FROM counters').all();
        return send({ counters: Object.fromEntries(rows.map((r) => [r.k, r.n])) }, 200, h);
      }
      if (req.method === 'GET' && path === '/admin/messages') {
        return send({ messages: db.prepare('SELECT id, day, objet, question, message, email, lu FROM messages ORDER BY id DESC LIMIT 500').all(), retentionDays }, 200, h);
      }
      const m = /^\/admin\/messages\/(\d{1,9})(\/lu)?$/.exec(path);
      if (m && req.method === 'POST' && m[2]) { db.prepare('UPDATE messages SET lu = 1 WHERE id = ?').run(Number(m[1])); return new Response(null, { status: 204, headers: h }); }
      if (m && req.method === 'DELETE' && !m[2]) { db.prepare('DELETE FROM messages WHERE id = ?').run(Number(m[1])); return new Response(null, { status: 204, headers: h }); }
    }
    return send({ error: 'introuvable' }, 404, h);
  }

  return { fetch: fetchHandler, db, purge, close: () => { timers.forEach(clearInterval); db.close(); } };
}

export function serve(app, port) {
  return http.createServer(async (req, res) => {
    try {
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > MAX_BODY * 2) { res.writeHead(413); return res.end(); } chunks.push(c); }
      const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      const r = await app.fetch(new Request('http://service' + req.url, { method: req.method, headers: req.headers, body: hasBody && chunks.length ? Buffer.concat(chunks) : undefined }));
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch { res.writeHead(500); res.end(); }
  }).listen(port);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const env = process.env;
  if ((env.ADMIN_TOKEN || '').length < 24) { console.error('ADMIN_TOKEN absent ou trop court (24 caractères minimum).'); process.exit(1); }
  if (!env.ALLOWED_ORIGIN) { console.error('ALLOWED_ORIGIN absent : renseignez l\'adresse de votre site.'); process.exit(1); }
  serve(createApp({ ...env, DB_PATH: env.DB_PATH || '/data/elysee.db' }), Number(env.PORT || 8080));
  console.log('Service démarré (aucun journal de requêtes).');
}
