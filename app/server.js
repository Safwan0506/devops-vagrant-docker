// Application de démonstration : une page web + /health + /metrics (Prometheus).
const http = require('node:http');
const os = require('node:os');
const client = require('prom-client');

const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || 'dev';
const STARTED = new Date();

client.collectDefaultMetrics(); // CPU, mémoire, boucle d'événements du processus

const requetes = new client.Counter({
  name: 'app_http_requests_total',
  help: 'Nombre de requêtes HTTP reçues',
  labelNames: ['route', 'status'],
});
const duree = new client.Histogram({
  name: 'app_http_request_duration_seconds',
  help: 'Durée de traitement des requêtes',
  labelNames: ['route'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

function page() {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Démo DevOps</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;display:grid;place-items:center;min-height:100vh}
  main{background:#1e293b;padding:2rem 2.5rem;border-radius:16px;max-width:520px;box-shadow:0 10px 40px #0006}
  h1{margin:0 0 .5rem;font-size:1.6rem} .v{color:#38bdf8;font-weight:700}
  dl{display:grid;grid-template-columns:auto 1fr;gap:.4rem 1rem;margin:1.2rem 0 0}
  dt{color:#94a3b8} dd{margin:0;font-family:ui-monospace,monospace}
</style></head>
<body><main>
  <h1>🚀 Déploiement automatique OK</h1>
  <p>Cette page est servie par un conteneur Docker dans une VM Vagrant.</p>
  <dl>
    <dt>Version</dt><dd class="v">${VERSION}</dd>
    <dt>Conteneur</dt><dd>${os.hostname()}</dd>
    <dt>Démarré le</dt><dd>${STARTED.toLocaleString('fr-FR')}</dd>
  </dl>
</main></body></html>`;
}

const server = http.createServer(async (req, res) => {
  const fin = duree.startTimer();
  const route = req.url.split('?')[0];
  let status = 200;

  try {
    if (route === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page());
    } else if (route === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version: VERSION }));
    } else if (route === '/metrics') {
      res.writeHead(200, { 'Content-Type': client.register.contentType });
      res.end(await client.register.metrics());
    } else {
      status = 404;
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Introuvable');
    }
  } catch (e) {
    status = 500;
    res.writeHead(500);
    res.end('Erreur');
  }

  if (route !== '/metrics') requetes.inc({ route, status });
  fin({ route });
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`App v${VERSION} sur le port ${PORT}`));
}

module.exports = server;
