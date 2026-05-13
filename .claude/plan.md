# plan.md

## Goal

Build an MVP of an AI-powered asynchronous interview platform for recruiters.

The MVP should allow a recruiter to create a job, generate interview questions, send a unique screening link to a candidate, collect voice responses, transcribe them, evaluate the candidate against the role, and display an actionable report.

## Success Criteria

The project is successful if a reviewer can:

1. Log in as a recruiter.
2. Create a job with a job description.
3. Generate and edit interview questions.
4. Create a unique candidate interview link.
5. Complete the interview as a candidate without creating an account.
6. See the interview become completed or processed in the recruiter dashboard.
7. Open a candidate report with scores, reasoning, gaps, recommendation, evidence, and transcript.

## Phase 0 — Product and Architecture Definition

### Objective

Lock the MVP scope, core user flows, and architecture before implementation.

### Decisions

- Recruiter has authentication.
- Candidate does not have an account.
- Candidate access is controlled by a unique invitation token.
- Candidate answers are voice-only for MVP.
- Reports must be structured, explainable, and evidence-based.
- The system is not a full ATS.

### Deliverables

- Final user flows.
- Final MVP scope.
- Database schema draft.
- API route draft.
- UI route map.

### Acceptance Criteria

- The project scope can be explained in under one minute.
- Every feature maps to the recruiter screening workflow.
- Non-MVP features are explicitly excluded.

## Phase 1 — Database Schema and Backend Foundation

### Objective

Create the backend foundation and database schema needed for jobs, questions, invitations, candidates, responses, and evaluations.

### Tables

#### users

Recruiter accounts.

Fields:

- id
- name
- email
- password_hash
- role
- created_at
- updated_at

#### jobs

Recruiter-created vacancies.

Fields:

- id
- recruiter_id
- title
- description
- requirements
- culture_notes
- status
- created_at
- updated_at

#### interview_questions

Approved interview questions for a job.

Fields:

- id
- job_id
- question
- evaluation_criteria
- position
- created_at
- updated_at

#### interview_invitations

Tokenized candidate interview access.

Fields:

- id
- job_id
- candidate_id nullable
- token_hash
- status
- expires_at
- started_at nullable
- submitted_at nullable
- completed_at nullable
- created_at
- updated_at

Statuses:

- pending
- in_progress
- submitted
- processing
- completed
- expired
- failed

#### candidates

Candidate contact/application data.

Fields:

- id
- job_id
- full_name
- email
- phone
- linkedin_url nullable
- portfolio_url nullable
- location nullable
- years_experience nullable
- created_at
- updated_at

Recommended constraint:

- unique(job_id, email)

#### interview_responses

Candidate answer data per question.

Fields:

- id
- invitation_id
- candidate_id
- question_id
- audio_url
- transcript nullable
- duration_seconds nullable
- created_at
- updated_at

Recommended constraint:

- unique(invitation_id, question_id)

#### interview_evaluations

AI-generated evaluation report.

Fields:

- id
- invitation_id
- candidate_id
- summary
- overall_score
- seniority_level
- recommendation
- confidence_level
- strengths_json
- gaps_json
- risks_json
- criteria_scores_json
- evidence_json
- reasoning
- created_at
- updated_at

### Backend tasks

- Set up FastAPI project structure.
- Configure database connection.
- Add migrations.
- Create ORM models.
- Create Pydantic schemas.
- Add health check endpoint.
- Add seed data for demo if useful.

### Acceptance Criteria

- Backend runs locally.
- Database migrations run successfully.
- Core tables exist.
- Basic CRUD can be tested through API or scripts.

## Phase 2 — Recruiter Authentication and Shell UI

### Objective

Allow recruiters to access a protected dashboard.

### Backend tasks

- Implement recruiter login.
- Implement password hashing.
- Implement JWT or secure session strategy.
- Implement `GET /me`.
- Protect private endpoints.

### Frontend tasks

- Set up Next.js project.
- Create login page.
- Create authenticated recruiter layout.
- Add sidebar/navigation.
- Add basic dashboard shell.

### Routes

```txt
/login
/recruiter/dashboard
/recruiter/jobs
/recruiter/jobs/[jobId]
/recruiter/interviews/[interviewId]/report
```

### Acceptance Criteria

- Recruiter can log in.
- Protected pages are inaccessible without authentication.
- Authenticated recruiter can access dashboard shell.

## Phase 3 — Recruiter Job Creation and Question Generation

### Objective

Allow recruiters to create jobs and generate structured interview questions from a job description.

### Backend tasks

- `POST /jobs`
- `GET /jobs`
- `GET /jobs/{job_id}`
- `PUT /jobs/{job_id}`
- `POST /jobs/{job_id}/generate-questions`
- `GET /jobs/{job_id}/questions`
- `PUT /jobs/{job_id}/questions`

