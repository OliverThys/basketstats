"""Pure derivation engine: GameEvent journal -> box score.

Deliberately decoupled from SQLAlchemy so it can be unit-tested without a
database and reused verbatim by any future consumer (Celery aggregations,
exports, etc). Callers adapt ORM rows to `GameEventRecord` via `from_orm`.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field

from app.models.enums import ActionType, EventActor


@dataclass(frozen=True)
class GameEventRecord:
    action_type: ActionType
    actor: EventActor
    player_id: str | None = None
    voided: bool = False

    @classmethod
    def from_orm(cls, event: object) -> GameEventRecord:
        return cls(
            action_type=event.action_type,  # type: ignore[attr-defined]
            actor=event.actor,  # type: ignore[attr-defined]
            player_id=event.player_id,  # type: ignore[attr-defined]
            voided=event.voided,  # type: ignore[attr-defined]
        )


def _pct(made: int, attempted: int) -> float:
    return made / attempted if attempted else 0.0


@dataclass
class _ShootingLine:
    fg2m: int = 0
    fg2a: int = 0
    fg3m: int = 0
    fg3a: int = 0
    ftm: int = 0
    fta: int = 0

    @property
    def fgm(self) -> int:
        return self.fg2m + self.fg3m

    @property
    def fga(self) -> int:
        return self.fg2a + self.fg3a

    @property
    def pts(self) -> int:
        return 2 * self.fg2m + 3 * self.fg3m + self.ftm

    @property
    def fg_pct(self) -> float:
        return _pct(self.fgm, self.fga)

    @property
    def fg2_pct(self) -> float:
        return _pct(self.fg2m, self.fg2a)

    @property
    def fg3_pct(self) -> float:
        return _pct(self.fg3m, self.fg3a)

    @property
    def ft_pct(self) -> float:
        return _pct(self.ftm, self.fta)


@dataclass
class PlayerBoxScore(_ShootingLine):
    player_id: str = ""
    reb_off: int = 0
    reb_def: int = 0
    ast: int = 0
    stl: int = 0
    tov: int = 0
    blk: int = 0
    pf: int = 0
    fpf: int = 0

    @property
    def reb_tot(self) -> int:
        return self.reb_off + self.reb_def

    @property
    def eff(self) -> int:
        return (
            (self.pts + self.reb_tot + self.ast + self.stl + self.blk)
            - (self.fga - self.fgm)
            - (self.fta - self.ftm)
            - self.tov
        )


@dataclass
class TeamTotals(_ShootingLine):
    reb_off: int = 0
    reb_def: int = 0
    ast: int = 0
    stl: int = 0
    tov: int = 0
    blk: int = 0
    pf: int = 0
    fpf: int = 0

    @property
    def reb_tot(self) -> int:
        return self.reb_off + self.reb_def

    @property
    def eff(self) -> int:
        return (
            (self.pts + self.reb_tot + self.ast + self.stl + self.blk)
            - (self.fga - self.fgm)
            - (self.fta - self.ftm)
            - self.tov
        )


@dataclass
class GameBoxScore:
    players: dict[str, PlayerBoxScore] = field(default_factory=dict)
    totals: TeamTotals = field(default_factory=TeamTotals)
    home_score: int = 0
    opponent_score: int = 0


_HOME_STAT_FIELD_BY_ACTION: dict[ActionType, str] = {
    ActionType.REB_OFF: "reb_off",
    ActionType.REB_DEF: "reb_def",
    ActionType.ASSIST: "ast",
    ActionType.STEAL: "stl",
    ActionType.BLOCK: "blk",
    ActionType.TURNOVER: "tov",
    ActionType.FOUL_COMMITTED: "pf",
    ActionType.FOUL_DRAWN: "fpf",
}

_HOME_IGNORED_ACTIONS = frozenset({ActionType.SUB_IN, ActionType.SUB_OUT})

_OPPONENT_POINTS_BY_ACTION: dict[ActionType, int] = {
    ActionType.OPP_FT_MADE: 1,
    ActionType.OPP_FG2_MADE: 2,
    ActionType.OPP_FG3_MADE: 3,
}

_OPPONENT_IGNORED_ACTIONS = frozenset({ActionType.OPP_FOUL})


def compute_box_score(events: Iterable[GameEventRecord]) -> GameBoxScore:
    players: dict[str, PlayerBoxScore] = {}
    home_score = 0
    opponent_score = 0

    def player_row(player_id: str) -> PlayerBoxScore:
        if player_id not in players:
            players[player_id] = PlayerBoxScore(player_id=player_id)
        return players[player_id]

    for event in events:
        if event.voided:
            continue

        if event.actor == EventActor.HOME_PLAYER:
            if event.player_id is None:
                raise ValueError(f"home_player event {event.action_type} is missing player_id")
            row = player_row(event.player_id)
            action = event.action_type

            if action == ActionType.FG2_MADE:
                row.fg2m += 1
                row.fg2a += 1
                home_score += 2
            elif action == ActionType.FG2_MISS:
                row.fg2a += 1
            elif action == ActionType.FG3_MADE:
                row.fg3m += 1
                row.fg3a += 1
                home_score += 3
            elif action == ActionType.FG3_MISS:
                row.fg3a += 1
            elif action == ActionType.FT_MADE:
                row.ftm += 1
                row.fta += 1
                home_score += 1
            elif action == ActionType.FT_MISS:
                row.fta += 1
            elif action in _HOME_STAT_FIELD_BY_ACTION:
                field_name = _HOME_STAT_FIELD_BY_ACTION[action]
                setattr(row, field_name, getattr(row, field_name) + 1)
            elif action in _HOME_IGNORED_ACTIONS:
                pass  # substitutions feed minutes / +- derivation in a later phase
            else:
                raise ValueError(f"Unsupported home_player action_type: {action}")

        elif event.actor == EventActor.OPPONENT_TEAM:
            action = event.action_type
            if action in _OPPONENT_POINTS_BY_ACTION:
                opponent_score += _OPPONENT_POINTS_BY_ACTION[action]
            elif action in _OPPONENT_IGNORED_ACTIONS:
                pass  # team-foul-per-quarter / bonus indicator is a Phase 2 concern
            else:
                raise ValueError(f"Unsupported opponent_team action_type: {action}")
        else:
            raise ValueError(f"Unknown actor: {event.actor}")

    totals = TeamTotals()
    for row in players.values():
        totals.fg2m += row.fg2m
        totals.fg2a += row.fg2a
        totals.fg3m += row.fg3m
        totals.fg3a += row.fg3a
        totals.ftm += row.ftm
        totals.fta += row.fta
        totals.reb_off += row.reb_off
        totals.reb_def += row.reb_def
        totals.ast += row.ast
        totals.stl += row.stl
        totals.tov += row.tov
        totals.blk += row.blk
        totals.pf += row.pf
        totals.fpf += row.fpf

    return GameBoxScore(
        players=players,
        totals=totals,
        home_score=home_score,
        opponent_score=opponent_score,
    )
