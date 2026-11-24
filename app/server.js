// Gestionnaire de tâches : page web + API REST + métriques Prometheus.
// Les tâches sont enregistrées dans un fichier JSON (volume Docker) : elles survivent aux redéploiements.
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const client = require('prom-client');

const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || 'dev';
const DATA_FILE = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'tasks.json');
const STARTED = new Date();

// Texte de la bannière : c'est la ligne à modifier pendant la démonstration
const BANNIERE = 'Déploiement automatique réussi : version 5';

const PAGE = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

/* ---------- Stockage ---------- */
function lire() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return []; }
}
function ecrire(taches) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(taches));
  fs.renameSync(tmp, DATA_FILE); // écriture atomique
}

/* ---------- Métriques ---------- */
client.collectDefaultMetrics();
const requetes = new client.Counter({ name: 'app_http_requests_total', help: 'Requêtes HTTP reçues', labelNames: ['route', 'status'] });
const duree = new client.Histogram({
  name: 'app_http_request_duration_seconds', help: 'Durée de traitement des requêtes', labelNames: ['route'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});
const creees = new client.Counter({ name: 'app_tasks_created_total', help: 'Tâches créées depuis le démarrage' });
new client.Gauge({ name: 'app_tasks', help: 'Nombre de tâches', labelNames: ['etat'], collect() {
  const t = lire();
  this.set({ etat: 'total' }, t.length);
  this.set({ etat: 'terminees' }, t.filter((x) => x.fait).length);
} });

/* ---------- Outils HTTP ---------- */
function json(res, status, corps) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(corps));
}
function lireCorps(req) {
  return new Promise((resolve, reject) => {
    let brut = '';
    req.setEncoding('utf8'); // évite de couper un caractère accentué entre deux morceaux
    req.on('data', (c) => { brut += c; if (brut.length > 10_000) { reject(Object.assign(new Error('trop gros'), { status: 413 })); req.destroy(); } });
    req.on('end', () => { try { resolve(brut ? JSON.parse(brut) : {}); } catch { reject(Object.assign(new Error('JSON invalide'), { status: 400 })); } });
  });
}

/* ---------- Routes ---------- */
async function api(req, res, route) {
  const m = route.match(/^\/api\/tasks(?:\/([\w-]+))?$/);
  if (!m) return json(res, 404, { erreur: 'Introuvable' });
  const id = m[1];

  if (!id && req.method === 'GET') return json(res, 200, lire());

  if (!id && req.method === 'POST') {
    const { titre } = await lireCorps(req);
    if (typeof titre !== 'string' || !titre.trim() || titre.length > 200) return json(res, 400, { erreur: 'Titre requis (200 caractères maximum)' });
    const tache = { id: crypto.randomUUID(), titre: titre.trim(), fait: false, cree: new Date().toISOString() };
    const t = lire(); t.push(tache); ecrire(t); creees.inc();
    return json(res, 201, tache);
  }

  if (id && req.method === 'PATCH') {
    const { fait } = await lireCorps(req);
    if (typeof fait !== 'boolean') return json(res, 400, { erreur: '« fait » doit être vrai ou faux' });
    const t = lire(); const tache = t.find((x) => x.id === id);
    if (!tache) return json(res, 404, { erreur: 'Tâche introuvable' });
    tache.fait = fait; ecrire(t);
    return json(res, 200, tache);
  }

  if (id && req.method === 'DELETE') {
    const t = lire(); const reste = t.filter((x) => x.id !== id);
    if (reste.length === t.length) return json(res, 404, { erreur: 'Tâche introuvable' });
    ecrire(reste);
    res.writeHead(204); return res.end();
  }
  return json(res, 405, { erreur: 'Méthode non autorisée' });
}

const server = http.createServer(async (req, res) => {
  const fin = duree.startTimer();
  const chemin = req.url.split('?')[0];
  const route = chemin.startsWith('/api/tasks/') ? '/api/tasks/:id' : chemin;

  try {
    if (chemin === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(PAGE.replace('{{BANNIERE}}', BANNIERE).replace('{{VERSION}}', VERSION.slice(0, 7))
        .replace('{{CONTENEUR}}', os.hostname()).replace('{{DEMARRE}}', STARTED.toLocaleString('fr-FR')));
    } else if (chemin === '/health') {
      json(res, 200, { status: 'ok', version: VERSION });
    } else if (chemin === '/metrics') {
      res.writeHead(200, { 'Content-Type': client.register.contentType });
      res.end(await client.register.metrics());
    } else if (chemin.startsWith('/api/')) {
      await api(req, res, chemin);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Introuvable');
    }
  } catch (e) {
    if (!res.headersSent) json(res, e.status || 500, { erreur: e.status ? e.message : 'Erreur interne' });
  }

  if (route !== '/metrics') requetes.inc({ route, status: res.statusCode });
  fin({ route });
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`App v${VERSION} sur le port ${PORT}`));
}

module.exports = server;
