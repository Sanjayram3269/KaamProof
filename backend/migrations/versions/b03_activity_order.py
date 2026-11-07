"""Stable, transaction-bound activity ordering."""

from alembic import op
import sqlalchemy as sa

revision = "b03_activity_order"
down_revision = "a82d311d0fda"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "activities", sa.Column("sequence", sa.Integer(), nullable=False, server_default="0")
    )
    # Same-second historical order is unknowable; establish a deterministic legacy order.
    op.execute("""WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY job_id ORDER BY created_at, id) AS position
        FROM activities
    ) UPDATE activities SET sequence = (SELECT position FROM ranked WHERE ranked.id = activities.id)""")
    op.execute("""UPDATE jobs SET revision = CASE
        WHEN revision <= COALESCE((SELECT MAX(sequence) FROM activities WHERE job_id=jobs.id), 0)
        THEN COALESCE((SELECT MAX(sequence) FROM activities WHERE job_id=jobs.id), 0) + 1
        ELSE revision END""")
    with op.batch_alter_table("activities") as batch:
        batch.alter_column("sequence", server_default=None)
        batch.create_unique_constraint("uq_activity_sequence", ["job_id", "sequence"])


def downgrade():
    with op.batch_alter_table("activities") as batch:
        batch.drop_constraint("uq_activity_sequence", type_="unique")
        batch.drop_column("sequence")
