# BasketStats

SaaS de statistiques de basket-ball FIBA, offline-first, event-sourced.
Reproduit et dépasse l'app iPad "Basketball Stats PRO" (voir `docs/reference-app/`)
en version web multi-appareils.

Voir `docs/brief.md` pour le brief complet et le découpage en phases.

## Stack

- Backend : FastAPI, SQLAlchemy 2, Alembic, PostgreSQL 16, Redis, Celery.
- Frontend : React 18, TypeScript, Vite, PWA (Dexie.js pour l'offline).
- Infra : Docker Compose.

## Démarrage

```bash
docker compose up --build
```

- API : http://localhost:8000 (`/health`, `/docs`)
- Front : http://localhost:5173

## Développement backend (hors Docker)

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Tests :

```bash
cd backend
pytest
```

Lint / format :

```bash
ruff check .
black .
```

## Développement frontend (hors Docker)

```bash
cd frontend
npm install
npm run dev
```

Tests :

```bash
cd frontend
npm run test
npm run test:e2e   # Playwright : coupure réseau + reload, sans perte ni doublon
```

Lint / format :

```bash
npm run lint
npm run format
```

## Migrations de base de données

```bash
cd backend
alembic upgrade head
alembic revision -m "description"
```

## Comptes et multi-tenant (Phase 6)

Chaque club est une `Organization` isolée : toutes les équipes, joueurs,
matchs et events sont scopés à l'organisation de l'utilisateur connecté (un
utilisateur d'un club ne peut jamais lire ni modifier les données d'un autre
club — vérifié par des tests d'isolation côté API).

- `POST /auth/register` crée un nouveau club et son premier utilisateur,
  `owner`.
- `POST /auth/login` (e-mail seul pour l'instant, pas encore de mot de passe)
  renvoie un token JWT pour un utilisateur déjà enregistré.
- `POST /auth/invite` (réservé à l'`owner`) ajoute un coéquipier au club avec
  un rôle (`owner` / `head_coach` / `assistant` / `viewer`). Les `viewer` ont
  un accès strictement en lecture ; les autres rôles peuvent tout modifier.
- Le frontend affiche un écran de connexion/création de club au premier accès
  (`AuthProvider` + `LoginScreen`) ; le token est gardé en `localStorage`
  ainsi qu'un cache du profil utilisateur, pour que l'app reste utilisable
  hors ligne après un rechargement même sans réseau.

## Gestion équipes / joueurs / matchs

Le bouton "Gérer les équipes, joueurs et matchs" de l'accueil ouvre un écran
de gestion (`ManagementScreen`) : création/édition/suppression d'équipes,
recherche et gestion des joueurs par équipe, création de matchs avec
recherche par adversaire. Chaque match y expose aussi son lien spectateur
(voir plus bas).

## Partage live spectateur

Chaque match a un `share_token` public (distinct de son id et des identifiants
de l'organisation) qui donne accès à une page de suivi en direct, sans
connexion requise :

- `GET /live/{share_token}` : score, box score et derniers events en JSON.
- `WS /live/{share_token}/ws` : la même chose en direct, poussé par le backend
  à chaque batch d'events ingéré ou event annulé.
- Frontend : `http://localhost:5173/?live=<share_token>` ouvre
  `LiveSpectatorScreen`, qui se connecte au WebSocket et affiche score,
  fil du match et box score en direct.

Le fan-out WebSocket est géré en mémoire dans le process API (suffisant pour
le worker unique de `docker-compose`) ; passer à Redis pub/sub si l'API est un
jour répartie sur plusieurs workers.

## Backup / restore

- `GET /organizations/me/backup` (réservé à l'`owner`) exporte tout le club
  (équipes, joueurs, matchs, rosters, events) en un seul JSON.
- `POST /organizations/restore` (réservé à l'`owner`) réimporte ce JSON :
  il ne peut être rejoué que dans l'organisation dont il provient, remplace
  entièrement les équipes/matchs actuels par ceux du backup et restaure les
  identifiants d'origine (utile après une perte de données ou une migration).

## Écran de saisie live (offline-first)

Depuis l'écran de gestion, créez une équipe, un joueur et un match, puis
ouvrez la saisie ("Ouvrir la saisie"). Pour un jeu de données de démonstration
rapide sans passer par l'UI :

```bash
cd backend
python scripts/seed_demo.py   # crée un club + une équipe + un match, imprime Game ID / Team ID / Auth token
```

Puis ouvrir http://localhost:5173, coller le `Game ID` affiché et cliquer sur
"Ouvrir le match" (il faut être connecté avec le compte imprimé par le script,
ou coller son token dans `localStorage.basketstats_token`). L'écran reproduit
la saisie en 2 temps (joueur/action dans
n'importe quel ordre), le shot chart inline pour les tirs, le play-by-play
éditable avec undo, le panneau de stats live et l'indicateur de synchronisation
(Synced / Sync pending / Offline).

Le **box score** (bouton dans l'en-tête live) affiche toutes les colonnes, la
ligne Totals avec %, plus MIN / +/- / eFG% / TS%, les zones de tir, et des
exports CSV/PDF. Les **stats de saison** s'ouvrent depuis le bouton Season
pendant un match, ou via le champ Team ID de l'accueil (`/?team=<id>`) : totaux
et moyennes (DNP exclus), split par adversaire, zones de tir, CSV/PDF. Les
agrégations lourdes peuvent passer par Celery (`POST /teams/{id}/season-stats/jobs`)
quand le worker Docker tourne.

La vue **Shot Chart** (bouton dans l'en-tête live) affiche les tirs FG2/FG3
sur un demi-terrain FIBA (ligne à 3 pts 6,75 m / 6,60 m dans les coins,
raquette rectangulaire). Filtres par joueur (Select All / Deselect All) et par
quart (Q1–Q4 / OT / All), marqueurs made (cercle) / missed (croix), export PNG.

Tout event est d'abord écrit dans IndexedDB (Dexie) puis synchronisé vers l'API
dès que la connexion est disponible (poussée en batch idempotente sur l'UUID
client ; les undo/void déjà synchronisés sont propagés via un appel dédié).
Un service worker enregistre un Background Sync (`basketstats-sync`) et un
backoff exponentiel relance la file tant que le match est ouvert. Recharger
l'onglet (`/?game=<id>`) reprend le journal local sans perte ; rejouer un
batch déjà poussé ne crée pas de doublon.

Le moteur de dérivation du box score est réimplémenté en TypeScript
(`frontend/src/domain/boxScore.ts`) et testé avec la même fixture de référence
que le backend (`frontend/src/domain/referenceGame.fixture.ts`), pour garantir
que les deux calculs ne divergent jamais.

## Documentation

- `docs/brief.md` : brief maître et découpage en phases.
- `docs/data-model.md` : modèle de données.
- `docs/stats-formulas.md` : formules de statistiques.
- `docs/reference-app/` : captures de l'app de référence.
