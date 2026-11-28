// Tests locaux : node tools/nas-server/test.mjs
import http from 'node:http';
import { createApp, serve, validateHit, validateContact } from './server.js';
import { debias, byQuestion, CATS } from './debias.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('ÉCHEC :', m); } else console.log('ok     :', m); };
const TOKEN = 'jeton-administration-tres-long-1234';
const ORIGIN = 'https://site.example';
const notified = [];
const app = createApp({ ALLOWED_ORIGIN: ORIGIN, ADMIN_TOKEN: TOKEN, IP_HEADER: 'cf-connecting-ip' }, { notify: async (t) => notified.push(t) });
const server = serve(app, 0); await new Promise((r) => server.once('listening', r));
const base = 'http://127.0.0.1:' + server.address().port;
const call = (path, { method = 'GET', body, origin = ORIGIN, auth, ip = '203.0.113.5', raw } = {}) =>
  fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...(auth ? { Authorization: auth } : {}), 'CF-Connecting-IP': ip }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
const admin = { auth: 'Bearer ' + TOKEN };

// statistiques
let r = await call('/hit', { method: 'POST', body: { v: 1, items: [{ q: 'q12', a: '2' }, { q: 'q40', a: 'na' }], events: [{ e: 'serie', k: 3 }] } });
ok(r.status === 204, 'envoi de statistiques valide accepté');
r = await call('/admin/totals', admin); let j = await r.json();
ok(j.counters['a:q12:2'] === 1 && j.counters['s:3'] === 1, 'compteurs incrémentés');
ok(Object.keys(j.counters).every((k) => /^(a:q\d+:(-?\d|na)|s:\d+|d:\d{4}-\d{2}-\d{2}|simulations)$/.test(k)), 'seules clés possibles : question, réponse, série, jour');
ok((await call('/hit', { method: 'POST', body: { v: 1, items: [{ q: 'q1', a: '9' }] } })).status === 400, 'réponse hors valeurs refusée');
ok((await call('/hit', { method: 'POST', body: { v: 1, items: [{ q: 'q1', a: '1' }] }, origin: 'https://autre.example' })).status === 403, 'origine non autorisée refusée');
ok((await call('/hit', { method: 'POST', raw: 'x'.repeat(9000) })).status === 413, 'corps trop volumineux refusé');
r = await call('/hit', { method: 'POST', body: { v: 1, items: [{ q: 'q1', a: '1' }], ip: '1.2.3.4', user: 'abc' } });
j = await (await call('/admin/totals', admin)).json();
ok(r.status === 204 && !JSON.stringify(j).includes('1.2.3.4') && !JSON.stringify(j).includes('abc'), 'champs inattendus ignorés');

// compteur global de simulations
r = await call('/counter'); j = await r.json(); ok(r.status === 200 && j.total === 0, 'compteur : GET renvoie le total (0 au départ)');
r = await call('/counter', { method: 'POST', ip: '203.0.113.40' }); j = await r.json(); ok(r.status === 200 && j.total === 1, 'compteur : POST incrémente et renvoie le total');
r = await call('/counter', { method: 'POST', ip: '203.0.113.41' }); j = await r.json(); ok(j.total === 2, 'compteur : un second visiteur → 2');
ok((await call('/counter', { method: 'POST', origin: 'https://autre.example', ip: '203.0.113.42' })).status === 403, 'compteur : origine non autorisée refusée');
let cl; for (let i = 0; i < 12; i++) cl = await call('/counter', { method: 'POST', ip: '198.51.100.50' });
ok(cl.status === 429, 'compteur : plus de 10 envois par heure depuis une même adresse → 429');
j = await (await call('/counter')).json(); ok(j.total === 12, 'compteur : seuls les envois acceptés sont comptés (12)');
ok(!JSON.stringify(await (await call('/counter')).json()).match(/203\.0\.113|198\.51/), 'compteur : aucune adresse dans la réponse');

// limitation des abus (empreinte en mémoire)
let last; for (let i = 0; i < 62; i++) last = await call('/hit', { method: 'POST', body: { v: 1, items: [{ q: 'q2', a: '1' }] }, ip: '198.51.100.9' });
ok(last.status === 429, 'au-delà de 60 envois par minute depuis une même adresse : 429');
ok((await call('/hit', { method: 'POST', body: { v: 1, items: [{ q: 'q2', a: '1' }] }, ip: '198.51.100.77' })).status === 204, 'une autre adresse n’est pas affectée');

