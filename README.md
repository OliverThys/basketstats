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

## Documentation

- `docs/brief.md` : brief maître et découpage en phases.
- `docs/data-model.md` : modèle de données.
- `docs/stats-formulas.md` : formules de statistiques.
- `docs/reference-app/` : captures de l'app de référence.
