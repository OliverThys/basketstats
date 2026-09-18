from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ActionType, EventActor


class GameEventIn(BaseModel):
    id: str
    seq: int
    period: int
    game_clock: str | None = None
    wall_time: datetime | None = None
    actor: EventActor
    player_id: str | None = None
    action_type: ActionType
    x: float | None = None
    y: float | None = None
    meta: dict = Field(default_factory=dict)
    voided: bool = False


class GameEventBatchIn(BaseModel):
    events: list[GameEventIn]


class GameEventBatchResult(BaseModel):
    inserted: int
    skipped_existing: int


class GameEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    game_id: str
    seq: int
    period: int
    game_clock: str | None
    wall_time: datetime
    actor: EventActor
    player_id: str | None
    action_type: ActionType
    x: float | None
    y: float | None
    meta: dict
    voided: bool
