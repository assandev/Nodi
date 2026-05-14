import json
import logging
import re
import time

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class OllamaUnavailableError(Exception):
    pass


class EvaluationError(Exception):
    pass


def _build_prompt(job) -> str:
    return f"""You are an expert technical interviewer. Generate exactly 6 structured interview questions for the following job opening.

Job Title: {job.role}
Company: {job.company}
Job Description: {job.job_description}
Responsibilities: {job.responsibilities or "Not specified"}
Requirements: {job.requirements or "Not specified"}
Culture Notes: {job.culture_notes or "Not specified"}

Return ONLY a valid JSON array with no extra text or markdown. Each element must have exactly these fields:
- "question_text": the full question string
- "category": one of "Technical", "Behavioral", or "Culture Fit"
- "position": integer starting at 1
- "time_limit_seconds": 120 for most questions, 180 for complex technical ones
- "question_type": always "voice"

IMPORTANT: Order the questions in this exact sequence: first "Culture Fit" questions, then "Behavioral" questions, then "Technical" questions last. Assign "position" values according to this order.

Example:
[
  {{
    "question_text": "What draws you to our company culture?",
    "category": "Culture Fit",
    "position": 1,
    "time_limit_seconds": 120,
    "question_type": "voice"
  }},
  {{
    "question_text": "Describe a time you handled a conflict with a teammate.",
    "category": "Behavioral",
    "position": 3,
    "time_limit_seconds": 120,
    "question_type": "voice"
  }},
  {{
    "question_text": "Describe a system you designed from scratch and the trade-offs you made.",
    "category": "Technical",
    "position": 5,
    "time_limit_seconds": 180,
    "question_type": "voice"
  }}
]"""


def _build_evaluation_prompt(job, questions_with_transcripts: list[dict]) -> str:
    qa_block = ""
    for item in questions_with_transcripts:
        qa_block += f"\nQuestion {item['position']}: {item['question_text']}\n"
        qa_block += f"Candidate answer: {item['transcript']}\n"

    return f"""You are an expert technical recruiter. Evaluate the candidate's interview responses against the job requirements.

Job Title: {job.role}
Company: {job.company}
Job Description: {job.job_description}
Requirements: {job.requirements or "Not specified"}
Culture Notes: {job.culture_notes or "Not specified"}

Interview Transcript:
{qa_block}

Return ONLY a valid JSON object with no extra text or markdown. The object must have exactly these fields:
- "summary": string (2-3 sentence executive summary for the recruiter)
- "overall_score": integer 0-100
- "seniority_level": one of "Junior", "Mid", "Senior", "Staff"
- "recommendation": one of "advance", "hold", "reject"
- "confidence_level": one of "high", "medium", "low"
- "strengths": array of strings (2-4 items, evidence-based)
- "gaps": array of strings (1-3 items, actionable)
- "risks": array of strings (0-2 items)
- "criteria": array of objects, each with:
  - "name": string (use exactly these names: "Technical Match", "Communication Clarity", "Problem Solving", "Culture Fit", "Seniority Alignment")
  - "score": integer 1-5
  - "reasoning": string (1-2 sentences referencing specific answers)
  - "evidence": array of short quote strings from the transcript (1-3 items)

Evaluation principles:
- Only cite evidence from the transcript.
- Do not infer protected characteristics.
- Make gaps actionable and specific.
- recommendation "advance" means move to next round; "hold" means needs more info; "reject" means not a fit.

Example format:
{{
  "summary": "...",
  "overall_score": 75,
  "seniority_level": "Mid",
  "recommendation": "advance",
  "confidence_level": "medium",
  "strengths": ["..."],
  "gaps": ["..."],
  "risks": [],
  "criteria": [
    {{"name": "Technical Match", "score": 4, "reasoning": "...", "evidence": ["..."]}}
  ]
}}"""


