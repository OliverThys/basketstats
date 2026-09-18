"""Pure derivation engine: GameEvent journal -> box score.

Deliberately decoupled from SQLAlchemy so it can be unit-tested without a
database and reused verbatim by any future consumer (Celery aggregations,
exports, etc). Callers adapt ORM rows to `GameEventRecord` via `from_orm`.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import dataclass, field

from app.models.enums import ActionType, EventActor


@dataclass(frozen=True)
class GameEventRecord:
    action_type: ActionType
    actor: EventActor
    player_id: str | None = None
    voided: bool = False
    seq: int = 0
    period: int = 1
    game_clock: str | None = None
    x: float | None = None
    y: float | None = None

    @classmethod
    def from_orm(cls, event: object) -> GameEventRecord:
        return cls(
            action_type=event.action_type,  # type: ignore[attr-defined]
            actor=event.actor,  # type: ignore[attr-defined]
            player_id=event.player_id,  # type: ignore[attr-defined]
            voided=event.voided,  # type: ignore[attr-defined]
            seq=getattr(event, "seq", 0),
            period=getattr(event, "period", 1),
            game_clock=getattr(event, "game_clock", None),
            x=getattr(event, "x", None),
            y=getattr(event, "y", None),
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

    @property
    def efg_pct(self) -> float:
        return (self.fgm + 0.5 * self.fg3m) / self.fga if self.fga else 0.0

    @property
    def ts_pct(self) -> float:
        denom = 2 * (self.fga + 0.44 * self.fta)
        return self.pts / denom if denom else 0.0


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
    plus_minus: int = 0
    minutes_s: int = 0

    @property
    def reb_tot(self) -> int:
        return self.reb_off + self.reb_def

    @property
    def minutes(self) -> float:
        return self.minutes_s / 60.0

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


def compute_box_score(
    events: Iterable[GameEventRecord],
    starter_ids: Iterable[str] | None = None,
) -> GameBoxScore:
    players: dict[str, PlayerBoxScore] = {}
    home_score = 0
    opponent_score = 0
    records = list(events)

    def player_row(player_id: str) -> PlayerBoxScore:
        if player_id not in players:
            players[player_id] = PlayerBoxScore(player_id=player_id)
        return players[player_id]

    for event in records:
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
                pass  # substitutions feed minutes / +/- after counting stats
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

    active = [event for event in records if not event.voided]
    _apply_lineup_stats(players, player_row, active, starter_ids)

    return GameBoxScore(
        players=players,
        totals=totals,
        home_score=home_score,
        opponent_score=opponent_score,
    )


def period_length_s(period: int) -> int:
    return 600 if period <= 4 else 300


def parse_game_clock(clock: str | None) -> int | None:
    if not clock:
        return None
    parts = clock.split(":")
    if len(parts) != 2:
        return None
    try:
        return int(parts[0]) * 60 + int(parts[1])
    except ValueError:
        return None


def _apply_lineup_stats(
    players: dict[str, PlayerBoxScore],
    player_row: Callable[[str], PlayerBoxScore],
    events: list[GameEventRecord],
    starter_ids: Iterable[str] | None,
) -> None:
    ordered = sorted(events, key=lambda event: (event.period, event.seq))
    on_court: set[str] = set(starter_ids or [])
    check_in: dict[str, int | None] = {}
    current_period: int | None = None
    remaining: int | None = None

    def close_period() -> None:
        for pid in on_court:
            start = check_in.get(pid)
            if start is not None:
                player_row(pid).minutes_s += max(start, 0)

    def tick_clock(new_remaining: int) -> None:
        for pid in on_court:
            start = check_in.get(pid)
            if start is not None:
                player_row(pid).minutes_s += max(start - new_remaining, 0)
            check_in[pid] = new_remaining

    for event in ordered:
        if event.period != current_period:
            if current_period is not None:
                close_period()
            current_period = event.period
            remaining = period_length_s(event.period)
            for pid in on_court:
                check_in[pid] = remaining

        clock = parse_game_clock(event.game_clock)
        if clock is not None:
            tick_clock(clock)
            remaining = clock

        if event.actor == EventActor.HOME_PLAYER and event.player_id:
            if event.action_type == ActionType.SUB_IN:
                on_court.add(event.player_id)
                check_in[event.player_id] = remaining
            elif event.action_type == ActionType.SUB_OUT:
                close_start = check_in.pop(event.player_id, None)
                if close_start is not None and remaining is not None:
                    player_row(event.player_id).minutes_s += max(close_start - remaining, 0)
                on_court.discard(event.player_id)

        delta = 0
        if event.actor == EventActor.HOME_PLAYER:
            if event.action_type == ActionType.FG2_MADE:
                delta = 2
            elif event.action_type == ActionType.FG3_MADE:
                delta = 3
            elif event.action_type == ActionType.FT_MADE:
                delta = 1
        elif (
            event.actor == EventActor.OPPONENT_TEAM
            and event.action_type in _OPPONENT_POINTS_BY_ACTION
        ):
            delta = -_OPPONENT_POINTS_BY_ACTION[event.action_type]
        if delta:
            for pid in on_court:
                player_row(pid).plus_minus += delta

    close_period()
