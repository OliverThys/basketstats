from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import CurrentUser, get_current_user, require_write
from app.database import get_db
from app.models import Player
from app.schemas.player import PlayerCreate, PlayerRead, PlayerUpdate
from app.services.authz import get_org_player, get_org_team

router = APIRouter(prefix="/players", tags=["players"])


@router.post("", response_model=PlayerRead, status_code=201)
def create_player(
    payload: PlayerCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> Player:
    get_org_team(db, payload.team_id, current_user.org_id)
    player = Player(**payload.model_dump())
    db.add(player)
    db.commit()
    db.refresh(player)
    return player


@router.get("", response_model=list[PlayerRead])
def list_players(
    team_id: str,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[Player]:
    get_org_team(db, team_id, current_user.org_id)
    stmt = select(Player).where(Player.team_id == team_id)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where((Player.first_name.ilike(pattern)) | (Player.last_name.ilike(pattern)))
    return list(db.scalars(stmt.order_by(Player.jersey_number)))


@router.get("/{player_id}", response_model=PlayerRead)
def get_player(
    player_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Player:
    return get_org_player(db, player_id, current_user.org_id)


@router.put("/{player_id}", response_model=PlayerRead)
def update_player(
    player_id: str,
    payload: PlayerUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> Player:
    player = get_org_player(db, player_id, current_user.org_id)
    for field_name, value in payload.model_dump().items():
        setattr(player, field_name, value)
    db.commit()
    db.refresh(player)
    return player


@router.delete("/{player_id}", status_code=204)
def delete_player(
    player_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> None:
    player = get_org_player(db, player_id, current_user.org_id)
    db.delete(player)
    db.commit()
