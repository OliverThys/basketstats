from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.celery_app import compute_season_stats_task
from app.config import settings
from app.database import get_db
from app.exports import season_stats_csv, season_stats_pdf, shot_zones_csv
from app.models import Game, Team
from app.schemas.game import GameRead
from app.schemas.season import SeasonReportOut, ShotZoneReportOut
from app.schemas.team import TeamCreate, TeamRead, TeamUpdate
from app.services.stats_queries import (
    build_season_report,
    build_team_shot_zones,
    player_display_names,
)

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("", response_model=TeamRead, status_code=201)
def create_team(payload: TeamCreate, db: Session = Depends(get_db)) -> Team:
    team = Team(**payload.model_dump())
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@router.get("", response_model=list[TeamRead])
def list_teams(org_id: str, db: Session = Depends(get_db)) -> list[Team]:
    return list(db.scalars(select(Team).where(Team.org_id == org_id)))


@router.get("/{team_id}", response_model=TeamRead)
def get_team(team_id: str, db: Session = Depends(get_db)) -> Team:
    team = db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.put("/{team_id}", response_model=TeamRead)
def update_team(team_id: str, payload: TeamUpdate, db: Session = Depends(get_db)) -> Team:
    team = db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    team.name = payload.name
    db.commit()
    db.refresh(team)
    return team


@router.delete("/{team_id}", status_code=204)
def delete_team(team_id: str, db: Session = Depends(get_db)) -> None:
    team = db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    db.delete(team)
    db.commit()


def _get_team_or_404(team_id: str, db: Session) -> Team:
    team = db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.get("/{team_id}/games", response_model=list[GameRead])
def list_team_games(team_id: str, db: Session = Depends(get_db)) -> list[Game]:
    _get_team_or_404(team_id, db)
    return list(
        db.scalars(select(Game).where(Game.home_team_id == team_id).order_by(Game.game_date))
    )


@router.get("/{team_id}/season-stats", response_model=SeasonReportOut)
def get_season_stats(team_id: str, db: Session = Depends(get_db)) -> SeasonReportOut:
    _get_team_or_404(team_id, db)
    return SeasonReportOut.from_domain(build_season_report(db, team_id))


@router.post("/{team_id}/season-stats/jobs")
def enqueue_season_stats(team_id: str, db: Session = Depends(get_db)) -> dict:
    """Queue Celery aggregation when a worker is up; otherwise compute inline."""
    _get_team_or_404(team_id, db)
    if settings.celery_enabled:
        try:
            result = compute_season_stats_task.delay(team_id)
            return {"job_id": result.id, "status": "queued"}
        except Exception:
            pass
    report = SeasonReportOut.from_domain(build_season_report(db, team_id))
    return {"job_id": None, "status": "inline", "result": report.model_dump()}


@router.get("/{team_id}/season-stats.csv")
def get_season_stats_csv(team_id: str, db: Session = Depends(get_db)) -> Response:
    team = _get_team_or_404(team_id, db)
    names = player_display_names(db, team.id)
    content = season_stats_csv(build_season_report(db, team.id), names)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="season-stats-{team_id}.csv"'},
    )


@router.get("/{team_id}/season-stats.pdf")
def get_season_stats_pdf(team_id: str, db: Session = Depends(get_db)) -> Response:
    team = _get_team_or_404(team_id, db)
    names = player_display_names(db, team.id)
    content = season_stats_pdf(build_season_report(db, team.id), names, f"{team.name} season stats")
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="season-stats-{team_id}.pdf"'},
    )


@router.get("/{team_id}/shot-zones", response_model=ShotZoneReportOut)
def get_team_shot_zones(team_id: str, db: Session = Depends(get_db)) -> ShotZoneReportOut:
    _get_team_or_404(team_id, db)
    return ShotZoneReportOut.from_domain(build_team_shot_zones(db, team_id))


@router.get("/{team_id}/shot-zones.csv")
def get_team_shot_zones_csv(team_id: str, db: Session = Depends(get_db)) -> Response:
    _get_team_or_404(team_id, db)
    content = shot_zones_csv(build_team_shot_zones(db, team_id))
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="shot-zones-{team_id}.csv"'},
    )
