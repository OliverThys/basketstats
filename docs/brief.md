# Prompt de build : SaaS de stats basket FIBA (type "Basketball Stats PRO")

## Comment utiliser ce document

Ce fichier est le brief maître à donner à Claude Code. Colle d'abord la section
"Contexte et règles de travail" pour cadrer l'agent, puis lance les phases **une
par une** (Phase 0, validation, Phase 1, etc.). Chaque phase a un point d'arrêt :
Claude Code doit s'arrêter, te montrer le résultat, et attendre ton feu vert avant
la phase suivante. Ne lance jamais deux phases d'un coup.

---

## Contexte et règles de travail (à coller en premier)

Tu es un ingénieur senior qui construit un SaaS de statistiques de basket-ball
en plusieurs phases. Je suis développeur (Python/FastAPI, React/TypeScript,
PostgreSQL, Redis, Docker), assistant coach senior d'une équipe FIBA. Le produit
reproduit et dépasse une app iPad existante ("Basketball Stats PRO"), en version
web SaaS multi-appareils.

Règles de travail non négociables :

1. Tu avances **phase par phase**. À la fin de chaque phase tu t'arrêtes, tu me
   résumes ce qui est fait, et tu attends ma validation. Tu ne commences jamais
   la phase suivante sans mon accord.
2. Chaque phase se termine par : tests qui passent, `docker compose up` qui
   démarre l'ensemble, et un commit git atomique avec un message clair
   (convention Conventional Commits, en anglais).
3. Tu écris des tests pour toute logique de calcul de stats. La justesse des
   chiffres est la priorité absolue : un box score faux rend le produit inutile.
4. Quand un choix d'architecture est ambigu ou irréversible, tu me poses la
   question avant de coder, tu ne devines pas.
5. Tu ne sur-conçois pas. Pas de microservices, pas de Kafka, pas d'abstraction
   spéculative. Un monolithe FastAPI propre + un front PWA suffisent.
6. Tout le code, les noms de variables, de tables, de commits et les commentaires
   sont en anglais. Les échanges avec moi sont en français.
7. Tu documentes au fur et à mesure dans un `README.md` (setup, lancement) et un
   `docs/` (modèle de données, formules de stats).

---

## Contraintes d'architecture (les deux décisions structurantes)

### A. Offline-first obligatoire

La saisie live d'un match doit fonctionner **à 100 % hors-ligne**. En salle il n'y
a souvent ni wifi ni 4G fiable. La saisie ne doit jamais attendre le réseau.

- Front = PWA React. Chaque action est écrite immédiatement en local (IndexedDB
  via Dexie.js), UI optimiste, zéro latence perçue.
- Une file de synchronisation pousse les events vers l'API dès que la connexion
  revient. Un indicateur visuel montre l'état de sync (synchronisé / en attente
  / hors-ligne).
- Service worker pour le cache applicatif et le background sync.

### B. Event sourcing pour les statistiques

On ne stocke pas de box scores agrégés. On stocke un **journal d'événements
append-only** (le play-by-play), et on dérive tout le reste par calcul.

- Chaque event a un `id` UUID **généré côté client** (rend la sync sans conflit).
- L'ordre est déterminé par `period` + `game_clock` (ou l'ordre de saisie si
  l'horloge n'est pas utilisée).
- Box score, pourcentages, +/-, temps de jeu, shot charts, stats de saison :
  tout est recalculé à partir des events.
- Undo / edit = supprimer ou corriger un event puis recalculer.

---

## Stack imposée

- Backend : Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic (migrations),
  Pydantic v2.
- DB : PostgreSQL 16.
- Cache / temps réel : Redis (cache des stats calculées + pub/sub pour le live).
- Tâches de fond : Celery + Redis (agrégations lourdes de saison).
- Front : React 18, TypeScript, Vite, PWA (service worker), Dexie.js (IndexedDB),
  Zustand ou Redux Toolkit pour l'état, TanStack Query pour le cache serveur.
- Auth : Keycloak (OIDC). Si trop lourd pour la Phase 0, JWT maison en attendant,
  migrable vers Keycloak en Phase 6.
- Temps réel : WebSockets (FastAPI) pour le partage live.
- Infra : Docker + docker-compose, Nginx en reverse proxy, cible de déploiement
  derrière Cloudflare.
