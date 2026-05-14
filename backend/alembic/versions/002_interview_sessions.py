"""interview sessions

Revision ID: 002
Revises: 001
Create Date: 2026-05-13
"""
import re
import secrets

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def _gen_token(role: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", role.lower()).strip("-")[:40]
    return f"{slug}-{secrets.token_urlsafe(4)}"


def upgrade() -> None:
    op.add_column("jobs", sa.Column("public_token", sa.Text(), nullable=True))
    conn = op.get_bind()
    for row in conn.execute(sa.text("SELECT id, role FROM jobs")).fetchall():
        conn.execute(
            sa.text("UPDATE jobs SET public_token=:t WHERE id=:i"),
            {"t": _gen_token(row.role), "i": str(row.id)},
        )
    op.create_unique_constraint("uq_jobs_public_token", "jobs", ["public_token"])

    op.create_table(
        "interview_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("jobs.id"),
            nullable=False,
        ),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidates.id"),
            nullable=False,
        ),
        sa.Column("session_token_hash", sa.Text(), nullable=False, unique=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="started"),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "status IN ('started','in_progress','submitted','completed','failed','expired')",
            name="sessions_status_check",
        ),
    )
    op.create_index(
        "ix_sessions_job_candidate", "interview_sessions", ["job_id", "candidate_id"]
    )

    op.add_column(
        "interview_responses",
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("interview_sessions.id"),
            nullable=True,
        ),
    )
    op.create_unique_constraint(
        "uq_responses_session_question",
        "interview_responses",
        ["session_id", "question_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_responses_session_question", "interview_responses", type_="unique"
    )
    op.drop_column("interview_responses", "session_id")
    op.drop_index("ix_sessions_job_candidate", table_name="interview_sessions")
    op.drop_table("interview_sessions")
    op.drop_constraint("uq_jobs_public_token", "jobs", type_="unique")
    op.drop_column("jobs", "public_token")