async def evaluate_candidate(job, questions_with_transcripts: list[dict]) -> dict:
    prompt = _build_evaluation_prompt(job, questions_with_transcripts)
    logger.info("=" * 46)
    logger.info("  OLLAMA RUNNING  —  evaluate_candidate")
    logger.info("=" * 46)
    logger.info("  model    : %s", settings.OLLAMA_MODEL)
    logger.info("  job      : %s", job.role)
    logger.info("  questions: %d", len(questions_with_transcripts))
    logger.info("  prompt   : %d chars", len(prompt))
    logger.info("-" * 46)
    t0 = time.perf_counter()
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=300.0, write=10.0, pool=5.0)
        ) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={"model": settings.OLLAMA_MODEL, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        elapsed = time.perf_counter() - t0
        logger.error("=" * 46)
        logger.error("  OLLAMA FAILED after %.1fs", elapsed)
        logger.error("  %s", exc)
        logger.error("=" * 46)
        raise EvaluationError(str(exc)) from exc

    elapsed = time.perf_counter() - t0
    body = response.json()
    raw = body.get("response", "")
    logger.info("=" * 46)
    logger.info("  OLLAMA DONE  —  evaluate_candidate")
    logger.info("=" * 46)
    logger.info("  elapsed      : %.1fs", elapsed)
    logger.info("  prompt tokens: %s", body.get("prompt_eval_count", "?"))
    logger.info("  eval tokens  : %s", body.get("eval_count", "?"))
    logger.info("  response     : %d chars", len(raw))
    logger.info("-" * 46)
    logger.info("  JSON received:\n%s", raw[:800] + ("…" if len(raw) > 800 else ""))
    logger.info("-" * 46)

    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise EvaluationError(f"Failed to parse evaluation JSON: {exc}") from exc

    if not isinstance(result, dict):
        raise EvaluationError("Evaluation response is not a JSON object")

    logger.info("  Working in: parsed %d top-level keys — %s", len(result), list(result.keys()))
    logger.info("=" * 46)
    return result


async def generate_interview_questions(job) -> list[dict]:
    prompt = _build_prompt(job)
    logger.info("=" * 46)
    logger.info("  OLLAMA RUNNING  —  generate_questions")
    logger.info("=" * 46)
    logger.info("  model : %s", settings.OLLAMA_MODEL)
    logger.info("  job   : %s", job.role)
    logger.info("  prompt: %d chars", len(prompt))
    logger.info("-" * 46)
    t0 = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=5.0, read=60.0, write=10.0, pool=5.0)) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={"model": settings.OLLAMA_MODEL, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        elapsed = time.perf_counter() - t0
        logger.error("=" * 46)
        logger.error("  OLLAMA FAILED after %.1fs", elapsed)
        logger.error("  %s", exc)
        logger.error("=" * 46)
        raise OllamaUnavailableError(str(exc)) from exc

    elapsed = time.perf_counter() - t0
    body = response.json()
    raw = body.get("response", "")
    logger.info("=" * 46)
    logger.info("  OLLAMA DONE  —  generate_questions")
    logger.info("=" * 46)
    logger.info("  elapsed      : %.1fs", elapsed)
    logger.info("  prompt tokens: %s", body.get("prompt_eval_count", "?"))
    logger.info("  eval tokens  : %s", body.get("eval_count", "?"))
    logger.info("  response     : %d chars", len(raw))
    logger.info("-" * 46)
    logger.info("  JSON received:\n%s", raw[:800] + ("…" if len(raw) > 800 else ""))
    logger.info("-" * 46)

    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip()
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)

    try:
        questions = json.loads(cleaned)
    except json.JSONDecodeError:
        return []

    if not isinstance(questions, list):
        return []

    _order = {"Culture Fit": 0, "Behavioral": 1, "Technical": 2}
    questions.sort(key=lambda q: (_order.get(q.get("category", ""), 99), q.get("position", 0)))
    for i, q in enumerate(questions, start=1):
        q["position"] = i

    logger.info("  Working in: parsed %d questions", len(questions))
    logger.info("=" * 46)
    return questions
