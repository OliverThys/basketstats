"""Season aggregation: per-player totals / averages / by opponent, DNP excluded."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.domain.box_score import GameBoxScore, GameEventRecord, PlayerBoxScore, compute_box_score


@dataclass(frozen=True)
class RosterEntry:
    player_id: str
    is_starter: bool = False
    dnp: bool = False


@dataclass(frozen=True)
class SeasonGameInput:
    opponent_name: str
    events: list[GameEventRecord]
    roster: list[RosterEntry]


@dataclass
class CountingTotals:
    games_played: int = 0
    fg2m: int = 0
    fg2a: int = 0
    fg3m: int = 0
    fg3a: int = 0
    ftm: int = 0
    fta: int = 0
    reb_off: int = 0
    reb_def: int = 0
    ast: int = 0
    stl: int = 0
    tov: int = 0
    blk: int = 0
    pf: int = 0
    fpf: int = 0
    pts: int = 0
    plus_minus: int = 0
    minutes_s: int = 0

    @property
    def fgm(self) -> int:
        return self.fg2m + self.fg3m

    @property
    def fga(self) -> int:
        return self.fg2a + self.fg3a

    @property
    def reb_tot(self) -> int:
        return self.reb_off + self.reb_def

    @property
    def efg_pct(self) -> float:
        return (self.fgm + 0.5 * self.fg3m) / self.fga if self.fga else 0.0

    @property
    def ts_pct(self) -> float:
        denom = 2 * (self.fga + 0.44 * self.fta)
        return self.pts / denom if denom else 0.0

    def add_game(self, row: PlayerBoxScore) -> None:
        self.games_played += 1
        self.fg2m += row.fg2m
        self.fg2a += row.fg2a
        self.fg3m += row.fg3m
        self.fg3a += row.fg3a
        self.ftm += row.ftm
        self.fta += row.fta
        self.reb_off += row.reb_off
        self.reb_def += row.reb_def
        self.ast += row.ast
        self.stl += row.stl
        self.tov += row.tov
        self.blk += row.blk
        self.pf += row.pf
        self.fpf += row.fpf
        self.pts += row.pts
        self.plus_minus += row.plus_minus
        self.minutes_s += row.minutes_s

    def average(self, attr: str) -> float:
        if self.games_played == 0:
            return 0.0
        return getattr(self, attr) / self.games_played


@dataclass
class PlayerSeasonStats:
    player_id: str
    totals: CountingTotals = field(default_factory=CountingTotals)
    by_opponent: dict[str, CountingTotals] = field(default_factory=dict)


@dataclass
class SeasonReport:
    players: dict[str, PlayerSeasonStats] = field(default_factory=dict)
    games: int = 0


def compute_season_stats(games: list[SeasonGameInput]) -> SeasonReport:
    """DNP games are not counted in a player's games_played or averages."""
    report = SeasonReport(games=len(games))
    for game in games:
        starters = [entry.player_id for entry in game.roster if entry.is_starter and not entry.dnp]
        box: GameBoxScore = compute_box_score(game.events, starter_ids=starters)
        for entry in game.roster:
            if entry.dnp:
                continue
            stats = report.players.setdefault(
                entry.player_id, PlayerSeasonStats(player_id=entry.player_id)
            )
            row = box.players.get(entry.player_id) or PlayerBoxScore(player_id=entry.player_id)
            stats.totals.add_game(row)
            opp = stats.by_opponent.setdefault(game.opponent_name, CountingTotals())
            opp.add_game(row)
    return report
