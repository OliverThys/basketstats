from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import create_access_token, get_current_subject

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    # Phase 0 placeholder: issues a token for any email, no password check yet.
    # Replaced by real credential/Keycloak auth in a later phase.
    token = create_access_token(subject=payload.email)
    return TokenResponse(access_token=token)


@router.get("/me")
def read_current_user(subject: str = Depends(get_current_subject)) -> dict:
    return {"subject": subject}