- Tests : pytest (back), Vitest + React Testing Library (front), Playwright (e2e
  sur l'écran de saisie).

---

## Modèle de données (référence pour toutes les phases)

```
Organization (le tenant SaaS : un club)
  id, name, created_at

User
  id, org_id, email, display_name, role (owner|head_coach|assistant|viewer)

Team
  id, org_id, name
  (une équipe "maison" suivie joueur par joueur)

Player
  id, team_id, first_name, last_name, jersey_number,
  position (PG|SG|SF|PF|C), height_cm, weight_kg
  (affichage double unité cm/ft et kg/lbs géré côté front)

Game
  id, org_id, home_team_id, opponent_name, game_date,
  label (ex "Game 5", optionnel),
  ruleset (default FIBA), status (setup|live|final),
  home_score, opponent_score (dénormalisés, recalculés depuis les events)

GameRoster
  id, game_id, player_id, is_starter, dnp (bool)
  (qui est sur la feuille de ce match ; DNP exclu des moyennes par match)

GameEvent  (le coeur, append-only)
  id (UUID client), game_id, seq, period (1..N, N>4 = prolongations),
  game_clock (optionnel), wall_time,
  actor (enum: home_player | opponent_team),
  player_id (si actor = home_player),
  action_type (voir liste ci-dessous),
  x, y (coords normalisées 0..1 pour les tirs, sinon null),
  meta (json: assisted_by, blocked_by, foul_type, etc.),
  voided (bool, pour l'undo doux)
```

### Liste des `action_type`

Tirs (déclenchent la saisie de coordonnées sur le terrain) :
`FG2_MADE`, `FG2_MISS`, `FG3_MADE`, `FG3_MISS`, `FT_MADE`, `FT_MISS`
(les lancers francs FT n'ont pas de coordonnées).

Autres stats :
`REB_OFF`, `REB_DEF`, `ASSIST`, `STEAL`, `BLOCK`, `TURNOVER`,
`FOUL_COMMITTED`, `FOUL_DRAWN`, `SUB_IN`, `SUB_OUT`.

Adverse (niveau équipe, jamais joueur par joueur) :
`OPP_FT_MADE`, `OPP_FG2_MADE`, `OPP_FG3_MADE`, `OPP_FOUL`.

---

## Formules de statistiques (à implémenter exactement)

Colonnes du box score (comme l'app de référence) :
`FGM-A`, `2PM-A`, `3PM-A`, `FTM-A`, `OFF`, `DEF`, `TOT` (rebonds),
`AST`, `ST`, `TO`, `BS` (blocks), `PF` (fautes commises),
`FPF` (fautes provoquées), `EFF`, `PTS`.

- `PTS = 2*FG2_MADE + 3*FG3_MADE + FT_MADE`
- `FGM = FG2_MADE + FG3_MADE`, `FGA = FGM + FG2_MISS + FG3_MISS`
- `TOT_REB = REB_OFF + REB_DEF`
- `PF = FOUL_COMMITTED`, `FPF = FOUL_DRAWN`

Efficacité (EFF), formule vérifiée sur les données de l'app de référence :
```
EFF = (PTS + TOT_REB + AST + ST + BS)
      - (FGA - FGM)        // tirs manqués
      - (FTA - FT_MADE)    // lancers manqués
      - TO
```
(Contrôle : 21 PTS, 11 REB, 8 AST, 5 ST, 0 BS, FG 6/10, FT 7/10, 3 TO
donne 21+11+8+5+0 - 4 - 3 - 3 = 35.)

Stats avancées à ajouter (Phase 5) :
- `eFG% = (FGM + 0.5*FG3_MADE) / FGA`
- `TS% = PTS / (2*(FGA + 0.44*FTA))`
- `+/-` par joueur : différentiel de score pendant que le joueur est sur le
  terrain, calculé depuis les `SUB_IN`/`SUB_OUT` et les events de score.
- Minutes / temps de jeu : dérivé des paires SUB_IN/SUB_OUT et de l'horloge.

Pourcentages d'équipe (ligne Totals) : `FG%`, `2P%`, `3P%`, `FT%`.

---

## Règles FIBA à câbler dès le début

- 4 quarts-temps de 10 minutes, prolongations de 5 minutes.
- Compteur de **fautes d'équipe par quart-temps** ; indicateur "bonus" à partir
  de la 5e faute d'équipe dans le quart.
- Roster jusqu'à 12 joueurs, 5 sur le terrain.
- Terrain FIBA pour le shot chart : ligne à 3 points à 6,75 m (6,60 m dans les
  coins), raquette rectangulaire, dimensions officielles. Coordonnées de tir
  stockées normalisées (0..1) pour rester indépendantes de la taille d'écran.
- `ruleset` extensible (prévoir NBA/NCAA plus tard sans refonte).

---

## Découpage en phases

### Phase 0 : Scaffolding et infrastructure

Objectif : un squelette qui démarre et sur lequel on peut construire.

Livrables :
- Monorepo (`/backend`, `/frontend`, `/docs`, `docker-compose.yml`).
- FastAPI qui répond sur `/health`, PostgreSQL + Redis dans compose, Alembic
  configuré, une première migration vide.
- Front React + TS + Vite configuré en PWA (manifest + service worker), page
  d'accueil vide, connexion à l'API démarrée.
- Auth minimale (JWT maison ou Keycloak), un endpoint protégé de test.
- Lint + format (ruff/black côté back, eslint/prettier côté front), CI qui lance
  les tests.

Critères d'acceptation : `docker compose up` démarre tout, `/health` répond, le
front charge, un test back et un test front passent en CI.

**Point d'arrêt : montre-moi l'arborescence et le compose, attends validation.**

---

### Phase 1 : Domaine et moteur de calcul (backend)

Objectif : le modèle event-sourcé et la dérivation des stats, testés à fond.

Livrables :
- Tous les modèles SQLAlchemy + migrations (Organization, User, Team, Player,
  Game, GameRoster, GameEvent).
- CRUD REST : teams, players, games, rosters.
- Endpoint d'ingestion d'events en batch (idempotent sur l'UUID client).
- Moteur de dérivation : à partir des events d'un match, calcule le box score
  complet (toutes les colonnes ci-dessus) et le score.
- Suite de tests unitaires du moteur, avec au moins un match complet fixture
  reproduisant un box score connu, EFF et pourcentages compris.

Critères d'acceptation : le box score dérivé d'un match fixture est
numériquement exact (comparé à des valeurs attendues écrites en dur dans le test).

**Point d'arrêt : montre-moi le test du box score et son résultat.**

---

### Phase 2 : Écran de saisie live, offline-first (le coeur)

Objectif : reproduire et fluidifier l'écran de saisie de l'app de référence,
utilisable en salle sans réseau.

Spécification de l'écran (voir capture de référence) :
- **Scoreboard** en haut : nom équipe maison vs adversaire, score live, onglets
  Q1/Q2/Q3/Q4/OT. Affiche "Team fouls" du quart et "Quarter score".
- **Saisie en 2 temps, ordre indifférent** : l'utilisateur tape soit une action,
  soit un joueur, puis l'autre ; l'event est enregistré quand les deux sont
  choisis. Un bandeau "1st Step: select player or stat" guide l'état courant.
- **Boutons d'action**, regroupés :
  - 2PT : Made / Missed
  - 3PT : Made / Missed
  - Free throws : Made / Missed
  - Rebounds : Offensive / Defensive
  - Other : Block / Assist / Steal / Turnover
  - Personal fouls : Committed / Forced
- **Grille des joueurs** : un bouton par joueur du roster (numéro + nom).
- **Tir + coordonnées** : pour un FG2/FG3 Made/Missed, après joueur + action,
  l'utilisateur tape l'emplacement sur le terrain (panneau shot chart) pour
  enregistrer x/y, puis l'event est validé. FT sans coordonnées.
- **Opponent scores** : boutons Free Throw / 2 Points / 3 Points qui incrémentent
  le score adverse au niveau équipe (event `OPP_*`).
- **Play by Play** live à gauche : liste des events du quart, éditable, avec undo
  de la dernière action et suppression/correction d'un event.
- **Panneau stats live** à droite : mini box score (PTS, REB, AST, fautes en
  pastilles par joueur), mis à jour à chaque event.
- Boutons d'accès : Sketch Board (placeholder pour l'instant), Shot Chart,
  Box Score.

Offline :
- Chaque event écrit d'abord dans IndexedDB (Dexie), UI mise à jour immédiatement.
- File de sync + indicateur d'état (synchronisé / en attente / hors-ligne).
- Le box score live est recalculé côté client à partir des events locaux (réutilise
  la même logique que le back ; factorise les formules dans un module partagé si
  possible, sinon réimplémente et teste des deux côtés avec les mêmes fixtures).

Critères d'acceptation : je peux saisir un match entier en mode avion, fermer et
rouvrir l'app sans perte, puis synchroniser quand le réseau revient et retrouver
les mêmes chiffres côté serveur.

**Point d'arrêt : démo de saisie hors-ligne + resync.**

---

### Phase 3 : Shot chart

Objectif : saisie et visualisation des tirs sur terrain FIBA.

Livrables :
- Terrain FIBA rendu proprement (SVG), coordonnées normalisées.
- Marqueurs made (cercle) / missed (croix), couleurs distinctes.
- Vue Shot Chart : filtre par joueur (cases à cocher, Select All / Deselect All)
  et par quart (Q1..Q4/OT/All).
- Export image du shot chart.

Critères d'acceptation : les tirs saisis en Phase 2 s'affichent au bon endroit,
les filtres joueur et quart fonctionnent.

**Point d'arrêt.**

---

### Phase 4 : Robustesse de la synchronisation

Objectif : rendre la sync fiable dans les vraies conditions.

Livrables :
- Background sync via service worker, retry avec backoff.
- Idempotence stricte (rejouer un batch ne duplique rien).
- Gestion des reprises après crash / rechargement onglet en plein match.
- Tests e2e (Playwright) simulant coupure réseau pendant la saisie.

Critères d'acceptation : scénarios de coupure et de rechargement passent en e2e
sans perte ni doublon d'events.

**Point d'arrêt.**

---

### Phase 5 : Box score, statistiques de saison et exports

Objectif : les écrans d'analyse et de partage.

Livrables :
- Box score complet d'un match (toutes colonnes + ligne Totals avec %).
- Stats de saison par joueur : par adversaire, Totals, Averages, avec exclusion
  des matchs DNP des moyennes par match ("DNP games are not counted").
- Stats avancées : eFG%, TS%, +/-, minutes.
- Zones de tir agrégées (par zones du terrain) avec Total / Percent / Per Game.
- Exports : PDF (box score, stats saison) et CSV. Agrégations lourdes en Celery.

Critères d'acceptation : les moyennes de saison sont exactes sur un jeu de 2-3
matchs fixtures, DNP correctement exclus, export PDF lisible.

**Point d'arrêt.**

---

### Phase 6 : Couche SaaS et polish

Objectif : passer d'un outil mono-utilisateur à un vrai SaaS de club.

Livrables :
- Multi-tenant par Organization, migration vers Keycloak si pas déjà fait.
- Rôles et permissions (owner / head_coach / assistant / viewer).
- Partage live : page web spectateur en lecture seule alimentée par WebSocket
  (score, play-by-play, box score en direct).
- Backup / restore (export-import complet d'un club).
- Gestion des équipes/joueurs/saisons, recherche, filtres.
- Stub de facturation (plans) si tu veux, sinon laissé pour plus tard.

Critères d'acceptation : deux clubs isolés, un viewer ne peut pas éditer, la page
spectateur se met à jour en direct pendant une saisie.

**Point d'arrêt.**

---

### Phase 7 (bonus, plus tard) : IA et voix

Idées à ne PAS faire dans le MVP, à garder en backlog :
- Saisie vocale des actions (Azure Speech) : "numéro 7, deux points".
- Recaps de match générés par LLM à partir du play-by-play.
- Détection d'événements depuis la vidéo.

---

## Hors périmètre MVP (à refuser si ça dérive)

- Suivi joueur par joueur de l'équipe adverse (elle reste au niveau équipe).
- Intégration vidéo façon Hudl.
- App mobile native (la PWA couvre iPad/tablette).
- Multi-sport.

---

## Livrable attendu à la toute fin

Un dépôt qui démarre en une commande, un match saisissable hors-ligne de bout en
bout, box score et stats de saison exacts, shot chart FIBA, partage live, le tout
documenté et testé.
