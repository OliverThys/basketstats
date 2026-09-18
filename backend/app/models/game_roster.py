import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.game import Game
    from app.models.player import Player


class GameRoster(Base):
    __tablename__ = "game_rosters"
    __table_args__ = (UniqueConstraint("game_id", "player_id", name="uq_game_roster_game_player"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    game_id: Mapped[str] = mapped_column(String(36), ForeignKey("games.id"))
    player_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"))
    is_starter: Mapped[bool] = mapped_column(Boolean, default=False)
    dnp: Mapped[bool] = mapped_column(Boolean, default=False)

    game: Mapped["Game"] = relationship(back_populates="roster_entries")
    player: Mapped["Player"] = relationship()
