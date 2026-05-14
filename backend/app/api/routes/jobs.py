import re
import secrets
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.llm import OllamaUnavailableError, generate_interview_questions
from app.core.evaluation import run_evaluation_bg
from app.db.models import InterviewEvaluation, InterviewQuestion, InterviewSession, Job, User
from app.db.schemas import (
    CandidateOut,
    EvaluationOut,
    JobCreate,
    JobOut,
    JobUpdate,
    QuestionCreate,
    QuestionOut,
    RecruiterStats,
    ResponseWithQuestion,
    SessionDetail,
    SessionEvaluationOut,
    SessionListItem,
    SessionOut,
)
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


@router.get("/stats", response_model=RecruiterStats)
def get_recruiter_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> RecruiterStats:
    jobs = db.query(Job).filter(Job.recruiter_id == current_user.id).all()
    job_ids = [j.id for j in jobs]
    active_jobs = sum(1 for j in jobs if j.status == "active")

    if not job_ids:
        return RecruiterStats(
            active_jobs=0, total_sessions=0, submitted_sessions=0, in_progress_sessions=0
        )

    base_q = db.query(InterviewSession).filter(InterviewSession.job_id.in_(job_ids))
    total = base_q.count()
    submitted = base_q.filter(InterviewSession.status == "submitted").count()
    in_progress = base_q.filter(InterviewSession.status.in_(["started", "in_progress"])).count()

    return RecruiterStats(
        active_jobs=active_jobs,
        total_sessions=total,
        submitted_sessions=submitted,
        in_progress_sessions=in_progress,
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


@router.get("/{job_id}/interviews", response_model=list[SessionListItem])
def list_job_interviews(
    job_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[SessionListItem]:
    job = _get_owned_job(job_id, current_user, db)
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.job_id == job.id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )
    session_ids = [s.id for s in sessions]
    evaluations: dict[str, InterviewEvaluation] = {}
    if session_ids:
        evals = (
            db.query(InterviewEvaluation)
            .filter(InterviewEvaluation.session_id.in_(session_ids))
            .all()
        )
        evaluations = {str(e.session_id): e for e in evals}

    result = []
    for s in sessions:
        responses = s.responses
        ev = evaluations.get(str(s.id))
        result.append(
            SessionListItem(
                id=s.id,
                status=s.status,
                submitted_at=s.submitted_at,
                created_at=s.created_at,
                candidate_id=s.candidate.id,
                candidate_name=s.candidate.full_name,
                candidate_email=s.candidate.email,
                responses_count=len(responses),
                transcribed_count=sum(
                    1 for r in responses if r.transcription_status == "completed"
                ),
                overall_score=ev.overall_score if ev else None,
                recommendation=ev.recommendation if ev else None,
                evaluation_status=ev.evaluation_status if ev else None,
            )
        )
    return result


@router.get("/{job_id}/interviews/{session_id}", response_model=SessionDetail)
def get_job_interview(
    job_id: UUID,
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> SessionDetail:
    job = _get_owned_job(job_id, current_user, db)
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id, InterviewSession.job_id == job.id)
        .first()
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    questions = {
        str(q.id): q
        for q in db.query(InterviewQuestion)
        .filter(InterviewQuestion.job_id == job.id)
        .all()
    }

    responses = []
    for r in session.responses:
        q = questions.get(str(r.question_id))
        responses.append(
            ResponseWithQuestion(
                id=r.id,
                question_id=r.question_id,
                question_text=q.question_text if q else "Unknown question",
                question_position=q.position if q else 0,
                audio_duration_seconds=r.audio_duration_seconds,
                transcript=r.transcript,
                transcription_status=r.transcription_status,
                recorded_at=r.recorded_at,
            )
        )
    responses.sort(key=lambda x: x.question_position)

    return SessionDetail(
        id=session.id,
        status=session.status,
        started_at=session.started_at,
        submitted_at=session.submitted_at,
        created_at=session.created_at,
        candidate=CandidateOut.model_validate(session.candidate),
        responses=responses,
    )


@router.get("/{job_id}/interviews/{session_id}/report", response_model=SessionEvaluationOut)
def get_session_report(
    job_id: UUID,
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> SessionEvaluationOut:
    job = _get_owned_job(job_id, current_user, db)
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id, InterviewSession.job_id == job.id)
        .first()
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    questions = {
        str(q.id): q
        for q in db.query(InterviewQuestion)
        .filter(InterviewQuestion.job_id == job.id)
        .all()
    }

    responses = []
    for r in session.responses:
        q = questions.get(str(r.question_id))
        responses.append(
            ResponseWithQuestion(
                id=r.id,
                question_id=r.question_id,
                question_text=q.question_text if q else "Unknown question",
                question_position=q.position if q else 0,
                audio_duration_seconds=r.audio_duration_seconds,
                transcript=r.transcript,
                transcription_status=r.transcription_status,
                recorded_at=r.recorded_at,
            )
        )
    responses.sort(key=lambda x: x.question_position)

    evaluation = (
        db.query(InterviewEvaluation)
        .filter(InterviewEvaluation.session_id == session_id)
        .first()
    )

    return SessionEvaluationOut(
        evaluation=EvaluationOut.model_validate(evaluation) if evaluation else None,
        session=SessionOut.model_validate(session),
        candidate=CandidateOut.model_validate(session.candidate),
        responses=responses,
        job={"role": job.role, "company": job.company},
    )


@router.post("/{job_id}/interviews/{session_id}/evaluate")
def trigger_evaluation(
    job_id: UUID,
    session_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    job = _get_owned_job(job_id, current_user, db)
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id, InterviewSession.job_id == job.id)
        .first()
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.status not in ("submitted", "completed", "in_progress"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session must be submitted before evaluation",
        )
    background_tasks.add_task(run_evaluation_bg, str(session_id))
    return {"status": "queued", "session_id": str(session_id)}
