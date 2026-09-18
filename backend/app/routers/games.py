from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import CurrentUser, get_current_user, require_write
from app.database import get_db
from app.exports import box_score_csv, box_score_pdf, shot_zones_csv
from app.live import broadcaster
from app.models import Game, GameEvent, GameRoster
from app.routers.live import build_live_snapshot
from app.schemas.box_score import GameBoxScoreOut
from app.schemas.game import GameCreate, GameRead, GameUpdate
from app.schemas.game_event import GameEventBatchIn, GameEventBatchResult, GameEventRead
from app.schemas.game_roster import GameRosterCreate, GameRosterRead, GameRosterUpdate
from app.schemas.season import ShotZoneReportOut
from app.services.authz import get_org_game, get_org_roster_entry, get_org_team
from app.services.stats_queries import (
    build_game_box_score,
    build_game_shot_zones,
    player_display_names,
)

router = APIRouter(prefix="/games", tags=["games"])


@router.post("", response_model=GameRead, status_code=201)
def create_game(
    payload: GameCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> Game:
    get_org_team(db, payload.home_team_id, current_user.org_id)
    game = Game(org_id=current_user.org_id, **payload.model_dump())
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


@router.get("", response_model=list[GameRead])
def list_games(
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[Game]:
    stmt = select(Game).where(Game.org_id == current_user.org_id)
    if search:
        stmt = stmt.where(Game.opponent_name.ilike(f"%{search}%"))
    return list(db.scalars(stmt.order_by(Game.game_date.desc())))


@router.get("/{game_id}", response_model=GameRead)
def get_game(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Game:
    return get_org_game(db, game_id, current_user.org_id)


@router.put("/{game_id}", response_model=GameRead)
def update_game(
    game_id: str,
    payload: GameUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> Game:
    game = get_org_game(db, game_id, current_user.org_id)
    for field_name, value in payload.model_dump().items():
        setattr(game, field_name, value)
    db.commit()
    db.refresh(game)
    return game


@router.delete("/{game_id}", status_code=204)
def delete_game(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> None:
    game = get_org_game(db, game_id, current_user.org_id)
    db.delete(game)
    db.commit()


@router.post("/{game_id}/roster", response_model=GameRosterRead, status_code=201)
def add_roster_entry(
    game_id: str,
    payload: GameRosterCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> GameRoster:
    get_org_game(db, game_id, current_user.org_id)
    entry = GameRoster(game_id=game_id, **payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{game_id}/roster", response_model=list[GameRosterRead])
def list_roster(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[GameRoster]:
    get_org_game(db, game_id, current_user.org_id)
    return list(db.scalars(select(GameRoster).where(GameRoster.game_id == game_id)))


@router.put("/{game_id}/roster/{roster_id}", response_model=GameRosterRead)
def update_roster_entry(
    game_id: str,
    roster_id: str,
    payload: GameRosterUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> GameRoster:
    entry = get_org_roster_entry(db, game_id, roster_id, current_user.org_id)
    entry.is_starter = payload.is_starter
    entry.dnp = payload.dnp
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{game_id}/roster/{roster_id}", status_code=204)
def delete_roster_entry(
    game_id: str,
    roster_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> None:
    entry = get_org_roster_entry(db, game_id, roster_id, current_user.org_id)
    db.delete(entry)
    db.commit()


@router.post("/{game_id}/events/batch", response_model=GameEventBatchResult)
async def ingest_events_batch(
    game_id: str,
    payload: GameEventBatchIn,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> GameEventBatchResult:
    """Idempotent on the client-generated event UUID: replaying a batch never duplicates rows.

    Concurrent retries of the same UUID are absorbed via savepoints so a race
    between two in-flight syncs cannot insert duplicates.
    """
    game = get_org_game(db, game_id, current_user.org_id)

    incoming_ids = [event.id for event in payload.events]
    existing_ids = (
        set(db.scalars(select(GameEvent.id).where(GameEvent.id.in_(incoming_ids))))
        if incoming_ids
        else set()
    )

    inserted = 0
    skipped_existing = len(existing_ids)
    for event_in in payload.events:
        if event_in.id in existing_ids:
            continue
        try:
            with db.begin_nested():
                db.add(GameEvent(game_id=game_id, **event_in.model_dump()))
                db.flush()
            inserted += 1
            existing_ids.add(event_in.id)
        except IntegrityError:
            skipped_existing += 1

    db.commit()
    if inserted:
        await broadcaster.broadcast(game.share_token, build_live_snapshot(db, game))
    return GameEventBatchResult(inserted=inserted, skipped_existing=skipped_existing)


@router.get("/{game_id}/events", response_model=list[GameEventRead])
def list_events(
    game_id: str,
    include_voided: bool = False,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[GameEvent]:
    get_org_game(db, game_id, current_user.org_id)
    stmt = select(GameEvent).where(GameEvent.game_id == game_id)
    if not include_voided:
        stmt = stmt.where(GameEvent.voided.is_(False))
    return list(db.scalars(stmt.order_by(GameEvent.period, GameEvent.seq)))


@router.delete("/{game_id}/events/{event_id}", status_code=204)
async def void_event(
    game_id: str,
    event_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> None:
    """Soft-delete: marks the event voided rather than removing it from the journal."""
    game = get_org_game(db, game_id, current_user.org_id)
    event = db.get(GameEvent, event_id)
    if event is None or event.game_id != game_id:
        raise HTTPException(status_code=404, detail="Event not found")
    event.voided = True
    db.commit()
    await broadcaster.broadcast(game.share_token, build_live_snapshot(db, game))


@router.get("/{game_id}/box-score", response_model=GameBoxScoreOut)
def get_box_score(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> GameBoxScoreOut:
    game = get_org_game(db, game_id, current_user.org_id)
    return GameBoxScoreOut.from_domain(build_game_box_score(db, game.id))


@router.get("/{game_id}/box-score.csv")
def get_box_score_csv(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    game = get_org_game(db, game_id, current_user.org_id)
    names = player_display_names(db, game.home_team_id)
    content = box_score_csv(build_game_box_score(db, game.id), names)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="box-score-{game_id}.csv"'},
    )


@router.get("/{game_id}/box-score.pdf")
def get_box_score_pdf(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    game = get_org_game(db, game_id, current_user.org_id)
    names = player_display_names(db, game.home_team_id)
    title = f"{game.label or 'Box score'} vs {game.opponent_name}"
    content = box_score_pdf(build_game_box_score(db, game.id), names, title)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="box-score-{game_id}.pdf"'},
    )


@router.get("/{game_id}/shot-zones", response_model=ShotZoneReportOut)
def get_game_shot_zones(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ShotZoneReportOut:
    get_org_game(db, game_id, current_user.org_id)
    return ShotZoneReportOut.from_domain(build_game_shot_zones(db, game_id))


@router.get("/{game_id}/shot-zones.csv")
def get_game_shot_zones_csv(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    get_org_game(db, game_id, current_user.org_id)
    content = shot_zones_csv(build_game_shot_zones(db, game_id))
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="shot-zones-{game_id}.csv"'},
    )
