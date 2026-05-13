# Database Schema Design — Final

## Context

Designed by the architect agent from CLAUDE.md + plan.md context. Two recruiter-requested adjustments:
- `jobs`: add `company`, rename `title` → `role`, split description into `job_description` + `responsibilities` + `requirements`
- `interview_questions`: drop `is_required` — all questions are always required

---

## Tables

### `users`
Authenticated recruiters only. No candidates.

```sql
CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT        NOT NULL UNIQUE,
    hashed_password TEXT        NOT NULL,
    full_name       TEXT        NOT NULL,
    role            TEXT        NOT NULL DEFAULT 'recruiter'
                                CHECK (role IN ('recruiter', 'admin')),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
```

---

### `jobs`
Job openings. `company`, `role`, `job_description`, `responsibilities`, `requirements`, `culture_notes` feed AI question generation and evaluation.

```sql
CREATE TABLE jobs (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id            UUID        NOT NULL REFERENCES users (id),
    company                 TEXT        NOT NULL,
    role                    TEXT        NOT NULL,
    job_description         TEXT        NOT NULL,
    responsibilities        TEXT,
    requirements            TEXT,
    culture_notes           TEXT,
    status                  TEXT        NOT NULL DEFAULT 'draft'
                                        CHECK (status IN ('draft', 'active', 'paused', 'closed')),
    ai_question_suggestions JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_recruiter_id ON jobs (recruiter_id);
CREATE INDEX idx_jobs_status       ON jobs (status);
```

---

### `interview_questions`
Approved, ordered questions per job. All questions are required. `is_required` dropped.

```sql
CREATE TABLE interview_questions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id              UUID        NOT NULL REFERENCES jobs (id),
    question_text       TEXT        NOT NULL,
    position            INTEGER     NOT NULL,
    time_limit_seconds  INTEGER     CHECK (time_limit_seconds > 0),
    question_type       TEXT        NOT NULL DEFAULT 'voice'
                                    CHECK (question_type IN ('voice', 'text')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (job_id, position)
);

CREATE INDEX idx_interview_questions_job_id ON interview_questions (job_id);
```

---

### `candidates`
Non-authenticated contact profiles. Created when candidate submits info at interview start.

```sql
CREATE TABLE candidates (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           TEXT        NOT NULL,
    email               TEXT        NOT NULL,
    phone               TEXT        NOT NULL,
    linkedin_url        TEXT,
    portfolio_url       TEXT,
    location            TEXT,
    years_experience    INTEGER     CHECK (years_experience >= 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidates_email ON candidates (email);
```

---

### `interview_invitations`
Token-based bridge between a job and a candidate. `token_hash` stores hash only — raw token sent in URL once, never persisted.

```sql
CREATE TABLE interview_invitations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID        NOT NULL REFERENCES jobs (id),
    invited_by      UUID        NOT NULL REFERENCES users (id),
    candidate_id    UUID        REFERENCES candidates (id),
    token_hash      TEXT        NOT NULL UNIQUE,
    status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN (
                                    'pending', 'in_progress', 'submitted',
                                    'processing', 'completed', 'expired', 'failed'
                                )),
    expires_at      TIMESTAMPTZ NOT NULL,
    started_at      TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_job_id       ON interview_invitations (job_id);
CREATE INDEX idx_invitations_candidate_id ON interview_invitations (candidate_id);
CREATE INDEX idx_invitations_invited_by   ON interview_invitations (invited_by);
CREATE INDEX idx_invitations_status       ON interview_invitations (status);
CREATE INDEX idx_invitations_token_hash   ON interview_invitations (token_hash);
```

---

### `interview_responses`
One row per question per invitation. `UNIQUE (invitation_id, question_id)` enforced at DB level.

```sql
CREATE TABLE interview_responses (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id           UUID        NOT NULL REFERENCES interview_invitations (id),
    question_id             UUID        NOT NULL REFERENCES interview_questions (id),
    audio_storage_key       TEXT,
    audio_duration_seconds  INTEGER     CHECK (audio_duration_seconds >= 0),
    transcript              TEXT,
    transcription_status    TEXT        NOT NULL DEFAULT 'pending'
                                        CHECK (transcription_status IN (
                                            'pending', 'processing', 'completed', 'failed'
                                        )),
    recorded_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (invitation_id, question_id)
);

CREATE INDEX idx_responses_invitation_id ON interview_responses (invitation_id);
CREATE INDEX idx_responses_question_id   ON interview_responses (question_id);
```

---

### `interview_evaluations`
One AI report per invitation. Full JSON in `evaluation_data`; hot columns (`overall_score`, `recommendation`, `seniority_level`) denormalized for list-view queries.

```sql
CREATE TABLE interview_evaluations (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id       UUID        NOT NULL REFERENCES interview_invitations (id),
    evaluation_data     JSONB       NOT NULL,
    overall_score       INTEGER     CHECK (overall_score BETWEEN 0 AND 100),
    recommendation      TEXT,
    seniority_level     TEXT,
    model_version       TEXT,
    evaluation_status   TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (evaluation_status IN (
                                        'pending', 'processing', 'completed', 'failed'
                                    )),
    evaluated_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (invitation_id)
);

CREATE INDEX idx_evaluations_invitation_id  ON interview_evaluations (invitation_id);
CREATE INDEX idx_evaluations_overall_score  ON interview_evaluations (overall_score);
CREATE INDEX idx_evaluations_recommendation ON interview_evaluations (recommendation);
```

---

### `invitation_events` (optional)
Append-only audit log of every status transition. Useful for debugging pipeline failures.

```sql
CREATE TABLE invitation_events (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id   UUID        NOT NULL REFERENCES interview_invitations (id),
    event_type      TEXT        NOT NULL,
    previous_status TEXT,
    new_status      TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitation_events_invitation_id ON invitation_events (invitation_id);
```

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Token storage | Hash only in DB | Raw token is a credential; breach safety |
| `is_required` dropped | All questions required | Simplifies validation logic |
| Enums as CHECK on TEXT | Not PG ENUM | Easier to add values without DDL migration |
| AI output | JSONB + 3 denormalized columns | Query performance without schema fragility |
| No CASCADE DELETE | All FKs explicit | Forces intentional deletion, preserves audit trail |
| `UNIQUE (invitation_id, question_id)` | DB-level constraint | Prevents duplicate responses on retries |
| `candidates.email` not globally unique | Per-invitation context | Same person can apply to multiple roles |

---

## Implementation Plan (Phase 1)

Files to create:

- `backend/` — FastAPI project root
- `backend/app/db/models.py` — SQLAlchemy ORM models
- `backend/app/db/schemas.py` — Pydantic request/response schemas
- `backend/alembic/` — migration setup
- `backend/alembic/versions/001_initial_schema.py` — migration with all tables above
- `backend/app/main.py` — FastAPI app with health check endpoint
- `backend/requirements.txt`
- `backend/.env.example`

## Verification

1. `alembic upgrade head` — all tables created, no errors
2. `GET /health` returns 200
3. Insert a user row, a job row, a question, an invitation — verify FK constraints hold
4. Attempt to insert two responses with same `(invitation_id, question_id)` — expect unique violation
