from app.domain.box_score import GameEventRecord
from app.domain.season import RosterEntry, SeasonGameInput, compute_season_stats
from app.models.enums import ActionType, EventActor


def _pts(player_id: str, made2: int) -> list[GameEventRecord]:
    return [
        GameEventRecord(ActionType.FG2_MADE, EventActor.HOME_PLAYER, player_id)
        for _ in range(made2)
    ]


def test_season_averages_exclude_dnp_games() -> None:
    player = "p1"
    games = [
        SeasonGameInput(
            opponent_name="Opp A",
            events=_pts(player, 5),
            roster=[RosterEntry(player, is_starter=True, dnp=False)],
        ),
        SeasonGameInput(
            opponent_name="Opp B",
            events=_pts(player, 10),
            roster=[RosterEntry(player, is_starter=True, dnp=False)],
        ),
        SeasonGameInput(
            opponent_name="Opp A",
            events=_pts(player, 8),
            roster=[RosterEntry(player, is_starter=False, dnp=True)],
        ),
    ]
    report = compute_season_stats(games)
    stats = report.players[player]
    assert stats.totals.games_played == 2
    assert stats.totals.pts == 10 + 20
    assert stats.totals.average("pts") == 15
    assert stats.by_opponent["Opp A"].games_played == 1
    assert stats.by_opponent["Opp A"].pts == 10
    assert stats.by_opponent["Opp B"].pts == 20
    assert "p1" in report.players
    assert report.games == 3
