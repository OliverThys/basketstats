from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.live import broadcaster
from app.models import Game, GameEvent, Player
from app.schemas.box_score import GameBoxScoreOut
from app.schemas.game_event import GameEventRead
from app.services.stats_queries import build_game_box_score

router = APIRouter(prefix="/live", tags=["live"])


def _get_game_by_share_token(share_token: str, db: Session) -> Game:
    game = db.scalar(select(Game).where(Game.share_token == share_token))
    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")
    return game


def build_live_snapshot(db: Session, game: Game) -> dict:
    box_score = GameBoxScoreOut.from_domain(build_game_box_score(db, game.id))
    recent_events = list(
        db.scalars(
            select(GameEvent)
            .where(GameEvent.game_id == game.id, GameEvent.voided.is_(False))
            .order_by(GameEvent.period.desc(), GameEvent.seq.desc())
            .limit(20)
        )
    )
    player_ids = {event.player_id for event in recent_events if event.player_id} | {
        player.player_id for player in box_score.players
    }
    player_names = {
        player.id: f"{player.first_name} {player.last_name}"
        for player in db.scalars(select(Player).where(Player.id.in_(player_ids)))
    }
    return {
        "type": "snapshot",
        "game": {
            "id": game.id,
            "opponent_name": game.opponent_name,
            "label": game.label,
            "status": game.status.value,
        },
        "box_score": box_score.model_dump(),
        "player_names": player_names,
        "recent_events": [
            {
                **GameEventRead.model_validate(event).model_dump(mode="json"),
                "player_name": player_names.get(event.player_id),
            }
            for event in recent_events
        ],
    }


@router.get("/{share_token}")
def get_live_snapshot(share_token: str, db: Session = Depends(get_db)) -> dict:
    game = _get_game_by_share_token(share_token, db)
    return build_live_snapshot(db, game)


@router.websocket("/{share_token}/ws")
async def live_game_socket(
    websocket: WebSocket, share_token: str, db: Session = Depends(get_db)
) -> None:
    game = db.scalar(select(Game).where(Game.share_token == share_token))
    if game is None:
        await websocket.close(code=4404)
        return

    await broadcaster.connect(share_token, websocket)
    try:
        await websocket.send_json(build_live_snapshot(db, game))
        while True:
            # Spectator connections are receive-only from the server's point of
            # view; we just need to detect disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        broadcaster.disconnect(share_token, websocket)
