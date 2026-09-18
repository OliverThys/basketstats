from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import CurrentUser, get_current_user, require_write
from app.celery_app import compute_season_stats_task
from app.config import settings
from app.database import get_db
from app.exports import season_stats_csv, season_stats_pdf, shot_zones_csv
from app.models import Game, Team
from app.schemas.game import GameRead
from app.schemas.season import SeasonReportOut, ShotZoneReportOut
from app.schemas.team import TeamCreate, TeamRead, TeamUpdate
from app.services.authz import get_org_team
from app.services.stats_queries import (
    build_season_report,
    build_team_shot_zones,
    player_display_names,
)

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("", response_model=TeamRead, status_code=201)
def create_team(
    payload: TeamCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> Team:
    team = Team(org_id=current_user.org_id, name=payload.name)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@router.get("", response_model=list[TeamRead])
def list_teams(
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[Team]:
    stmt = select(Team).where(Team.org_id == current_user.org_id)
    if search:
        stmt = stmt.where(Team.name.ilike(f"%{search}%"))
    return list(db.scalars(stmt.order_by(Team.name)))


@router.get("/{team_id}", response_model=TeamRead)
def get_team(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Team:
    return get_org_team(db, team_id, current_user.org_id)


@router.put("/{team_id}", response_model=TeamRead)
def update_team(
    team_id: str,
    payload: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> Team:
    team = get_org_team(db, team_id, current_user.org_id)
    team.name = payload.name
    db.commit()
    db.refresh(team)
    return team


@router.delete("/{team_id}", status_code=204)
def delete_team(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_write),
) -> None:
    team = get_org_team(db, team_id, current_user.org_id)
    db.delete(team)
    db.commit()


@router.get("/{team_id}/games", response_model=list[GameRead])
def list_team_games(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[Game]:
    get_org_team(db, team_id, current_user.org_id)
    return list(
        db.scalars(select(Game).where(Game.home_team_id == team_id).order_by(Game.game_date))
    )


@router.get("/{team_id}/season-stats", response_model=SeasonReportOut)
def get_season_stats(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> SeasonReportOut:
    get_org_team(db, team_id, current_user.org_id)
    return SeasonReportOut.from_domain(build_season_report(db, team_id))


@router.post("/{team_id}/season-stats/jobs")
def enqueue_season_stats(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Queue Celery aggregation when a worker is up; otherwise compute inline."""
    get_org_team(db, team_id, current_user.org_id)
    if settings.celery_enabled:
        try:
            result = compute_season_stats_task.delay(team_id)
            return {"job_id": result.id, "status": "queued"}
        except Exception:
            pass
    report = SeasonReportOut.from_domain(build_season_report(db, team_id))
    return {"job_id": None, "status": "inline", "result": report.model_dump()}


@router.get("/{team_id}/season-stats.csv")
def get_season_stats_csv(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    team = get_org_team(db, team_id, current_user.org_id)
    names = player_display_names(db, team.id)
    content = season_stats_csv(build_season_report(db, team.id), names)
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="season-stats-{team_id}.csv"'},
    )


@router.get("/{team_id}/season-stats.pdf")
def get_season_stats_pdf(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    team = get_org_team(db, team_id, current_user.org_id)
    names = player_display_names(db, team.id)
    content = season_stats_pdf(build_season_report(db, team.id), names, f"{team.name} season stats")
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="season-stats-{team_id}.pdf"'},
    )


@router.get("/{team_id}/shot-zones", response_model=ShotZoneReportOut)
def get_team_shot_zones(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ShotZoneReportOut:
    get_org_team(db, team_id, current_user.org_id)
    return ShotZoneReportOut.from_domain(build_team_shot_zones(db, team_id))


@router.get("/{team_id}/shot-zones.csv")
def get_team_shot_zones_csv(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    get_org_team(db, team_id, current_user.org_id)
    content = shot_zones_csv(build_team_shot_zones(db, team_id))
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="shot-zones-{team_id}.csv"'},
    )
