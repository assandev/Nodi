"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.Text, nullable=False),
        sa.Column("hashed_password", sa.Text, nullable=False),
        sa.Column("full_name", sa.Text, nullable=False),
        sa.Column("role", sa.Text, nullable=False, server_default="recruiter"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.CheckConstraint("role IN ('recruiter', 'admin')", name="users_role_check"),
    )
    op.create_index("idx_users_email", "users", ["email"])

    op.create_table(
        "jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("recruiter_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("company", sa.Text, nullable=False),
        sa.Column("role", sa.Text, nullable=False),
        sa.Column("job_description", sa.Text, nullable=False),
        sa.Column("responsibilities", sa.Text),
        sa.Column("requirements", sa.Text),
        sa.Column("culture_notes", sa.Text),
        sa.Column("status", sa.Text, nullable=False, server_default="draft"),
        sa.Column("ai_question_suggestions", JSONB),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("status IN ('draft', 'active', 'paused', 'closed')", name="jobs_status_check"),
    )
    op.create_index("idx_jobs_recruiter_id", "jobs", ["recruiter_id"])
    op.create_index("idx_jobs_status", "jobs", ["status"])

    op.create_table(
        "interview_questions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("job_id", UUID(as_uuid=True), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("question_text", sa.Text, nullable=False),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("time_limit_seconds", sa.Integer),
        sa.Column("question_type", sa.Text, nullable=False, server_default="voice"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("job_id", "position", name="uq_questions_job_position"),
        sa.CheckConstraint("time_limit_seconds > 0", name="questions_time_limit_check"),
        sa.CheckConstraint("question_type IN ('voice', 'text')", name="questions_type_check"),
    )
    op.create_index("idx_interview_questions_job_id", "interview_questions", ["job_id"])

    op.create_table(
        "candidates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("full_name", sa.Text, nullable=False),
        sa.Column("email", sa.Text, nullable=False),
        sa.Column("phone", sa.Text, nullable=False),
        sa.Column("linkedin_url", sa.Text),
        sa.Column("portfolio_url", sa.Text),
        sa.Column("location", sa.Text),
        sa.Column("years_experience", sa.Integer),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("years_experience >= 0", name="candidates_years_experience_check"),
    )
    op.create_index("idx_candidates_email", "candidates", ["email"])

    op.create_table(
        "interview_invitations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("job_id", UUID(as_uuid=True), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("invited_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("candidate_id", UUID(as_uuid=True), sa.ForeignKey("candidates.id"), nullable=True),
        sa.Column("token_hash", sa.Text, nullable=False),
        sa.Column("status", sa.Text, nullable=False, server_default="pending"),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("submitted_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("token_hash", name="uq_invitations_token_hash"),
        sa.CheckConstraint(
            "status IN ('pending','in_progress','submitted','processing','completed','expired','failed')",
            name="invitations_status_check",
        ),
    )
    op.create_index("idx_invitations_job_id", "interview_invitations", ["job_id"])
    op.create_index("idx_invitations_candidate_id", "interview_invitations", ["candidate_id"])
    op.create_index("idx_invitations_invited_by", "interview_invitations", ["invited_by"])
    op.create_index("idx_invitations_status", "interview_invitations", ["status"])
    op.create_index("idx_invitations_token_hash", "interview_invitations", ["token_hash"])

    op.create_table(
        "interview_responses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("invitation_id", UUID(as_uuid=True), sa.ForeignKey("interview_invitations.id"), nullable=False),
        sa.Column("question_id", UUID(as_uuid=True), sa.ForeignKey("interview_questions.id"), nullable=False),
        sa.Column("audio_storage_key", sa.Text),
        sa.Column("audio_duration_seconds", sa.Integer),
        sa.Column("transcript", sa.Text),
        sa.Column("transcription_status", sa.Text, nullable=False, server_default="pending"),
        sa.Column("recorded_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("invitation_id", "question_id", name="uq_responses_invitation_question"),
        sa.CheckConstraint("audio_duration_seconds >= 0", name="responses_duration_check"),
        sa.CheckConstraint(
            "transcription_status IN ('pending','processing','completed','failed')",
            name="responses_transcription_status_check",
        ),
    )
    op.create_index("idx_responses_invitation_id", "interview_responses", ["invitation_id"])
    op.create_index("idx_responses_question_id", "interview_responses", ["question_id"])

    op.create_table(
        "interview_evaluations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("invitation_id", UUID(as_uuid=True), sa.ForeignKey("interview_invitations.id"), nullable=False),
        sa.Column("evaluation_data", JSONB, nullable=False),
        sa.Column("overall_score", sa.Integer),
        sa.Column("recommendation", sa.Text),
        sa.Column("seniority_level", sa.Text),
        sa.Column("model_version", sa.Text),
        sa.Column("evaluation_status", sa.Text, nullable=False, server_default="pending"),
        sa.Column("evaluated_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("invitation_id", name="uq_evaluations_invitation_id"),
        sa.CheckConstraint("overall_score BETWEEN 0 AND 100", name="evaluations_score_check"),
        sa.CheckConstraint(
            "evaluation_status IN ('pending','processing','completed','failed')",
            name="evaluations_status_check",
        ),
    )
    op.create_index("idx_evaluations_invitation_id", "interview_evaluations", ["invitation_id"])
    op.create_index("idx_evaluations_overall_score", "interview_evaluations", ["overall_score"])
    op.create_index("idx_evaluations_recommendation", "interview_evaluations", ["recommendation"])

    op.create_table(
        "invitation_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("invitation_id", UUID(as_uuid=True), sa.ForeignKey("interview_invitations.id"), nullable=False),
        sa.Column("event_type", sa.Text, nullable=False),
        sa.Column("previous_status", sa.Text),
        sa.Column("new_status", sa.Text),
        sa.Column("event_metadata", JSONB),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_invitation_events_invitation_id", "invitation_events", ["invitation_id"])


def downgrade() -> None:
    op.drop_table("invitation_events")
    op.drop_table("interview_evaluations")
    op.drop_table("interview_responses")
    op.drop_table("interview_invitations")
    op.drop_table("candidates")
    op.drop_table("interview_questions")
    op.drop_table("jobs")
    op.drop_table("users")
