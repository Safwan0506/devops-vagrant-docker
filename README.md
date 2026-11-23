# Devoir DevOps — Vagrant, Docker, GitHub Actions, Prometheus et Grafana

Une application web tourne dans un conteneur Docker, à l'intérieur d'une machine virtuelle créée avec Vagrant.
À chaque `git push`, GitHub Actions teste le code puis redéploie automatiquement le conteneur dans la VM.
Prometheus et Grafana supervisent l'application et la VM.

## Architecture

```
 PC (Windows)                      GitHub
 ┌───────────┐  git push   ┌──────────────────────┐
 │ code      │ ──────────► │ Actions               │
 └───────────┘             │  1. test              │
                           │  2. build ──► image publiée sur GHCR
                           │  3. deploy ───────────┼──┐
                           └──────────────────────┘  │ le runner de la VM
 VM Vagrant 192.168.56.10                            │ va chercher le job
 ┌────────────────────────────────────────────────┐  │
 │ runner GitHub (self-hosted) ◄──────────────────┼──┘
 │      │ docker compose pull + up -d (image GHCR)│
 │      ▼                                         │
 │ app :80 · Prometheus :9090 · Grafana :3000     │
 │ node-exporter (métriques de la VM)             │
 └────────────────────────────────────────────────┘
```

Pourquoi un runner « self-hosted » dans la VM : les serveurs de GitHub ne peuvent pas atteindre une VM locale.
Le runner, installé dans la VM, interroge GitHub (connexion sortante) et exécute le déploiement sur place.

## Adresses (une fois déployé)

| Service | Adresse |
|---|---|
| Application | http://192.168.56.10 |
| Prometheus | http://192.168.56.10:9090 |
| Grafana (admin / admin) | http://192.168.56.10:3000 |

## Contenu

| Fichier | Rôle |
|---|---|
| `Vagrantfile` | VM Ubuntu 22.04, IP 192.168.56.10 |
| `provision/provision.sh` | installe Docker dans la VM |
| `provision/install-runner.sh` | installe le runner GitHub dans la VM |
| `app/` | application Node.js, tests, Dockerfile |
| `docker-compose.yml` | application + Prometheus + Grafana + node-exporter |
| `monitoring/` | configuration Prometheus et tableau de bord Grafana (déjà provisionné) |
| `.github/workflows/ci-cd.yml` | pipeline CI/CD |

## Démarrage rapide

```powershell
vagrant up          # crée la VM et installe Docker (5 à 10 min la première fois)
vagrant ssh         # entre dans la VM
```

Puis suivre `docs/GUIDE.md` pour le dépôt GitHub et le runner.
