from app.domain.box_score import GameEventRecord, compute_box_score
from app.models.enums import ActionType, EventActor


def test_efg_and_ts_control_case() -> None:
    events = [
        *[GameEventRecord(ActionType.FG2_MADE, EventActor.HOME_PLAYER, "p") for _ in range(4)],
        *[GameEventRecord(ActionType.FG2_MISS, EventActor.HOME_PLAYER, "p") for _ in range(3)],
        *[GameEventRecord(ActionType.FG3_MADE, EventActor.HOME_PLAYER, "p") for _ in range(2)],
        *[GameEventRecord(ActionType.FG3_MISS, EventActor.HOME_PLAYER, "p") for _ in range(1)],
        *[GameEventRecord(ActionType.FT_MADE, EventActor.HOME_PLAYER, "p") for _ in range(7)],
        *[GameEventRecord(ActionType.FT_MISS, EventActor.HOME_PLAYER, "p") for _ in range(3)],
    ]
    row = compute_box_score(events).players["p"]
    assert row.fgm == 6
    assert row.fga == 10
    assert row.fg3m == 2
    assert abs(row.efg_pct - 0.7) < 1e-9
    assert abs(row.ts_pct - 21 / (2 * (10 + 0.44 * 10))) < 1e-9


def test_plus_minus_and_minutes_from_subs_and_clock() -> None:
    events = [
        GameEventRecord(
            ActionType.SUB_OUT, EventActor.HOME_PLAYER, "a", seq=1, period=1, game_clock="5:00"
        ),
        GameEventRecord(
            ActionType.SUB_IN, EventActor.HOME_PLAYER, "b", seq=2, period=1, game_clock="5:00"
        ),
        GameEventRecord(
            ActionType.FG2_MADE, EventActor.HOME_PLAYER, "b", seq=3, period=1, game_clock="4:00"
        ),
        GameEventRecord(
            ActionType.OPP_FG3_MADE, EventActor.OPPONENT_TEAM, seq=4, period=1, game_clock="2:00"
        ),
    ]
    box = compute_box_score(events, starter_ids=["a"])
    assert box.players["a"].minutes_s == 300
    assert box.players["a"].plus_minus == 0
    assert box.players["b"].minutes_s == 300
    assert box.players["b"].plus_minus == 2 - 3
    assert box.players["b"].pts == 2
