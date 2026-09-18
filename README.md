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

## Écran de saisie live (offline-first)

Le frontend n'a pas encore d'écran de gestion équipes/matchs (prévu en Phase 6) :
pour ouvrir l'écran de saisie live il faut d'abord seeder un match de démo via
l'API, puis coller son `Game ID` dans le champ affiché sur la page d'accueil.

```bash
cd backend
python scripts/seed_demo.py   # imprime Game ID / Team ID / Org ID
```

Puis ouvrir http://localhost:5173, coller le `Game ID` affiché et cliquer sur
"Open live entry". L'écran reproduit la saisie en 2 temps (joueur/action dans
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
