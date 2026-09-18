from pydantic import BaseModel

from app.domain.season import CountingTotals, PlayerSeasonStats, SeasonReport
from app.domain.shot_zones import ShotZoneReport, ZoneLine


class CountingTotalsOut(BaseModel):
    games_played: int
    fg2m: int
    fg2a: int
    fg3m: int
    fg3a: int
    fgm: int
    fga: int
    ftm: int
    fta: int
    reb_off: int
    reb_def: int
    reb_tot: int
    ast: int
    stl: int
    tov: int
    blk: int
    pf: int
    fpf: int
    pts: int
    plus_minus: int
    minutes: float
    efg_pct: float
    ts_pct: float
    pts_avg: float

    @classmethod
    def from_domain(cls, totals: CountingTotals) -> "CountingTotalsOut":
        return cls(
            games_played=totals.games_played,
            fg2m=totals.fg2m,
            fg2a=totals.fg2a,
            fg3m=totals.fg3m,
            fg3a=totals.fg3a,
            fgm=totals.fgm,
            fga=totals.fga,
            ftm=totals.ftm,
            fta=totals.fta,
            reb_off=totals.reb_off,
            reb_def=totals.reb_def,
            reb_tot=totals.reb_tot,
            ast=totals.ast,
            stl=totals.stl,
            tov=totals.tov,
            blk=totals.blk,
            pf=totals.pf,
            fpf=totals.fpf,
            pts=totals.pts,
            plus_minus=totals.plus_minus,
            minutes=totals.minutes_s / 60,
            efg_pct=totals.efg_pct,
            ts_pct=totals.ts_pct,
            pts_avg=totals.average("pts"),
        )


class PlayerSeasonStatsOut(BaseModel):
    player_id: str
    totals: CountingTotalsOut
    by_opponent: dict[str, CountingTotalsOut]

    @classmethod
    def from_domain(cls, stats: PlayerSeasonStats) -> "PlayerSeasonStatsOut":
        return cls(
            player_id=stats.player_id,
            totals=CountingTotalsOut.from_domain(stats.totals),
            by_opponent={
                name: CountingTotalsOut.from_domain(totals)
                for name, totals in stats.by_opponent.items()
            },
        )


class SeasonReportOut(BaseModel):
    games: int
    players: list[PlayerSeasonStatsOut]

    @classmethod
    def from_domain(cls, report: SeasonReport) -> "SeasonReportOut":
        return cls(
            games=report.games,
            players=[PlayerSeasonStatsOut.from_domain(stats) for stats in report.players.values()],
        )


class ZoneLineOut(BaseModel):
    zone: str
    made: int
    attempted: int
    pct: float
    per_game: float

    @classmethod
    def from_domain(cls, line: ZoneLine, games: int) -> "ZoneLineOut":
        return cls(
            zone=line.zone,
            made=line.made,
            attempted=line.attempted,
            pct=line.pct,
            per_game=line.per_game(games),
        )


class ShotZoneReportOut(BaseModel):
    games: int
    zones: list[ZoneLineOut]

    @classmethod
    def from_domain(cls, report: ShotZoneReport) -> "ShotZoneReportOut":
        return cls(
            games=report.games,
            zones=[ZoneLineOut.from_domain(line, report.games) for line in report.zones.values()],
        )
