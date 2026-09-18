from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings
from app.models.enums import UserRole

bearer_scheme = HTTPBearer()


@dataclass(frozen=True)
class CurrentUser:
    user_id: str
    org_id: str
    role: UserRole


def create_access_token(user_id: str, org_id: str, role: UserRole) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "org_id": org_id, "role": role.value, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> CurrentUser:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        ) from exc
    user_id = payload.get("sub")
    org_id = payload.get("org_id")
    role = payload.get("role")
    if user_id is None or org_id is None or role is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return CurrentUser(user_id=user_id, org_id=org_id, role=UserRole(role))


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    return decode_access_token(credentials.credentials)


def require_write(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Any role except viewer may create/update/delete data."""
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Viewers have read-only access"
        )
    return current_user


def require_owner(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if current_user.role != UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only an organization owner can do this"
        )
    return current_user
