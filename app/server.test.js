const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Données isolées pour les tests (avant de charger le serveur)
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'taches-'));
const server = require('./server');

let base;
const api = (chemin, options = {}) => fetch(base + chemin, { headers: { 'Content-Type': 'application/json' }, ...options });

test.before(async () => {
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); });

test('GET / renvoie la page avec la bannière de déploiement', async () => {
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
  const texte = await r.text();
  assert.equal(r.status, 200);
  assert.match(texte, /app_http_requests_total/);
  assert.match(texte, /app_tasks\{etat="total"\}/);
});

test('cycle complet : créer, cocher, lister, supprimer', async () => {
  let r = await api('/api/tasks', { method: 'POST', body: JSON.stringify({ titre: '  Tester le pipeline  ' }) });
  assert.equal(r.status, 201);
  const tache = await r.json();
  assert.equal(tache.titre, 'Tester le pipeline');
  assert.equal(tache.fait, false);

  r = await api('/api/tasks/' + tache.id, { method: 'PATCH', body: JSON.stringify({ fait: true }) });
  assert.equal((await r.json()).fait, true);

  r = await api('/api/tasks');
  assert.equal((await r.json()).length, 1);

  r = await api('/api/tasks/' + tache.id, { method: 'DELETE' });
  assert.equal(r.status, 204);
  assert.deepEqual(await (await api('/api/tasks')).json(), []);
});

test('les entrées invalides sont refusées', async () => {
  assert.equal((await api('/api/tasks', { method: 'POST', body: JSON.stringify({ titre: '   ' }) })).status, 400);
  assert.equal((await api('/api/tasks', { method: 'POST', body: '{pas du json' })).status, 400);
  assert.equal((await api('/api/tasks/inconnue', { method: 'PATCH', body: JSON.stringify({ fait: true }) })).status, 404);
  assert.equal((await api('/api/tasks/inconnue', { method: 'DELETE' })).status, 404);
});

test('route inconnue → 404', async () => {
  assert.equal((await fetch(base + '/nope')).status, 404);
});
