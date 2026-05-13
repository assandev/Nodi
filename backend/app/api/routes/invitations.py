import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import InterviewInvitation, Job, User
from app.db.schemas import InvitationCreate, InvitationOut, InvitationWithToken
from app.db.session import get_db

router = APIRouter()


def _get_owned_job(job_id: UUID, current_user: User, db: Session) -> Job:
    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if str(job.recruiter_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return job


@router.post("/jobs/{job_id}/invitations", response_model=InvitationWithToken, status_code=status.HTTP_201_CREATED)
def create_invitation(
    job_id: UUID,
    body: InvitationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> InvitationWithToken:
    _get_owned_job(job_id, current_user, db)

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = body.expires_at or datetime.now(timezone.utc) + timedelta(days=7)

    invitation = InterviewInvitation(
        job_id=job_id,
        invited_by=current_user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        status="pending",
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    inv_data = InvitationOut.model_validate(invitation).model_dump()
    return InvitationWithToken.model_validate({**inv_data, "token": raw_token})


@router.get("/jobs/{job_id}/invitations", response_model=list[InvitationOut])
def list_invitations(
    job_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[InvitationOut]:
    _get_owned_job(job_id, current_user, db)
    return (
        db.query(InterviewInvitation)
        .filter(InterviewInvitation.job_id == job_id)
        .order_by(InterviewInvitation.created_at.desc())
        .all()
    )
