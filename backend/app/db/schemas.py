from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


# ── Users ─────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: UUID
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Jobs ──────────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    company: str
    role: str
    job_description: str
    responsibilities: Optional[str] = None
    requirements: Optional[str] = None
    culture_notes: Optional[str] = None


class JobUpdate(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    job_description: Optional[str] = None
    responsibilities: Optional[str] = None
    requirements: Optional[str] = None
    culture_notes: Optional[str] = None
    status: Optional[str] = None


class JobOut(BaseModel):
    id: UUID
    recruiter_id: UUID
    company: str
    role: str
    job_description: str
    responsibilities: Optional[str]
    requirements: Optional[str]
    culture_notes: Optional[str]
    status: str
    ai_question_suggestions: Optional[Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Interview Questions ────────────────────────────────────────────────────────

class QuestionCreate(BaseModel):
    question_text: str
    position: int
    time_limit_seconds: Optional[int] = None
    question_type: str = "voice"


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    position: Optional[int] = None
    time_limit_seconds: Optional[int] = None


class QuestionOut(BaseModel):
    id: UUID
    job_id: UUID
    question_text: str
    position: int
    time_limit_seconds: Optional[int]
    question_type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Candidates ────────────────────────────────────────────────────────────────

class CandidateCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None
    years_experience: Optional[int] = None


class CandidateOut(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: str
    linkedin_url: Optional[str]
    portfolio_url: Optional[str]
    location: Optional[str]
    years_experience: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Interview Invitations ─────────────────────────────────────────────────────

class InvitationCreate(BaseModel):
    expires_at: Optional[datetime] = None


class InvitationOut(BaseModel):
    id: UUID
    job_id: UUID
    invited_by: UUID
    candidate_id: Optional[UUID]
    status: str
    expires_at: datetime
    started_at: Optional[datetime]
    submitted_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class InvitationWithToken(InvitationOut):
    token: str


# ── Interview Responses ───────────────────────────────────────────────────────

class ResponseOut(BaseModel):
    id: UUID
    invitation_id: UUID
    question_id: UUID
    audio_storage_key: Optional[str]
    audio_duration_seconds: Optional[int]
    transcript: Optional[str]
    transcription_status: str
    recorded_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Interview Evaluations ─────────────────────────────────────────────────────

class EvaluationOut(BaseModel):
    id: UUID
    invitation_id: UUID
    evaluation_data: Any
    overall_score: Optional[int]
    recommendation: Optional[str]
    seniority_level: Optional[str]
    model_version: Optional[str]
    evaluation_status: str
    evaluated_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
