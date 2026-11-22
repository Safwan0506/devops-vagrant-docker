const test = require('node:test');
const assert = require('node:assert/strict');
const server = require('./server');

let base;
test.before(async () => {
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test('GET / renvoie la page HTML', async () => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Déploiement automatique/);
});

test('GET /health renvoie ok', async () => {
  const r = await fetch(base + '/health');
  assert.equal(r.status, 200);
  assert.equal((await r.json()).status, 'ok');
});

test('GET /metrics expose les métriques Prometheus', async () => {
  const r = await fetch(base + '/metrics');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /app_http_requests_total/);
});

test('route inconnue → 404', async () => {
  const r = await fetch(base + '/nope');
  assert.equal(r.status, 404);
});
