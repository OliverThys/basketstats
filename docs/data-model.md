# Modèle de données

Référence : voir `brief.md` pour le détail complet. Implémenté depuis la
Phase 1 dans `backend/app/models/` (SQLAlchemy 2, migration Alembic `0002`).

- `Organization` — tenant SaaS (un club). `id, name, created_at`.
- `User` — appartient à une organization, rôle `owner|head_coach|assistant|viewer`.
- `Team` — équipe suivie joueur par joueur, appartient à une organization.
- `Player` — appartient à une team. Position `PG|SG|SF|PF|C`.
- `Game` — match, `ruleset` par défaut `"FIBA"`, `status` `setup|live|final`,
  `home_score`/`opponent_score` dénormalisés (recalculés depuis les events).
  `share_token` (migration `0003`) : identifiant opaque public, distinct de
  `id`, qui donne accès à la page spectateur en lecture seule sans auth.
- `GameRoster` — feuille de match (qui joue, titulaire, DNP), unique par
  `(game_id, player_id)`.
- `GameEvent` — journal d'événements append-only (play-by-play), source de
  vérité unique. `id` est l'UUID généré côté client (clé primaire, ce qui
  rend l'ingestion batch idempotente). Box score, pourcentages, +/-, minutes,
  shot charts et stats de saison sont tous dérivés de `GameEvent` par
  `backend/app/domain/box_score.py`, jamais stockés en agrégat. `voided`
  permet l'undo doux (soft delete) sans réécrire l'historique.

Tous les identifiants primaires sont des chaînes UUID (`String(36)`), pas le
type `UUID` natif Postgres : ça garde les modèles portables vers SQLite pour
les tests (`backend/tests/conftest.py`) sans dépendre du dialecte.

Endpoints CRUD : `/teams`, `/players`, `/games`, `/games/{id}/roster` —
tous scopés à l'organisation du JWT courant (Phase 6, voir `README.md`).
Ingestion d'events : `POST /games/{id}/events/batch` (idempotent sur l'UUID),
lecture `GET /games/{id}/events`, undo `DELETE /games/{id}/events/{event_id}`
(soft delete), dérivation `GET /games/{id}/box-score`. Auth :
`/auth/register`, `/auth/login`, `/auth/invite`, `/auth/me`. Backup/restore :
`GET /organizations/me/backup`, `POST /organizations/restore`. Live
spectateur : `GET /live/{share_token}`, `WS /live/{share_token}/ws`.
