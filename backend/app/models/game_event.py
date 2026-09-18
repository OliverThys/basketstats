from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ActionType, EventActor

if TYPE_CHECKING:
    from app.models.game import Game
    from app.models.player import Player


class GameEvent(Base):
    __tablename__ = "game_events"

    # Client-generated UUID (no server default): makes offline sync idempotent.
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    game_id: Mapped[str] = mapped_column(String(36), ForeignKey("games.id"))
    seq: Mapped[int] = mapped_column(Integer)
    period: Mapped[int] = mapped_column(Integer)
    game_clock: Mapped[str | None] = mapped_column(String(20), nullable=True)
    wall_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    actor: Mapped[EventActor] = mapped_column(Enum(EventActor, native_enum=False))
    player_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("players.id"), nullable=True
    )
    action_type: Mapped[ActionType] = mapped_column(Enum(ActionType, native_enum=False))
    x: Mapped[float | None] = mapped_column(Float, nullable=True)
    y: Mapped[float | None] = mapped_column(Float, nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    voided: Mapped[bool] = mapped_column(Boolean, default=False)

    game: Mapped["Game"] = relationship(back_populates="events")
    player: Mapped["Player | None"] = relationship()
