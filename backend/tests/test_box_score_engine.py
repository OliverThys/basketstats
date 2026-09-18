import pytest

from app.domain.box_score import GameEventRecord, compute_box_score
from app.models.enums import ActionType, EventActor
from tests.fixtures.reference_game import (
    EXPECTED_HOME_SCORE,
    EXPECTED_TOTALS,
    REFERENCE_GAME_PLAYERS,
    build_reference_game_events,
)


def test_full_reference_game_box_score_matches_known_values() -> None:
    box_score = compute_box_score(build_reference_game_events())

    assert box_score.home_score == EXPECTED_HOME_SCORE
    assert len(box_score.players) == len(REFERENCE_GAME_PLAYERS)

    for fixture in REFERENCE_GAME_PLAYERS:
        row = box_score.players[fixture.player_id]
        assert row.fg2m == fixture.fg2m
        assert row.fg2a == fixture.fg2a
        assert row.fg3m == fixture.fg3m
        assert row.fg3a == fixture.fg3a
        assert row.fgm == fixture.fg2m + fixture.fg3m
        assert row.fga == fixture.fg2a + fixture.fg3a
        assert row.ftm == fixture.ftm
        assert row.fta == fixture.fta
        assert row.reb_off == fixture.reb_off
        assert row.reb_def == fixture.reb_def
        assert row.reb_tot == fixture.reb_off + fixture.reb_def
        assert row.ast == fixture.ast
        assert row.stl == fixture.stl
        assert row.tov == fixture.tov
        assert row.blk == fixture.blk
        assert row.pf == fixture.pf
        assert row.fpf == fixture.fpf
        assert row.pts == fixture.expected_pts
        assert row.eff == fixture.expected_eff

    totals = box_score.totals
    assert totals.fg2m == EXPECTED_TOTALS["fg2m"]
    assert totals.fg2a == EXPECTED_TOTALS["fg2a"]
    assert totals.fg3m == EXPECTED_TOTALS["fg3m"]
    assert totals.fg3a == EXPECTED_TOTALS["fg3a"]
    assert totals.fgm == EXPECTED_TOTALS["fgm"]
    assert totals.fga == EXPECTED_TOTALS["fga"]
    assert totals.ftm == EXPECTED_TOTALS["ftm"]
    assert totals.fta == EXPECTED_TOTALS["fta"]
    assert totals.reb_off == EXPECTED_TOTALS["reb_off"]
    assert totals.reb_def == EXPECTED_TOTALS["reb_def"]
    assert totals.reb_tot == EXPECTED_TOTALS["reb_tot"]
    assert totals.ast == EXPECTED_TOTALS["ast"]
    assert totals.stl == EXPECTED_TOTALS["stl"]
    assert totals.tov == EXPECTED_TOTALS["tov"]
    assert totals.blk == EXPECTED_TOTALS["blk"]
    assert totals.pf == EXPECTED_TOTALS["pf"]
    assert totals.fpf == EXPECTED_TOTALS["fpf"]
    assert totals.pts == EXPECTED_TOTALS["pts"]
    assert totals.eff == EXPECTED_TOTALS["eff"]

    assert totals.fg_pct == pytest.approx(29 / 63)
    assert totals.fg2_pct == pytest.approx(21 / 43)
    assert totals.fg3_pct == pytest.approx(8 / 20)
    assert totals.ft_pct == pytest.approx(16 / 22)
    assert round(totals.fg_pct * 100, 1) == 46.0
    assert round(totals.fg2_pct * 100, 1) == 48.8
    assert round(totals.fg3_pct * 100, 1) == 40.0
    assert round(totals.ft_pct * 100, 1) == 72.7


def test_eff_control_case_from_brief() -> None:
    """21 PTS, 11 REB, 8 AST, 5 ST, 0 BS, FG 6/10, FT 7/10, 3 TO -> EFF 35."""
    events = [
        *[GameEventRecord(ActionType.FG2_MADE, EventActor.HOME_PLAYER, "p") for _ in range(4)],
        *[GameEventRecord(ActionType.FG2_MISS, EventActor.HOME_PLAYER, "p") for _ in range(3)],
        *[GameEventRecord(ActionType.FG3_MADE, EventActor.HOME_PLAYER, "p") for _ in range(2)],
        *[GameEventRecord(ActionType.FG3_MISS, EventActor.HOME_PLAYER, "p") for _ in range(1)],
        *[GameEventRecord(ActionType.FT_MADE, EventActor.HOME_PLAYER, "p") for _ in range(7)],
        *[GameEventRecord(ActionType.FT_MISS, EventActor.HOME_PLAYER, "p") for _ in range(3)],
        *[GameEventRecord(ActionType.REB_OFF, EventActor.HOME_PLAYER, "p") for _ in range(3)],
        *[GameEventRecord(ActionType.REB_DEF, EventActor.HOME_PLAYER, "p") for _ in range(8)],
        *[GameEventRecord(ActionType.ASSIST, EventActor.HOME_PLAYER, "p") for _ in range(8)],
        *[GameEventRecord(ActionType.STEAL, EventActor.HOME_PLAYER, "p") for _ in range(5)],
        *[GameEventRecord(ActionType.TURNOVER, EventActor.HOME_PLAYER, "p") for _ in range(3)],
    ]
    row = compute_box_score(events).players["p"]
    assert row.pts == 21
    assert row.reb_tot == 11
    assert row.eff == 35


def test_opponent_events_only_affect_opponent_score() -> None:
    events = [
        GameEventRecord(ActionType.OPP_FT_MADE, EventActor.OPPONENT_TEAM),
        GameEventRecord(ActionType.OPP_FG2_MADE, EventActor.OPPONENT_TEAM),
        GameEventRecord(ActionType.OPP_FG3_MADE, EventActor.OPPONENT_TEAM),
        GameEventRecord(ActionType.OPP_FOUL, EventActor.OPPONENT_TEAM),
    ]
    box_score = compute_box_score(events)
    assert box_score.opponent_score == 1 + 2 + 3
    assert box_score.home_score == 0
    assert box_score.players == {}


def test_voided_events_are_excluded() -> None:
    events = [
        GameEventRecord(ActionType.FG3_MADE, EventActor.HOME_PLAYER, "p"),
        GameEventRecord(ActionType.FG3_MADE, EventActor.HOME_PLAYER, "p", voided=True),
    ]
    row = compute_box_score(events).players["p"]
    assert row.fg3m == 1
    assert row.pts == 3


def test_home_player_event_without_player_id_raises() -> None:
    events = [GameEventRecord(ActionType.FG2_MADE, EventActor.HOME_PLAYER, player_id=None)]
    with pytest.raises(ValueError, match="missing player_id"):
        compute_box_score(events)
