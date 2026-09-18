from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ActionType, EventActor, GameStatus, Position


class BackupTeam(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str


class BackupPlayer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_id: str
    first_name: str
    last_name: str
    jersey_number: int
    position: Position
    height_cm: int | None
    weight_kg: int | None


class BackupGame(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    home_team_id: str
    opponent_name: str
    game_date: datetime
    label: str | None
    ruleset: str
    status: GameStatus
    share_token: str


class BackupGameRoster(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    game_id: str
    player_id: str
    is_starter: bool
    dnp: bool


class BackupGameEvent(BaseModel):
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


class OrganizationBackup(BaseModel):
    org_id: str
    org_name: str
    exported_at: datetime
    teams: list[BackupTeam]
    players: list[BackupPlayer]
    games: list[BackupGame]
    rosters: list[BackupGameRoster]
    events: list[BackupGameEvent]


class RestoreResult(BaseModel):
    teams: int
    players: int
    games: int
    rosters: int
    events: int
