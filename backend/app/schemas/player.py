from pydantic import BaseModel, ConfigDict

from app.models.enums import Position


class PlayerCreate(BaseModel):
    team_id: str
    first_name: str
    last_name: str
    jersey_number: int
    position: Position
    height_cm: int | None = None
    weight_kg: int | None = None


class PlayerUpdate(BaseModel):
    first_name: str
    last_name: str
    jersey_number: int
    position: Position
    height_cm: int | None = None
    weight_kg: int | None = None


class PlayerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_id: str
    first_name: str
    last_name: str
    jersey_number: int
    position: Position
    height_cm: int | None
    weight_kg: int | None
