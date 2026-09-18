"""drop games.share_token — the public spectator link feature was removed

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-19

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("games") as batch_op:
        batch_op.drop_constraint("uq_games_share_token", type_="unique")
        batch_op.drop_column("share_token")


def downgrade() -> None:
    import uuid

    op.add_column("games", sa.Column("share_token", sa.String(32), nullable=True))

    games_table = sa.table("games", sa.column("id", sa.String), sa.column("share_token", sa.String))
    connection = op.get_bind()
    for (game_id,) in connection.execute(sa.select(games_table.c.id)):
        connection.execute(
            games_table.update()
            .where(games_table.c.id == game_id)
            .values(share_token=uuid.uuid4().hex)
        )

    with op.batch_alter_table("games") as batch_op:
        batch_op.alter_column("share_token", nullable=False)
        batch_op.create_unique_constraint("uq_games_share_token", ["share_token"])
