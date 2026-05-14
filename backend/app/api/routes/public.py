import hashlib
import math
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db.models import (
    Candidate,
    InterviewQuestion,
    InterviewResponse,
    InterviewSession,
    Job,
)
from app.db.schemas import (
    InterviewSessionData,
    PublicJobOut,
    QuestionOut,
    SessionOut,
    SessionResponseOut,
    StartInterviewBody,
    StartInterviewResponse,
)
from app.core.evaluation import run_evaluation_bg
from app.core.transcription import TranscriptionError, transcribe_audio
from app.db.session import SessionLocal, get_db

router = APIRouter()


def _resolve_session(session_token: str, db: Session) -> InterviewSession:
    token_hash = hashlib.sha256(session_token.encode()).hexdigest()
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.session_token_hash == token_hash)
        .first()
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.status in ("submitted", "completed"):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Interview already submitted")
    return session


@router.get("/jobs/{public_token}", response_model=PublicJobOut)
def get_public_job(public_token: str, db: Session = Depends(get_db)) -> PublicJobOut:
    job = db.query(Job).filter(Job.public_token == public_token).first()
    if job is None or job.status != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.job_id == job.id)
        .all()
    )
    total_seconds = sum(q.time_limit_seconds or 120 for q in questions)
    estimated_minutes = max(1, math.ceil(total_seconds / 60))

    return PublicJobOut(
        job={
            "title": job.role,
            "company": job.company,
            "description_preview": job.job_description[:300],
        },
        questions_count=len(questions),
        estimated_minutes=estimated_minutes,
        status="open",
    )


@router.post(
    "/jobs/{public_token}/start",
    response_model=StartInterviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_interview(
    public_token: str,
    body: StartInterviewBody,
    db: Session = Depends(get_db),
) -> StartInterviewResponse:
    job = db.query(Job).filter(Job.public_token == public_token).first()
    if job is None or job.status != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # Candidate upsert by email
    candidate = db.query(Candidate).filter(Candidate.email == body.email).first()
    if candidate is None:
        candidate = Candidate(**body.model_dump())
        db.add(candidate)
        db.flush()
    else:
        for k, v in body.model_dump(exclude_unset=True).items():
            setattr(candidate, k, v)
        db.flush()

    # Session lookup — most recent for this job + candidate
    existing = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.job_id == job.id,
            InterviewSession.candidate_id == candidate.id,
        )
        .order_by(InterviewSession.created_at.desc())
        .first()
    )

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    if existing is not None:
        if existing.status in ("submitted", "completed"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="already_completed"
            )
        if existing.status in ("started", "in_progress"):
            # Resume: refresh the token, keep same session
            existing.session_token_hash = token_hash
            db.commit()
            db.refresh(existing)
            session = existing
        else:
            # failed / expired → fresh session
            session = InterviewSession(
                job_id=job.id,
                candidate_id=candidate.id,
                session_token_hash=token_hash,
                status="started",
                started_at=now,
            )
            db.add(session)
            db.commit()
            db.refresh(session)
    else:
        session = InterviewSession(
            job_id=job.id,
            candidate_id=candidate.id,
            session_token_hash=token_hash,
            status="started",
            started_at=now,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.job_id == job.id)
        .order_by(InterviewQuestion.position)
        .all()
    )

    return StartInterviewResponse(
        session_token=raw_token,
        interview_url=f"/interview/session/{raw_token}",
        questions=[QuestionOut.model_validate(q) for q in questions],
    )


@router.get("/interview-sessions/{session_token}", response_model=InterviewSessionData)
def get_interview_session(
    session_token: str, db: Session = Depends(get_db)
) -> InterviewSessionData:
    session = _resolve_session(session_token, db)
    job = session.job
    candidate = session.candidate

    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.job_id == job.id)
        .order_by(InterviewQuestion.position)
        .all()
    )

    return InterviewSessionData(
        session=SessionOut.model_validate(session),
        job={"id": str(job.id), "role": job.role, "company": job.company},
        questions=[QuestionOut.model_validate(q) for q in questions],
        candidate={"full_name": candidate.full_name},
    )


def transcribe_response_bg(response_id: str, file_path: str) -> None:
    response = None
    db = SessionLocal()
    try:
        response = (
            db.query(InterviewResponse)
            .filter(InterviewResponse.id == response_id)
            .first()
        )
        if response is None:
            return
        response.transcription_status = "processing"
        db.commit()
        result = transcribe_audio(file_path)
        response.transcript = result
        response.transcription_status = "completed"
        db.commit()
    except TranscriptionError:
        if response is not None:
            response.transcription_status = "failed"
            db.commit()
    finally:
        db.close()


@router.post(
    "/interview-sessions/{session_token}/responses",
    response_model=SessionResponseOut,
    status_code=201,
)
async def submit_response(
    session_token: str,
    question_id: str = Form(...),
    audio: UploadFile = ...,
    duration_seconds: int = Form(0),
    background_tasks: BackgroundTasks = ...,
    db: Session = Depends(get_db),
) -> SessionResponseOut:
    session = _resolve_session(session_token, db)

    question = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.id == question_id,
            InterviewQuestion.job_id == session.job_id,
        )
        .first()
    )
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Question not found"
        )

    file_path = Path("uploads") / "audio" / str(session.id) / f"{question_id}.webm"
    os.makedirs(file_path.parent, exist_ok=True)
    contents = await audio.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    audio_storage_key = f"audio/{session.id}/{question_id}.webm"
    now = datetime.now(timezone.utc)

    response = (
        db.query(InterviewResponse)
        .filter(
            InterviewResponse.session_id == session.id,
            InterviewResponse.question_id == question_id,
        )
        .first()
    )

    if response is not None:
        response.audio_storage_key = audio_storage_key
        response.audio_duration_seconds = duration_seconds
        response.recorded_at = now
    else:
        response = InterviewResponse(
            session_id=session.id,
            question_id=question_id,
            audio_storage_key=audio_storage_key,
            audio_duration_seconds=duration_seconds,
            recorded_at=now,
        )
        db.add(response)

    if session.status == "started":
        session.status = "in_progress"

    db.commit()
    db.refresh(response)
    background_tasks.add_task(transcribe_response_bg, str(response.id), str(file_path))
    return response


@router.post("/interview-sessions/{session_token}/submit", response_model=SessionOut)
def submit_interview(
    session_token: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> SessionOut:
    session = _resolve_session(session_token, db)

    response_count = (
        db.query(InterviewResponse)
        .filter(InterviewResponse.session_id == session.id)
        .count()
    )
    if response_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No responses recorded yet"
        )

    now = datetime.now(timezone.utc)
    session.status = "submitted"
    session.submitted_at = now
    db.commit()
    db.refresh(session)
    background_tasks.add_task(run_evaluation_bg, str(session.id))
    return session
