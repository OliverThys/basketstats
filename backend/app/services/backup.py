from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Game, GameEvent, GameRoster, Organization, Player, Team
from app.schemas.backup import (
    BackupGame,
    BackupGameEvent,
    BackupGameRoster,
    BackupPlayer,
    BackupTeam,
    OrganizationBackup,
    RestoreResult,
)


def export_organization(db: Session, org: Organization) -> OrganizationBackup:
    teams = list(db.scalars(select(Team).where(Team.org_id == org.id)))
    team_ids = [team.id for team in teams]

    players = (
        list(db.scalars(select(Player).where(Player.team_id.in_(team_ids)))) if team_ids else []
    )
    games = list(db.scalars(select(Game).where(Game.org_id == org.id)))
    game_ids = [game.id for game in games]

    rosters = (
        list(db.scalars(select(GameRoster).where(GameRoster.game_id.in_(game_ids))))
        if game_ids
        else []
    )
    events = (
        list(db.scalars(select(GameEvent).where(GameEvent.game_id.in_(game_ids))))
        if game_ids
        else []
    )

    return OrganizationBackup(
        org_id=org.id,
        org_name=org.name,
        exported_at=datetime.now(UTC),
        teams=[BackupTeam.model_validate(team) for team in teams],
        players=[BackupPlayer.model_validate(player) for player in players],
        games=[BackupGame.model_validate(game) for game in games],
        rosters=[BackupGameRoster.model_validate(roster) for roster in rosters],
        events=[BackupGameEvent.model_validate(event) for event in events],
    )


def restore_organization(
    db: Session, org: Organization, backup: OrganizationBackup
) -> RestoreResult:
    """Replaces all of an organization's teams/players/games/rosters/events with the backup content.

    Restoring only ever targets the organization the backup was exported from
    (enforced by the caller), so this cannot be used to overwrite another club's data.
    """
    existing_games = list(db.scalars(select(Game).where(Game.org_id == org.id)))
    for game in existing_games:
        db.delete(game)  # cascades to rosters and events
    existing_teams = list(db.scalars(select(Team).where(Team.org_id == org.id)))
    for team in existing_teams:
        db.delete(team)  # cascades to players
    db.flush()

    for team in backup.teams:
        db.add(Team(id=team.id, org_id=org.id, name=team.name))
    for player in backup.players:
        db.add(Player(**player.model_dump()))
    for game in backup.games:
        db.add(Game(org_id=org.id, **game.model_dump()))
    for roster in backup.rosters:
        db.add(GameRoster(**roster.model_dump()))
    for event in backup.events:
        db.add(GameEvent(**event.model_dump()))

    org.name = backup.org_name
    db.commit()

    return RestoreResult(
        teams=len(backup.teams),
        players=len(backup.players),
        games=len(backup.games),
        rosters=len(backup.rosters),
        events=len(backup.events),
    )
