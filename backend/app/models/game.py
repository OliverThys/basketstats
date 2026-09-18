import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import GameStatus

if TYPE_CHECKING:
    from app.models.game_event import GameEvent
    from app.models.game_roster import GameRoster
    from app.models.organization import Organization
    from app.models.team import Team


class Game(Base):
    __tablename__ = "games"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"))
    home_team_id: Mapped[str] = mapped_column(String(36), ForeignKey("teams.id"))
    opponent_name: Mapped[str] = mapped_column(String(200))
    game_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ruleset: Mapped[str] = mapped_column(String(50), default="FIBA")
    status: Mapped[GameStatus] = mapped_column(
        Enum(GameStatus, native_enum=False), default=GameStatus.SETUP
    )
    home_score: Mapped[int] = mapped_column(Integer, default=0)
    opponent_score: Mapped[int] = mapped_column(Integer, default=0)

    organization: Mapped["Organization"] = relationship(back_populates="games")
    home_team: Mapped["Team"] = relationship(back_populates="games")
    roster_entries: Mapped[list["GameRoster"]] = relationship(
        back_populates="game", cascade="all, delete-orphan"
    )
    events: Mapped[list["GameEvent"]] = relationship(
        back_populates="game", cascade="all, delete-orphan", order_by="GameEvent.seq"
    )