### AI tasks

Create a prompt that receives:

- Job title
- Job description
- Requirements
- Culture notes

And returns structured JSON:

```json
{
  "questions": [
    {
      "question": "Tell us about a project where you built a full-stack feature end to end.",
      "evaluation_criteria": "Assesses full-stack ownership, technical depth, and clarity of communication.",
      "position": 1
    }
  ]
}
```

### Frontend tasks

- Job creation form.
- Job detail page.
- Generate questions button.
- Editable question list.
- Save approved questions.

### Acceptance Criteria

- Recruiter can create a job.
- Recruiter can generate suggested questions with AI.
- Recruiter can edit and save questions.
- Questions are tied to the job.

## Phase 4 — Invitation Links and Candidate Data Collection

### Objective

Generate candidate interview links and collect candidate contact data without creating candidate accounts.

### Backend tasks

- `POST /jobs/{job_id}/invitations`
- Generate secure raw token.
- Store token hash only.
- Return raw token link once.
- Validate token on public endpoints.
- `GET /public/interviews/{token}`
- `POST /public/interviews/{token}/candidate`

### Candidate form fields

Required:

- Full name
- Email
- Phone

Optional:

- LinkedIn URL
- Portfolio URL
- Location
- Years of experience

### Frontend tasks

- Add invitation creation button on job detail page.
- Show generated link with copy button.
- Create public interview landing page.
- Add candidate contact form.
- Add consent checkbox.

### Acceptance Criteria

- Recruiter can generate a unique interview link.
- Candidate can open valid link.
- Invalid, expired, or completed links show controlled states.
- Candidate can submit contact information.
- Candidate data is stored in `candidates`, not `users`.

## Phase 5 — Candidate Voice Interview Flow

### Objective

Allow candidates to answer interview questions by voice and submit the interview once.

### Backend tasks

- `POST /public/interviews/{token}/responses`
- Accept audio upload or audio payload.
- Store audio file.
- Create or update interview response.
- Enforce one response per question.
- `POST /public/interviews/{token}/complete`
- Validate required questions answered.
- Mark interview as submitted or processing.

### Frontend tasks

- Interview instructions screen.
- Question-by-question flow.
- Voice recorder component.
- Playback before submit.
- Re-record before final submission.
- Progress indicator.
- Completion screen.

### UX requirements

- Show question number and total.
- Show suggested answer length.
- Make recording controls obvious.
- Prevent accidental final submission.
- Do not expose recruiter dashboard links.

### Acceptance Criteria

- Candidate can record answers for all questions.
- Candidate can submit the interview.
- Link cannot be used to submit a second completed interview.
- Interview status updates in the database.

## Phase 6 — Transcription Pipeline

### Objective

Transcribe candidate voice answers into text for evaluation and recruiter review.

### Backend tasks

- Integrate speech-to-text provider.
- Transcribe each response audio.
- Save transcript on `interview_responses`.
- Handle transcription failures.
- Add status updates for processing and failed states.

### Processing strategy for MVP

Start simple:

- Process after candidate submits interview.
- Run transcription synchronously or with a basic background task.
- Move to a queue only if needed.

### Acceptance Criteria

- Audio responses produce transcripts.
- Transcripts are stored per question.
- Failed transcription produces a visible failure state.

## Phase 7 — AI Evaluation and Candidate Report Generation

### Objective

Evaluate transcripts against the job description and interview rubric, then generate a structured report.

### Backend tasks

- Gather job data, questions, and transcripts.
- Send structured evaluation request to LLM.
- Parse structured JSON response.
- Store evaluation in `interview_evaluations`.
- Mark invitation as completed when report is ready.

### Evaluation output schema

```json
{
  "summary": "Short executive summary for the recruiter.",
  "overall_score": 82,
  "seniority_level": "Mid",
  "recommendation": "advance_to_technical_interview",
  "confidence_level": "high",
  "strengths": [
    "Strong backend API experience"
  ],
  "gaps": [
    "Limited evidence of production AI experience"
  ],
  "risks": [
    "May need support on architecture decisions at scale"
  ],
  "criteria": [
    {
      "name": "Technical Match",
      "score": 4,
      "reasoning": "Candidate described relevant FastAPI and PostgreSQL experience.",
      "evidence": [
        "I built a FastAPI backend connected to PostgreSQL..."
      ]
    }
  ]
}
```

### Evaluation principles

- Always include evidence.
- Avoid unsupported personality claims.
- Do not infer protected characteristics.
- Make gaps actionable.
- Make recommendation clear but not absolute.

### Acceptance Criteria

- Completed interviews generate an evaluation report.
- Report includes score, reasoning, evidence, gaps, seniority, and recommendation.
- Evaluation is stored as structured data.

