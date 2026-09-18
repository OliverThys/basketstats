from pydantic import BaseModel, ConfigDict

from app.models.enums import UserRole


class RegisterRequest(BaseModel):
    org_name: str
    email: str
    display_name: str


class LoginRequest(BaseModel):
    email: str


class InviteRequest(BaseModel):
    email: str
    display_name: str
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str
    email: str
    display_name: str
    role: UserRole
