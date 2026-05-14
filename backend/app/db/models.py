import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, CheckConstraint, Column, ForeignKey,
    Integer, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.types import TIMESTAMP

from app.db.session import Base


def _now():
    return datetime.now(timezone.utc)


def _uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, nullable=False, unique=True)
    hashed_password = Column(Text, nullable=False)
    full_name = Column(Text, nullable=False)
    role = Column(Text, nullable=False, default="recruiter")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        CheckConstraint("role IN ('recruiter', 'admin')", name="users_role_check"),
    )

    jobs = relationship("Job", back_populates="recruiter")
    invitations_sent = relationship("InterviewInvitation", back_populates="invited_by_user")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recruiter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    company = Column(Text, nullable=False)
    role = Column(Text, nullable=False)
    job_description = Column(Text, nullable=False)
    responsibilities = Column(Text)
    requirements = Column(Text)
    culture_notes = Column(Text)
    status = Column(Text, nullable=False, default="draft")
    ai_question_suggestions = Column(JSONB)
    public_token = Column(Text, nullable=True, unique=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'active', 'paused', 'closed')",
            name="jobs_status_check",
        ),
    )

    recruiter = relationship("User", back_populates="jobs")
    questions = relationship("InterviewQuestion", back_populates="job")
    invitations = relationship("InterviewInvitation", back_populates="job")
    sessions = relationship("InterviewSession", back_populates="job")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    position = Column(Integer, nullable=False)
    time_limit_seconds = Column(Integer)
    question_type = Column(Text, nullable=False, default="voice")
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("job_id", "position", name="uq_questions_job_position"),
        CheckConstraint("time_limit_seconds > 0", name="questions_time_limit_check"),
        CheckConstraint(
            "question_type IN ('voice', 'text')",
            name="questions_type_check",
        ),
    )

    job = relationship("Job", back_populates="questions")
    responses = relationship("InterviewResponse", back_populates="question")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(Text, nullable=False)
    email = Column(Text, nullable=False)
    phone = Column(Text, nullable=False)
    linkedin_url = Column(Text)
    portfolio_url = Column(Text)
    location = Column(Text)
    years_experience = Column(Integer)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        CheckConstraint("years_experience >= 0", name="candidates_years_experience_check"),
    )

    invitations = relationship("InterviewInvitation", back_populates="candidate")
    sessions = relationship("InterviewSession", back_populates="candidate")


class InterviewInvitation(Base):
    __tablename__ = "interview_invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=True)
    token_hash = Column(Text, nullable=False, unique=True)
    status = Column(Text, nullable=False, default="pending")
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    started_at = Column(TIMESTAMP(timezone=True))
    submitted_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','in_progress','submitted','processing','completed','expired','failed')",
            name="invitations_status_check",
        ),
    )

    job = relationship("Job", back_populates="invitations")
    invited_by_user = relationship("User", back_populates="invitations_sent")
    candidate = relationship("Candidate", back_populates="invitations")
    responses = relationship("InterviewResponse", back_populates="invitation")
    evaluation = relationship("InterviewEvaluation", back_populates="invitation", uselist=False)
    events = relationship("InvitationEvent", back_populates="invitation")


class InterviewResponse(Base):
    __tablename__ = "interview_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invitation_id = Column(UUID(as_uuid=True), ForeignKey("interview_invitations.id"), nullable=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("interview_questions.id"), nullable=False)
    audio_storage_key = Column(Text)
    audio_duration_seconds = Column(Integer)
    transcript = Column(Text)
    transcription_status = Column(Text, nullable=False, default="pending")
    recorded_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("invitation_id", "question_id", name="uq_responses_invitation_question"),
        UniqueConstraint("session_id", "question_id", name="uq_responses_session_question"),
        CheckConstraint("audio_duration_seconds >= 0", name="responses_duration_check"),
        CheckConstraint(
            "transcription_status IN ('pending','processing','completed','failed')",
            name="responses_transcription_status_check",
        ),
    )

    invitation = relationship("InterviewInvitation", back_populates="responses")
    session = relationship("InterviewSession", back_populates="responses")
    question = relationship("InterviewQuestion", back_populates="responses")


class InterviewEvaluation(Base):
    __tablename__ = "interview_evaluations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invitation_id = Column(UUID(as_uuid=True), ForeignKey("interview_invitations.id"), nullable=True, unique=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=True, unique=True)
    evaluation_data = Column(JSONB, nullable=False, default=dict)
    overall_score = Column(Integer)
    recommendation = Column(Text)
    seniority_level = Column(Text)
    model_version = Column(Text)
    evaluation_status = Column(Text, nullable=False, default="pending")
    evaluated_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        CheckConstraint("overall_score BETWEEN 0 AND 100", name="evaluations_score_check"),
        CheckConstraint(
            "evaluation_status IN ('pending','processing','completed','failed')",
            name="evaluations_status_check",
        ),
    )

    invitation = relationship("InterviewInvitation", back_populates="evaluation")
    session = relationship("InterviewSession", back_populates="evaluation")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    session_token_hash = Column(Text, nullable=False, unique=True)
    status = Column(Text, nullable=False, default="started")
    started_at = Column(TIMESTAMP(timezone=True))
    submitted_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        CheckConstraint(
            "status IN ('started','in_progress','submitted','completed','failed','expired')",
            name="sessions_status_check",
        ),
    )

    job = relationship("Job", back_populates="sessions")
    candidate = relationship("Candidate", back_populates="sessions")
    responses = relationship("InterviewResponse", back_populates="session")
    evaluation = relationship("InterviewEvaluation", back_populates="session", uselist=False)


class InvitationEvent(Base):
    __tablename__ = "invitation_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invitation_id = Column(UUID(as_uuid=True), ForeignKey("interview_invitations.id"), nullable=False)
    event_type = Column(Text, nullable=False)
    previous_status = Column(Text)
    new_status = Column(Text)
    event_metadata = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=_now)

    invitation = relationship("InterviewInvitation", back_populates="events")