// formulaire de contact
const msg = { objet: 'Signaler une erreur sur une position', question: 'q10 · Candidat', message: 'La citation semble tronquée, merci de vérifier.', email: 'moi@exemple.fr' };
r = await call('/contact', { method: 'POST', body: msg, ip: '192.0.2.1' }); ok(r.status === 204, 'message valide accepté');
ok(notified.length === 1 && !notified[0].includes('tronquée') && !notified[0].includes('moi@'), 'notification : titre seulement, jamais le contenu ni l’e-mail');
ok((await call('/contact', { method: 'POST', body: { ...msg, objet: 'inconnu' }, ip: '192.0.2.2' })).status === 400, 'objet inconnu refusé');
ok((await call('/contact', { method: 'POST', body: { ...msg, message: 'court' }, ip: '192.0.2.3' })).status === 400, 'message trop court refusé');
ok((await call('/contact', { method: 'POST', body: { ...msg, email: 'pas-un-email' }, ip: '192.0.2.4' })).status === 400, 'e-mail invalide refusé');
r = await call('/contact', { method: 'POST', body: { ...msg, email: '' }, ip: '192.0.2.5' }); ok(r.status === 204, 'e-mail facultatif');
let c; for (let i = 0; i < 6; i++) c = await call('/contact', { method: 'POST', body: msg, ip: '192.0.2.99' });
ok(c.status === 429, 'plus de 5 messages par heure depuis une même adresse : 429');

// administration
ok((await call('/admin/messages')).status === 401, 'messages refusés sans jeton');
ok((await call('/admin/messages', { auth: 'Bearer mauvais' })).status === 401, 'messages refusés avec un mauvais jeton');
j = await (await call('/admin/messages', admin)).json();
ok(j.messages.length >= 2 && j.messages[0].email !== undefined, 'messages lisibles avec le bon jeton');
ok(JSON.stringify(j).includes('192.0.2') === false && JSON.stringify(j).includes('203.0.113') === false, 'aucune adresse IP dans les messages');
const id = j.messages[0].id;
ok((await call(`/admin/messages/${id}/lu`, { method: 'POST', ...admin })).status === 204, 'marquer comme lu');
ok((await call(`/admin/messages/${id}`, { method: 'DELETE', ...admin })).status === 204, 'supprimer un message');
j = await (await call('/admin/messages', admin)).json(); ok(!j.messages.some((m) => m.id === id), 'message supprimé');
ok((await call('/health', { origin: '' })).status === 200, 'route de santé');
ok((await call('/inconnue')).status === 404, 'route inconnue : 404');

// schéma : aucune colonne d'adresse ou d'identifiant
const cols = app.db.prepare("SELECT name FROM pragma_table_info('messages')").all().map((x) => x.name).concat(app.db.prepare("SELECT name FROM pragma_table_info('counters')").all().map((x) => x.name));
ok(!cols.some((n) => /ip|addr|agent|header|session|user/i.test(n)), 'aucune colonne d’adresse, d’identifiant ou d’en-tête dans la base : ' + cols.join(','));

// conservation limitée
const old = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
app.db.prepare('INSERT INTO messages (day, objet, message) VALUES (?, ?, ?)').run(old, 'Autre', 'ancien message supprimable');
ok(app.purge() === 1, 'les messages de plus de 365 jours sont supprimés');

// administration fermée sans jeton configuré ou trop court
const weak = createApp({ ALLOWED_ORIGIN: ORIGIN, ADMIN_TOKEN: 'court' });
ok((await weak.fetch(new Request('http://x/admin/totals', { headers: { Authorization: 'Bearer court' } }))).status === 401, 'jeton trop court : administration fermée');
weak.close();

// redressement du brouillage
{
  const P = 0.25, N = 20000, vrai = { '2': 0.35, '1': 0.30, '0': 0.10, '-1': 0.12, '-2': 0.08, na: 0.05 };
  const cum = []; let s = 0; for (const k of CATS) { s += vrai[k]; cum.push([k, s]); }
  const obs = Object.fromEntries(CATS.map((k) => [k, 0]));
  for (let i = 0; i < N; i++) { const u = Math.random(); let a = cum.find(([, x]) => u <= x)[0]; if (Math.random() < P) a = CATS[Math.floor(Math.random() * CATS.length)]; obs[a]++; }
  const { share } = debias(obs, P);
  const err = Math.max(...CATS.map((k) => Math.abs(share[k] - vrai[k])));
  ok(err < 0.02, `redressement exact à ${(err * 100).toFixed(2)} point(s) près sur 20 000 réponses`);
}
ok(Object.keys(byQuestion({ 'a:q1:2': 3, 's:1': 9 })).join() === 'q1', 'regroupement par question');

server.close(); app.close();
console.log(fails ? `\n${fails} échec(s)` : '\nTous les tests passent');
process.exit(fails ? 1 : 0);
