import json
import re

import httpx

from app.core.config import settings


class OllamaUnavailableError(Exception):
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


async def generate_interview_questions(job) -> list[dict]:
    prompt = _build_prompt(job)
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=5.0, read=60.0, write=10.0, pool=5.0)) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={"model": settings.OLLAMA_MODEL, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        raise OllamaUnavailableError(str(exc)) from exc

    raw = response.json().get("response", "")

    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip()
    # Extract the JSON array if there's surrounding text
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

    return questions
