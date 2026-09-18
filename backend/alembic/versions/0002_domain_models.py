"""domain models: organizations, users, teams, players, games, rosters, events

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-18

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.models.enums import ActionType, EventActor, GameStatus, Position, UserRole

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("role", sa.Enum(UserRole, native_enum=False), nullable=False),
    )

    op.create_table(
        "teams",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
    )

    op.create_table(
        "players",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("team_id", sa.String(36), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("jersey_number", sa.Integer, nullable=False),
        sa.Column("position", sa.Enum(Position, native_enum=False), nullable=False),
        sa.Column("height_cm", sa.Integer, nullable=True),
        sa.Column("weight_kg", sa.Integer, nullable=True),
    )

    op.create_table(
        "games",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("home_team_id", sa.String(36), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("opponent_name", sa.String(200), nullable=False),
        sa.Column("game_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("label", sa.String(100), nullable=True),
        sa.Column("ruleset", sa.String(50), nullable=False, server_default="FIBA"),
        sa.Column(
            "status",
            sa.Enum(GameStatus, native_enum=False),
            nullable=False,
            server_default=GameStatus.SETUP.value,
        ),
        sa.Column("home_score", sa.Integer, nullable=False, server_default="0"),
        sa.Column("opponent_score", sa.Integer, nullable=False, server_default="0"),
    )

    op.create_table(
        "game_rosters",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("game_id", sa.String(36), sa.ForeignKey("games.id"), nullable=False),
        sa.Column("player_id", sa.String(36), sa.ForeignKey("players.id"), nullable=False),
        sa.Column("is_starter", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("dnp", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("game_id", "player_id", name="uq_game_roster_game_player"),
    )

    op.create_table(
        "game_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("game_id", sa.String(36), sa.ForeignKey("games.id"), nullable=False),
        sa.Column("seq", sa.Integer, nullable=False),
        sa.Column("period", sa.Integer, nullable=False),
        sa.Column("game_clock", sa.String(20), nullable=True),
        sa.Column("wall_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("actor", sa.Enum(EventActor, native_enum=False), nullable=False),
        sa.Column("player_id", sa.String(36), sa.ForeignKey("players.id"), nullable=True),
        sa.Column("action_type", sa.Enum(ActionType, native_enum=False), nullable=False),
        sa.Column("x", sa.Float, nullable=True),
        sa.Column("y", sa.Float, nullable=True),
        sa.Column("meta", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("voided", sa.Boolean, nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_game_events_game_id", "game_events", ["game_id"])


def downgrade() -> None:
    op.drop_index("ix_game_events_game_id", table_name="game_events")
    op.drop_table("game_events")
    op.drop_table("game_rosters")
    op.drop_table("games")
    op.drop_table("players")
    op.drop_table("teams")
    op.drop_table("users")
    op.drop_table("organizations")
