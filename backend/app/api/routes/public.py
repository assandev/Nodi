import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import Candidate, InterviewInvitation, InterviewQuestion
from app.db.schemas import CandidateCreate, CandidateOut, InvitationOut, QuestionOut
from app.db.session import get_db

router = APIRouter()

_TERMINAL_STATUSES = {"submitted", "completed", "processing"}
_DEAD_STATUSES = {"expired", "failed"}


def _resolve_invitation(token: str, db: Session) -> InterviewInvitation:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    invitation = (
        db.query(InterviewInvitation)
        .filter(InterviewInvitation.token_hash == token_hash)
        .first()
    )
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    now = datetime.now(timezone.utc)
    expires = invitation.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    if invitation.status in _TERMINAL_STATUSES:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Interview already submitted")

    if invitation.status in _DEAD_STATUSES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    return invitation


@router.get("/interviews/{token}")
def get_interview(token: str, db: Session = Depends(get_db)):
    invitation = _resolve_invitation(token, db)
    job = invitation.job
    now = datetime.now(timezone.utc)

    if invitation.status == "pending":
        invitation.status = "in_progress"
        invitation.started_at = now
        db.commit()
        db.refresh(invitation)

    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.job_id == job.id)
        .order_by(InterviewQuestion.position)
        .all()
    )

    return {
        "invitation": InvitationOut.model_validate(invitation),
        "job": {"id": str(job.id), "role": job.role, "company": job.company},
        "questions": [QuestionOut.model_validate(q) for q in questions],
    }


@router.post("/interviews/{token}/candidate", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
def submit_candidate_info(
    token: str,
    body: CandidateCreate,
    db: Session = Depends(get_db),
) -> CandidateOut:
    invitation = _resolve_invitation(token, db)

    if invitation.candidate_id is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Candidate info already submitted")

    candidate = Candidate(**body.model_dump())
    db.add(candidate)
    db.flush()

    invitation.candidate_id = candidate.id
    db.commit()
    db.refresh(candidate)

    return candidate
