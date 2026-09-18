from pydantic import BaseModel

from app.domain.box_score import GameBoxScore, PlayerBoxScore, TeamTotals


class PlayerBoxScoreOut(BaseModel):
    player_id: str
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
    eff: int
    pts: int
    efg_pct: float
    ts_pct: float
    plus_minus: int
    minutes: float

    @classmethod
    def from_domain(cls, row: PlayerBoxScore) -> "PlayerBoxScoreOut":
        return cls(
            player_id=row.player_id,
            fg2m=row.fg2m,
            fg2a=row.fg2a,
            fg3m=row.fg3m,
            fg3a=row.fg3a,
            fgm=row.fgm,
            fga=row.fga,
            ftm=row.ftm,
            fta=row.fta,
            reb_off=row.reb_off,
            reb_def=row.reb_def,
            reb_tot=row.reb_tot,
            ast=row.ast,
            stl=row.stl,
            tov=row.tov,
            blk=row.blk,
            pf=row.pf,
            fpf=row.fpf,
            eff=row.eff,
            pts=row.pts,
            efg_pct=row.efg_pct,
            ts_pct=row.ts_pct,
            plus_minus=row.plus_minus,
            minutes=row.minutes,
        )


class TeamTotalsOut(BaseModel):
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
    eff: int
    pts: int
    fg_pct: float
    fg2_pct: float
    fg3_pct: float
    ft_pct: float
    efg_pct: float
    ts_pct: float

    @classmethod
    def from_domain(cls, totals: TeamTotals) -> "TeamTotalsOut":
        return cls(
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
            eff=totals.eff,
            pts=totals.pts,
            fg_pct=totals.fg_pct,
            fg2_pct=totals.fg2_pct,
            fg3_pct=totals.fg3_pct,
            ft_pct=totals.ft_pct,
            efg_pct=totals.efg_pct,
            ts_pct=totals.ts_pct,
        )


class GameBoxScoreOut(BaseModel):
    players: list[PlayerBoxScoreOut]
    totals: TeamTotalsOut
    home_score: int
    opponent_score: int

    @classmethod
    def from_domain(cls, box_score: GameBoxScore) -> "GameBoxScoreOut":
        return cls(
            players=[PlayerBoxScoreOut.from_domain(row) for row in box_score.players.values()],
            totals=TeamTotalsOut.from_domain(box_score.totals),
            home_score=box_score.home_score,
            opponent_score=box_score.opponent_score,
        )
