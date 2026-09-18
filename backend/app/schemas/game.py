from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import GameStatus


class GameCreate(BaseModel):
    org_id: str
    home_team_id: str
    opponent_name: str
    game_date: datetime
    label: str | None = None
    ruleset: str = "FIBA"


class GameUpdate(BaseModel):
    opponent_name: str
    game_date: datetime
    label: str | None = None
    ruleset: str
    status: GameStatus


class GameRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str
    home_team_id: str
    opponent_name: str
    game_date: datetime
    label: str | None
    ruleset: str
    status: GameStatus
    home_score: int
    opponent_score: int
