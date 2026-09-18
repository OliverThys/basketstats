from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import CurrentUser, create_access_token, get_current_user, require_owner
from app.database import get_db
from app.models import Organization, User
from app.models.enums import UserRole
from app.schemas.auth import (
    InviteRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserRead,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Creates a brand new organization with the caller as its owner."""
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    org = Organization(name=payload.org_name)
    db.add(org)
    db.flush()

    user = User(
        org_id=org.id,
        email=payload.email,
        display_name=payload.display_name,
        role=UserRole.OWNER,
    )
    db.add(user)
    db.commit()

    token = create_access_token(user_id=user.id, org_id=user.org_id, role=user.role)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    # No password check yet: whoever knows a registered email can obtain a token.
    # Acceptable for the current single-club deployment target; replace with real
    # credential verification before opening registration to the public internet.
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        raise HTTPException(status_code=404, detail="No account for this email")
    token = create_access_token(user_id=user.id, org_id=user.org_id, role=user.role)
    return TokenResponse(access_token=token)


@router.post("/invite", response_model=UserRead, status_code=201)
def invite_user(
    payload: InviteRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_owner),
) -> User:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        org_id=current_user.org_id,
        email=payload.email,
        display_name=payload.display_name,
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserRead)
def read_current_user(
    db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)
) -> User:
    user = db.get(User, current_user.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
