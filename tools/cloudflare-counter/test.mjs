// Test avec une base D1 simulée : node --disable-warning=ExperimentalWarning tools/cloudflare-counter/test.mjs
import worker from './worker.js';
import assert from 'node:assert/strict';
let n = 0;
const DB = { prepare: (sql) => ({ bind: () => ({
  run: async () => { if (sql.startsWith('UPDATE')) n++; },
  first: async () => ({ n }) }) }) };
let hits = 0;
const LIMITER = { limit: async () => ({ success: ++hits <= 3 }) };
const env = { ALLOWED_ORIGIN: 'https://site.test', DB, LIMITER };
const call = (method, origin, e = env, path = '/counter') =>
  worker.fetch(new Request('https://w.test' + path, { method, headers: origin ? { origin } : {} }), e);
let r = await call('GET', 'https://site.test'); assert.deepEqual(await r.json(), { total: 0 });
assert.equal(r.headers.get('access-control-allow-origin'), 'https://site.test');
r = await call('POST', 'https://site.test'); assert.deepEqual(await r.json(), { total: 1 });
r = await call('POST', 'https://autre.test'); assert.equal(r.status, 403); assert.equal(n, 1);
assert.equal(r.headers.get('access-control-allow-origin'), null);
r = await call('POST', 'https://site.test'); assert.equal((await r.json()).total, 2);
r = await call('POST', 'https://site.test'); assert.equal((await r.json()).total, 3);
r = await call('POST', 'https://site.test'); assert.equal(r.status, 429); assert.equal(n, 3);
r = await call('OPTIONS', 'https://site.test'); assert.equal(r.status, 204);
r = await call('DELETE', 'https://site.test'); assert.equal(r.status, 405);
r = await call('GET', 'https://site.test', env, '/autre'); assert.equal(r.status, 404);
r = await call('GET', 'https://site.test', { DB }); assert.equal(r.status, 500);
console.log('Tous les tests passent');
