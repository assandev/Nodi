import asyncio
import time
from datetime import datetime, timezone

from app.core.config import settings
from app.core.llm import EvaluationError, evaluate_candidate
from app.db.models import InterviewEvaluation, InterviewQuestion, InterviewSession
from app.db.session import SessionLocal

MAX_TRANSCRIPTION_WAIT = 300  # seconds
POLL_INTERVAL = 5  # seconds


def run_evaluation_bg(session_id: str) -> None:
    db = SessionLocal()
    eval_row = None
    try:
        session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if session is None:
            return

        # Upsert evaluation row → "processing"
        eval_row = (
            db.query(InterviewEvaluation)
            .filter(InterviewEvaluation.session_id == session_id)
            .first()
        )
        if eval_row is None:
            eval_row = InterviewEvaluation(
                session_id=session_id,
                evaluation_status="processing",
                evaluation_data={},
            )
            db.add(eval_row)
        else:
            eval_row.evaluation_status = "processing"
        db.commit()
        db.refresh(eval_row)

        # Wait until transcriptions finish (or timeout)
        start = time.time()
        while True:
            db.expire_all()
            pending = [
                r
                for r in session.responses
                if r.transcription_status in ("pending", "processing")
            ]
            if not pending or (time.time() - start) > MAX_TRANSCRIPTION_WAIT:
                break
            time.sleep(POLL_INTERVAL)

        # Build questions→transcripts payload ordered by position
        questions = {
            str(q.id): q
            for q in db.query(InterviewQuestion)
            .filter(InterviewQuestion.job_id == session.job_id)
            .all()
        }

        payload = []
        for r in sorted(
            session.responses,
            key=lambda x: questions[str(x.question_id)].position
            if str(x.question_id) in questions
            else 0,
        ):
            q = questions.get(str(r.question_id))
            payload.append(
                {
                    "question_text": q.question_text if q else "Unknown question",
                    "position": q.position if q else 0,
                    "transcript": r.transcript or "[No transcript available]",
                }
            )

        # asyncio.run() is safe here — this runs in a thread-pool thread, not the event loop
        result = asyncio.run(evaluate_candidate(session.job, payload))

        eval_row.evaluation_data = result
        eval_row.overall_score = result.get("overall_score")
        eval_row.recommendation = result.get("recommendation")
        eval_row.seniority_level = result.get("seniority_level")
        eval_row.model_version = settings.OLLAMA_MODEL
        eval_row.evaluation_status = "completed"
        eval_row.evaluated_at = datetime.now(timezone.utc)
        session.status = "completed"
        db.commit()

    except EvaluationError:
        if eval_row is not None:
            eval_row.evaluation_status = "failed"
            db.commit()
    except Exception:
        if eval_row is not None:
            eval_row.evaluation_status = "failed"
            db.commit()
    finally:
        db.close()
