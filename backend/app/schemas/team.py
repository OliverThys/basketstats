from pydantic import BaseModel, ConfigDict


class TeamCreate(BaseModel):
    org_id: str
    name: str


class TeamUpdate(BaseModel):
    name: str


class TeamRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str
    name: str