## Phase 8 — Recruiter Candidate List and Report UI

### Objective

Give recruiters a clear view of candidate progress and detailed reports.

### Backend tasks

- `GET /jobs/{job_id}/interviews`
- `GET /interviews/{invitation_id}/report`
- Optional recruiter decision endpoint:
  - `POST /interviews/{invitation_id}/decision`

### Candidate list columns

- Candidate name
- Email
- Interview status
- Overall score
- Recommendation
- Seniority level
- Completed at
- Open report action

### Candidate report layout

Use a premium dashboard style inspired by modern recruiting tools.

Recommended page structure:

1. Header
   - Candidate name
   - Applied role
   - Status badge
   - Recommendation badge
   - Actions

2. Left profile card
   - Contact info
   - Links
   - Location
   - Interview metadata

3. Top score cards
   - Overall Fit
   - Technical Match
   - Communication
   - Seniority Match
   - Culture/Team Fit
   - Confidence

4. Main recommendation section
   - Summary
   - Recommendation
   - Strengths
   - Gaps and risks

5. Evidence by criterion
   - Criterion name
   - Score
   - Reasoning
   - Evidence snippets

6. Transcript by question
   - Question
   - Transcript
   - Optional audio playback

### Acceptance Criteria

- Recruiter can see candidate list for a job.
- Recruiter can open a detailed report.
- Report supports a decision without repeating the interview.
- Evidence is visible and easy to audit.

## Phase 9 — Polish, Error Handling, and Demo Data

### Objective

Make the app stable and presentable for assessment review.

### Tasks

- Add loading states.
- Add empty states.
- Add invalid link state.
- Add completed link state.
- Add failed processing state.
- Add basic validation messages.
- Add demo seed job and candidate if useful.
- Ensure responsive layout for main flows.
- Improve README.
- Prepare Loom script.

### Acceptance Criteria

- Reviewer can run the app locally from README.
- Reviewer can use deployed app without hidden setup.
- Main happy path works reliably.
- Error states are understandable.

## Phase 10 — Deployment and Submission

### Objective

Deploy the project and prepare final assessment submission.

### Tasks

- Deploy frontend.
- Deploy backend.
- Provision production database.
- Configure environment variables.
- Test deployed happy path.
- Make GitHub repository public or share access.
- Write README.
- Record Loom video.
- Prepare submission email.

### README must include

- Project overview.
- Tech stack.
- Local setup instructions.
- Environment variables.
- Architecture decisions.
- Product decisions.
- Known limitations.
- Next steps.

### Loom should show

1. Problem framing.
2. Recruiter creates job.
3. AI generates questions.
4. Recruiter creates invitation link.
5. Candidate completes voice interview.
6. System evaluates candidate.
7. Recruiter reviews report.
8. Architecture and tradeoffs.

### Acceptance Criteria

- Frontend URL works.
- Backend URL works.
- GitHub repo is accessible.
- README is clear.
- Loom is 3 to 7 minutes.
- Submission includes repo, deployed app, and Loom links.

## Suggested Implementation Order

1. Set up backend and database.
2. Implement schema and migrations.
3. Set up frontend shell and auth.
4. Build recruiter job creation.
5. Add question generation.
6. Add invitation links.
7. Build candidate contact form.
8. Build voice interview flow.
9. Add transcription.
10. Add AI evaluation.
11. Build candidate list.
12. Build candidate report page.
13. Polish UI and error states.
14. Deploy.
15. Record Loom.

## Non-MVP Backlog

These are valuable, but should not block the MVP:

- Candidate accounts.
- Email invitation sending.
- WhatsApp integration.
- Video interviews.
- Calendar scheduling.
- Recruiter notes.
- Team collaboration.
- Multi-company tenancy.
- Advanced ATS pipeline.
- Bulk candidate import.
- Comparative ranking across candidates.
- Custom scoring rubrics per company.
- Audit logs.
- Export to PDF.
- Webhooks.
- Analytics dashboard.

## Risks and Mitigations

### Risk: AI scores feel arbitrary

Mitigation:

- Always show reasoning and evidence.
- Use structured criteria.
- Avoid unsupported claims.

### Risk: Candidate link is reused

Mitigation:

- Enforce single-use completion in backend.
- Validate status on every public endpoint.

### Risk: Candidate data is confused with user accounts

Mitigation:

- Keep `users` for recruiters only.
- Store candidate data in `candidates`.

### Risk: Audio processing is slow

Mitigation:

- Show processing status.
- Keep answers short.
- Process after final submission.

### Risk: Scope becomes too large

Mitigation:

- Prioritize candidate report quality.
- Avoid ATS features.
- Avoid integrations until core flow works.