"""make evaluation.invitation_id nullable, add session_id

Revision ID: 004
Revises: 003
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("interview_evaluations", "invitation_id", nullable=True)
    op.add_column(
        "interview_evaluations",
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("interview_sessions.id"),
            nullable=True,
        ),
    )
    op.create_unique_constraint(
        "uq_evaluations_session", "interview_evaluations", ["session_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_evaluations_session", "interview_evaluations", type_="unique")
    op.drop_column("interview_evaluations", "session_id")
    op.alter_column("interview_evaluations", "invitation_id", nullable=False)
