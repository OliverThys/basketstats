# Modèle de données

Référence : voir `brief.md` pour le détail complet. Résumé des entités
(implémentées progressivement à partir de la Phase 1) :

- `Organization` — tenant SaaS (un club).
- `User` — appartient à une organization, rôle `owner|head_coach|assistant|viewer`.
- `Team` — équipe suivie joueur par joueur, appartient à une organization.
- `Player` — appartient à une team.
- `Game` — match, `ruleset` par défaut FIBA, `status` `setup|live|final`.
- `GameRoster` — feuille de match (qui joue, titulaire, DNP).
- `GameEvent` — journal d'événements append-only (play-by-play), source de
  vérité unique. Box score, pourcentages, +/-, minutes, shot charts et stats
  de saison sont tous dérivés de `GameEvent`, jamais stockés en agrégat.

À compléter au fil des phases avec le schéma SQLAlchemy réel et les
diagrammes de relations.
