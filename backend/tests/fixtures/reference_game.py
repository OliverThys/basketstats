"""Full-game fixture reproducing a known box score from the reference app
(see docs/reference-app/ box score screenshot). Every derived column below
(FGM-A, 2PM-A, 3PM-A, FTM-A, rebounds, AST, ST, TO, BS, PF, FPF, EFF, PTS,
team totals and shooting percentages) was cross-checked by hand against
that screenshot before being hard-coded here.
"""

from dataclasses import dataclass

from app.domain.box_score import GameEventRecord
from app.models.enums import ActionType, EventActor


@dataclass(frozen=True)
class PlayerFixture:
    player_id: str
    fg2m: int
    fg2a: int
    fg3m: int
    fg3a: int
    ftm: int
    fta: int
    reb_off: int
    reb_def: int
    ast: int
    stl: int
    tov: int
    blk: int
    pf: int
    fpf: int
    expected_pts: int
    expected_eff: int


REFERENCE_GAME_PLAYERS: list[PlayerFixture] = [
    PlayerFixture("korchagin", 0, 3, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 3, 3),
    PlayerFixture("kotishevski", 0, 4, 0, 1, 1, 2, 0, 0, 0, 1, 0, 0, 3, 0, 1, -4),
    PlayerFixture("beverly", 4, 7, 2, 3, 7, 10, 3, 8, 8, 5, 3, 0, 1, 6, 21, 35),
    PlayerFixture("zupan", 5, 6, 0, 1, 3, 4, 2, 3, 1, 3, 2, 0, 4, 4, 13, 17),
    PlayerFixture("zozulin", 0, 2, 2, 4, 0, 0, 0, 1, 2, 0, 1, 0, 5, 3, 6, 4),
    PlayerFixture("ponkrashov", 1, 3, 2, 5, 0, 0, 0, 1, 0, 2, 1, 0, 1, 0, 8, 5),
    PlayerFixture("dycok", 2, 2, 0, 0, 0, 0, 1, 2, 0, 2, 1, 0, 3, 0, 4, 8),
    PlayerFixture("bashminov", 6, 8, 0, 0, 3, 4, 1, 2, 0, 0, 0, 0, 3, 2, 15, 15),
    PlayerFixture("kolesnikov", 1, 2, 0, 2, 0, 0, 1, 0, 2, 0, 1, 0, 0, 0, 2, 1),
    PlayerFixture("domercant", 2, 6, 1, 3, 2, 2, 0, 3, 2, 0, 2, 0, 2, 4, 9, 6),
]

EXPECTED_TOTALS = {
    "fg2m": 21,
    "fg2a": 43,
    "fg3m": 8,
    "fg3a": 20,
    "fgm": 29,
    "fga": 63,
    "ftm": 16,
    "fta": 22,
    "reb_off": 9,
    "reb_def": 21,
    "reb_tot": 30,
    "ast": 16,
    "stl": 13,
    "tov": 11,
    "blk": 0,
    "pf": 23,
    "fpf": 20,
    "eff": 90,
    "pts": 82,
}
EXPECTED_HOME_SCORE = 82


def _repeat(action_type: ActionType, player_id: str, count: int) -> list[GameEventRecord]:
    return [
        GameEventRecord(action_type=action_type, actor=EventActor.HOME_PLAYER, player_id=player_id)
        for _ in range(count)
    ]


def build_reference_game_events() -> list[GameEventRecord]:
    events: list[GameEventRecord] = []
    for p in REFERENCE_GAME_PLAYERS:
        fg2_miss = p.fg2a - p.fg2m
        fg3_miss = p.fg3a - p.fg3m
        ft_miss = p.fta - p.ftm
        events += _repeat(ActionType.FG2_MADE, p.player_id, p.fg2m)
        events += _repeat(ActionType.FG2_MISS, p.player_id, fg2_miss)
        events += _repeat(ActionType.FG3_MADE, p.player_id, p.fg3m)
        events += _repeat(ActionType.FG3_MISS, p.player_id, fg3_miss)
        events += _repeat(ActionType.FT_MADE, p.player_id, p.ftm)
        events += _repeat(ActionType.FT_MISS, p.player_id, ft_miss)
        events += _repeat(ActionType.REB_OFF, p.player_id, p.reb_off)
        events += _repeat(ActionType.REB_DEF, p.player_id, p.reb_def)
        events += _repeat(ActionType.ASSIST, p.player_id, p.ast)
        events += _repeat(ActionType.STEAL, p.player_id, p.stl)
        events += _repeat(ActionType.TURNOVER, p.player_id, p.tov)
        events += _repeat(ActionType.BLOCK, p.player_id, p.blk)
        events += _repeat(ActionType.FOUL_COMMITTED, p.player_id, p.pf)
        events += _repeat(ActionType.FOUL_DRAWN, p.player_id, p.fpf)
    return events
