# Formules de statistiques

Voir `brief.md` pour la spécification complète. Résumé :

```
PTS = 2*FG2_MADE + 3*FG3_MADE + FT_MADE
FGM = FG2_MADE + FG3_MADE
FGA = FGM + FG2_MISS + FG3_MISS
TOT_REB = REB_OFF + REB_DEF
PF = FOUL_COMMITTED
FPF = FOUL_DRAWN

EFF = (PTS + TOT_REB + AST + ST + BS)
      - (FGA - FGM)
      - (FTA - FT_MADE)
      - TO
```

Contrôle (fixture de référence) : 21 PTS, 11 REB, 8 AST, 5 ST, 0 BS,
FG 6/10, FT 7/10, 3 TO → EFF = 21+11+8+5+0 - 4 - 3 - 3 = 35.

Stats avancées (Phase 5) :

```
eFG% = (FGM + 0.5*FG3_MADE) / FGA
TS%  = PTS / (2*(FGA + 0.44*FTA))
```

`+/-` et minutes dérivés des paires `SUB_IN`/`SUB_OUT`.

Implémenté dans `backend/app/domain/box_score.py` : moteur pur
(`compute_box_score`), sans dépendance à SQLAlchemy, testé dans
`backend/tests/test_box_score_engine.py` avec un match complet à 10 joueurs
reproduisant exactement le box score de l'app de référence (voir
`backend/tests/fixtures/reference_game.py`), colonne par colonne, y compris
EFF et les pourcentages d'équipe (FG% 46.0, 2P% 48.8, 3P% 40.0, FT% 72.7).
