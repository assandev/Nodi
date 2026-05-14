"""make invitation_id nullable in interview_responses

Revision ID: 003
Revises: 002
Create Date: 2026-05-14
"""
import sqlalchemy as sa
from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("interview_responses", "invitation_id", nullable=True)


def downgrade() -> None:
    op.alter_column("interview_responses", "invitation_id", nullable=False)
