"""FIBA half-court shot zones from normalized (0..1) coordinates."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field

from app.domain.box_score import GameEventRecord
from app.models.enums import ActionType, EventActor

COURT_LENGTH_M = 14.0
COURT_WIDTH_M = 15.0
BASKET_TO_BASELINE_M = 1.575
BASKET_X_M = COURT_LENGTH_M - BASKET_TO_BASELINE_M
BASKET_Y_M = COURT_WIDTH_M / 2
RESTRICTED_AREA_RADIUS_M = 1.25
KEY_WIDTH_M = 4.9
KEY_LENGTH_M = 5.8
THREE_POINT_SIDELINE_GAP_M = 0.9

ZONE_AT_RIM = "at_rim"
ZONE_PAINT = "paint"
ZONE_MID_RANGE = "mid_range"
ZONE_CORNER_THREE = "corner_three"
ZONE_ABOVE_BREAK_THREE = "above_break_three"

SHOT_ZONES = (
    ZONE_AT_RIM,
    ZONE_PAINT,
    ZONE_MID_RANGE,
    ZONE_CORNER_THREE,
    ZONE_ABOVE_BREAK_THREE,
)

_MADE = {ActionType.FG2_MADE, ActionType.FG3_MADE}
_SHOTS = {ActionType.FG2_MADE, ActionType.FG2_MISS, ActionType.FG3_MADE, ActionType.FG3_MISS}
_THREES = {ActionType.FG3_MADE, ActionType.FG3_MISS}


@dataclass
class ZoneLine:
    zone: str
    made: int = 0
    attempted: int = 0

    @property
    def pct(self) -> float:
        return self.made / self.attempted if self.attempted else 0.0

    def per_game(self, games: int) -> float:
        return self.attempted / games if games else 0.0


@dataclass
class ShotZoneReport:
    zones: dict[str, ZoneLine] = field(default_factory=dict)
    games: int = 0

    def __post_init__(self) -> None:
        if not self.zones:
            self.zones = {zone: ZoneLine(zone=zone) for zone in SHOT_ZONES}


def classify_shot_zone(normalized_x: float, normalized_y: float, is_three: bool) -> str:
    x = normalized_x * COURT_LENGTH_M
    y = normalized_y * COURT_WIDTH_M
    dist = ((x - BASKET_X_M) ** 2 + (y - BASKET_Y_M) ** 2) ** 0.5
    in_key = (x >= COURT_LENGTH_M - KEY_LENGTH_M) and (abs(y - BASKET_Y_M) <= KEY_WIDTH_M / 2)

    if is_three:
        if y <= THREE_POINT_SIDELINE_GAP_M or y >= COURT_WIDTH_M - THREE_POINT_SIDELINE_GAP_M:
            return ZONE_CORNER_THREE
        return ZONE_ABOVE_BREAK_THREE
    if dist <= RESTRICTED_AREA_RADIUS_M:
        return ZONE_AT_RIM
    if in_key:
        return ZONE_PAINT
    return ZONE_MID_RANGE


def compute_shot_zones(events: list[GameEventRecord], games: int = 1) -> ShotZoneReport:
    report = ShotZoneReport(games=games)
    for event in events:
        if event.voided or event.actor != EventActor.HOME_PLAYER:
            continue
        if event.action_type not in _SHOTS or event.x is None or event.y is None:
            continue
        zone = classify_shot_zone(event.x, event.y, event.action_type in _THREES)
        line = report.zones[zone]
        line.attempted += 1
        if event.action_type in _MADE:
            line.made += 1
    return report


def compute_player_shot_zones(
    events: list[GameEventRecord], games: int = 1
) -> dict[str, ShotZoneReport]:
    by_player: dict[str, list[GameEventRecord]] = defaultdict(list)
    for event in events:
        if event.player_id:
            by_player[event.player_id].append(event)
    return {
        player_id: compute_shot_zones(shots, games=games) for player_id, shots in by_player.items()
    }
