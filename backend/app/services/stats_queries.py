from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.box_score import GameBoxScore, GameEventRecord, compute_box_score
from app.domain.season import RosterEntry, SeasonGameInput, SeasonReport, compute_season_stats
from app.domain.shot_zones import ShotZoneReport, compute_shot_zones
from app.models import Game, GameEvent, GameRoster, Player


def _events_for_game(db: Session, game_id: str) -> list[GameEventRecord]:
    rows = db.scalars(
        select(GameEvent)
        .where(GameEvent.game_id == game_id)
        .order_by(GameEvent.period, GameEvent.seq)
    ).all()
    return [GameEventRecord.from_orm(row) for row in rows]


def _roster_for_game(db: Session, game_id: str) -> list[RosterEntry]:
    rows = db.scalars(select(GameRoster).where(GameRoster.game_id == game_id)).all()
    return [
        RosterEntry(player_id=row.player_id, is_starter=row.is_starter, dnp=row.dnp)
        for row in rows
    ]


def load_season_games(db: Session, team_id: str) -> list[SeasonGameInput]:
    games = db.scalars(
        select(Game).where(Game.home_team_id == team_id).order_by(Game.game_date)
    ).all()
    return [
        SeasonGameInput(
            opponent_name=game.opponent_name,
            events=_events_for_game(db, game.id),
            roster=_roster_for_game(db, game.id),
        )
        for game in games
    ]


def build_season_report(db: Session, team_id: str) -> SeasonReport:
    return compute_season_stats(load_season_games(db, team_id))


def build_game_box_score(db: Session, game_id: str) -> GameBoxScore:
    roster = _roster_for_game(db, game_id)
    starters = [entry.player_id for entry in roster if entry.is_starter and not entry.dnp]
    return compute_box_score(_events_for_game(db, game_id), starter_ids=starters)


def build_game_shot_zones(db: Session, game_id: str) -> ShotZoneReport:
    return compute_shot_zones(_events_for_game(db, game_id), games=1)


def build_team_shot_zones(db: Session, team_id: str) -> ShotZoneReport:
    games = load_season_games(db, team_id)
    events = [event for game in games for event in game.events]
    return compute_shot_zones(events, games=len(games) or 1)


def player_display_names(db: Session, team_id: str) -> dict[str, str]:
    players = db.scalars(select(Player).where(Player.team_id == team_id)).all()
    return {player.id: f"{player.first_name} {player.last_name}" for player in players}
