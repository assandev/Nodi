import re
import secrets
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.llm import OllamaUnavailableError, generate_interview_questions
from app.db.models import InterviewQuestion, Job, User
from app.db.schemas import JobCreate, JobOut, JobUpdate, QuestionCreate, QuestionOut
from app.db.session import get_db

router = APIRouter()


def _generate_public_token(role: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", role.lower()).strip("-")[:40]
    return f"{slug}-{secrets.token_urlsafe(4)}"


def _get_owned_job(job_id: UUID, current_user: User, db: Session) -> Job:
    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if str(job.recruiter_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return job


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    body: JobCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> JobOut:
    job = Job(recruiter_id=current_user.id, **body.model_dump())
    job.public_token = _generate_public_token(body.role)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("", response_model=list[JobOut])
def list_jobs(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[JobOut]:
    return (
        db.query(Job)
        .filter(Job.recruiter_id == current_user.id)
        .order_by(Job.created_at.desc())
        .all()
    )


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> JobOut:
    return _get_owned_job(job_id, current_user, db)


@router.put("/{job_id}", response_model=JobOut)
def update_job(
    job_id: UUID,
    body: JobUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> JobOut:
    job = _get_owned_job(job_id, current_user, db)
    updates = body.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] not in {"draft", "active", "paused", "closed"}:
        raise HTTPException(status_code=422, detail="Invalid status value")
    for key, value in updates.items():
        setattr(job, key, value)
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/generate-questions")
async def generate_questions(
    job_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    job = _get_owned_job(job_id, current_user, db)
    try:
        suggestions = await generate_interview_questions(job)
    except OllamaUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service unavailable. Ensure Ollama is running at {settings.OLLAMA_BASE_URL}.",
        )

    job.ai_question_suggestions = suggestions
    db.commit()
    db.refresh(job)

    if not suggestions:
        return {"suggestions": [], "warning": "Question generation failed. Please try again."}
    return {"suggestions": suggestions}


@router.get("/{job_id}/questions", response_model=list[QuestionOut])
def get_questions(
    job_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[QuestionOut]:
    _get_owned_job(job_id, current_user, db)
    return (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.job_id == job_id)
        .order_by(InterviewQuestion.position)
        .all()
    )


@router.put("/{job_id}/questions", response_model=list[QuestionOut])
def save_questions(
    job_id: UUID,
    body: list[QuestionCreate],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[QuestionOut]:
    _get_owned_job(job_id, current_user, db)

    db.query(InterviewQuestion).filter(
        InterviewQuestion.job_id == job_id
    ).delete(synchronize_session=False)

    for item in body:
        db.add(InterviewQuestion(job_id=job_id, **item.model_dump()))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422, detail="Duplicate question positions are not allowed")

    return (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.job_id == job_id)
        .order_by(InterviewQuestion.position)
        .all()
    )
