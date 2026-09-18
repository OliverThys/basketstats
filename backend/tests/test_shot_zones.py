from app.domain.box_score import GameEventRecord
from app.domain.shot_zones import (
    ZONE_ABOVE_BREAK_THREE,
    ZONE_AT_RIM,
    ZONE_CORNER_THREE,
    ZONE_MID_RANGE,
    ZONE_PAINT,
    classify_shot_zone,
    compute_shot_zones,
)
from app.models.enums import ActionType, EventActor


def test_classify_common_fiba_spots() -> None:
    # Normalized hoop is ~0.887, 0.5
    assert classify_shot_zone(0.89, 0.5, is_three=False) == ZONE_AT_RIM
    assert classify_shot_zone(0.70, 0.5, is_three=False) == ZONE_PAINT
    assert classify_shot_zone(0.45, 0.5, is_three=False) == ZONE_MID_RANGE
    assert classify_shot_zone(0.95, 0.02, is_three=True) == ZONE_CORNER_THREE
    assert classify_shot_zone(0.4, 0.5, is_three=True) == ZONE_ABOVE_BREAK_THREE


def test_zone_totals_percent_and_per_game() -> None:
    events = [
        GameEventRecord(
            ActionType.FG2_MADE, EventActor.HOME_PLAYER, "p", x=0.89, y=0.5
        ),
        GameEventRecord(
            ActionType.FG2_MISS, EventActor.HOME_PLAYER, "p", x=0.89, y=0.5
        ),
        GameEventRecord(
            ActionType.FG3_MADE, EventActor.HOME_PLAYER, "p", x=0.4, y=0.5
        ),
    ]
    report = compute_shot_zones(events, games=2)
    rim = report.zones[ZONE_AT_RIM]
    assert rim.made == 1
    assert rim.attempted == 2
    assert rim.pct == 0.5
    assert rim.per_game(2) == 1.0
    three = report.zones[ZONE_ABOVE_BREAK_THREE]
    assert three.made == 1
    assert three.attempted == 1
