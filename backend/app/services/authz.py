from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Game, GameRoster, Player, Team


def get_org_team(db: Session, team_id: str, org_id: str) -> Team:
    """Fetches a team, 404ing if it doesn't exist or belongs to another org.

    Returning 404 (not 403) for cross-tenant access avoids confirming to a
    caller that a given id exists in someone else's organization.
    """
    team = db.get(Team, team_id)
    if team is None or team.org_id != org_id:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


def get_org_game(db: Session, game_id: str, org_id: str) -> Game:
    game = db.get(Game, game_id)
    if game is None or game.org_id != org_id:
        raise HTTPException(status_code=404, detail="Game not found")
    return game


def get_org_player(db: Session, player_id: str, org_id: str) -> Player:
    player = db.get(Player, player_id)
    if player is None or player.team.org_id != org_id:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


def get_org_roster_entry(db: Session, game_id: str, roster_id: str, org_id: str) -> GameRoster:
    entry = db.get(GameRoster, roster_id)
    if entry is None or entry.game_id != game_id or entry.game.org_id != org_id:
        raise HTTPException(status_code=404, detail="Roster entry not found")
    return entry
