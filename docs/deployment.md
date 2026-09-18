# Déploiement — VPS OVH (hellojade)

Pipeline de référence pour déployer et mettre à jour BasketStats sur le VPS
partagé avec HelloJADE. À suivre tel quel pour tout déploiement futur, sauf
mention contraire explicite de l'utilisateur.

## Serveur

- IP : `51.68.224.55` (hostname OVH `vps-aa8d9b40`)
- Alias SSH : `ssh hellojade` (utilisateur `ubuntu`, `sudo -n` passe sans mot
  de passe). C'est le seul alias qui fonctionne avec la clé disponible —
  `vps-ovh` (root) échoue en permission denied.
- Le serveur héberge aussi **HelloJADE/EpiCURA en prod** (conteneurs
  `hellojadeapp-*`, dépôt `/root/hellojade`). Ne jamais toucher à ces
  conteneurs, à ce dépôt, ni à la conf nginx/cloudflared existante.

## Répertoire de déploiement

Le dépôt est cloné en clair sur le serveur (repo GitHub public, pas de clé
de déploiement nécessaire) :

```bash
ssh hellojade "cd /home/ubuntu && git clone https://github.com/OliverThys/basketstats.git"
```

`/home/ubuntu`, `/opt` et `/srv` sont libres (rien de HelloJADE n'y est
installé nativement — tout HelloJADE est en conteneurs). C'est là que vit
BasketStats.

## Ports utilisés

| Service | Port hôte | Notes |
|---|---|---|
| Frontend (nginx, statique) | `8090` | public, HTTP |
| Backend (uvicorn) | `8091` | public, HTTP — le frontend appelle directement cette IP:port (baked au build via `VITE_API_BASE_URL`) |
| Postgres | — | interne au réseau Docker uniquement, **jamais publié sur l'hôte** |
| Redis | — | interne au réseau Docker uniquement, **jamais publié sur l'hôte** |

Avant de changer ou d'ajouter un port, toujours vérifier qu'il est libre sur
l'hôte (HelloJADE utilise déjà `22`, `443` (livekit-server direct, pas
nginx), `8443` (nginx HelloJADE), `8088` (Asterisk natif, hors Docker),
`127.0.0.1:8080`/`19999` en local uniquement) :

```bash
ssh hellojade "sudo -n ss -tlnp"
```

**HTTPS/domaine** : pas encore en place. Le tunnel `cloudflared` de
HelloJADE tourne en mode token (routage géré depuis le dashboard Cloudflare
Zero Trust, inaccessible en CLI) — il ne peut pas être réutilisé pour
BasketStats sans passer par ce dashboard. Pour passer en HTTPS il faudra
soit un nom de domaine + Let's Encrypt (vhost nginx dédié BasketStats), soit
une route Cloudflare Tunnel ajoutée manuellement par l'utilisateur.

## Fichiers de prod dans le dépôt

- `docker-compose.prod.yml` — stack de prod (db/redis internes, backend +
  worker Celery + frontend buildé statiquement, `restart: unless-stopped`)
- `backend/Dockerfile.prod` — pas de `--reload`, `requirements.txt` (pas
  `-dev`), migrations Alembic au démarrage puis uvicorn 2 workers
- `frontend/Dockerfile.prod` — build multi-stage (`npm run build` avec
  `VITE_API_BASE_URL` en build arg) puis nginx:alpine statique
- `frontend/nginx.prod.conf` — fallback SPA, cache long sur `/assets/`,
  `no-cache` sur `sw.js`/`manifest.webmanifest` (PWA `autoUpdate`)
- `.env.prod.example` — modèle des variables à fournir dans un `.env` non
  commité, à côté de `docker-compose.prod.yml` sur le serveur

Ne jamais utiliser `docker-compose.yml` (dev) en production : il publie
Postgres/Redis en clair sur l'hôte et lance Vite en mode dev.

## Premier déploiement

```bash
ssh hellojade
cd /home/ubuntu/basketstats

# Secrets (une seule fois, jamais commités)
PG_PASS=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
cat > .env <<EOF
POSTGRES_PASSWORD=$PG_PASS
JWT_SECRET=$JWT_SECRET
VITE_API_BASE_URL=http://51.68.224.55:8091
EOF
chmod 600 .env

sudo -n docker compose -f docker-compose.prod.yml build
sudo -n docker compose -f docker-compose.prod.yml up -d
```

Les migrations Alembic tournent automatiquement au démarrage du conteneur
`backend` (`alembic upgrade head` dans le `CMD` du Dockerfile.prod).

## Mise à jour (déploiements suivants)

```bash
ssh hellojade
cd /home/ubuntu/basketstats
git pull
sudo -n docker compose -f docker-compose.prod.yml up -d --build
```

`.env` reste en place (non versionné) ; `up -d --build` ne recrée que ce qui
a changé.

## Vérifications post-déploiement

```bash
# Conteneurs BasketStats up
sudo -n docker compose -f docker-compose.prod.yml ps

# HelloJADE toujours intact (aucun conteneur hellojadeapp-* affecté)
sudo -n docker ps --format '{{.Names}}: {{.Status}}' | grep hellojadeapp

# Espace disque
df -h /

# Smoke test API + frontend (depuis n'importe où)
curl -s http://51.68.224.55:8091/health
curl -s -o /dev/null -w "%{http_code}\n" http://51.68.224.55:8090
```

Un smoke test fonctionnel complet (`POST /auth/register`) est recommandé
après un premier déploiement ou une migration de schéma ; penser à nettoyer
les données de test ensuite (`TRUNCATE ... CASCADE` sur `organizations` si
la base ne contient que ce test).

## Rollback

```bash
ssh hellojade
cd /home/ubuntu/basketstats
git log --oneline -5        # repérer le commit précédent
git checkout <commit>
sudo -n docker compose -f docker-compose.prod.yml up -d --build
```

Alembic ne fait pas de downgrade automatique — une migration de schéma
cassée nécessite un `alembic downgrade` manuel dans le conteneur `backend`
avant de revenir en arrière côté code.

## Secrets

- `.env` sur le serveur uniquement, `chmod 600`, jamais commité (déjà dans
  `.gitignore` du dépôt racine via le pattern `.env`).
- Ne jamais régénérer `JWT_SECRET` sans prévenir l'utilisateur : ça déconnecte
  tous les comptes existants (tokens signés avec l'ancien secret invalidés).
- `POSTGRES_PASSWORD` ne se change pas sans recréer le volume ou faire un
  `ALTER USER` dans Postgres — ne pas le regénérer à la légère non plus.
