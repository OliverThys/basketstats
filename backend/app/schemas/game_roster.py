from pydantic import BaseModel, ConfigDict


class GameRosterCreate(BaseModel):
    player_id: str
    is_starter: bool = False
    dnp: bool = False


class GameRosterUpdate(BaseModel):
    is_starter: bool
    dnp: bool


class GameRosterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    game_id: str
    player_id: str
    is_starter: bool
    dnp: bool
