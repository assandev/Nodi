# CLAUDE.md

Guidance for Claude Code when working on this repository.

## Project Overview

This project is a technical assessment for a Full-Stack AI Engineer role. The product is an AI-powered asynchronous interview platform for recruiting.

The core goal is to reduce the time recruiters spend on repetitive first-round interviews by allowing candidates to complete a structured voice-based screening interview through a unique link. The system transcribes answers, evaluates them against a job description and rubric, and generates an actionable report for recruiters.

## Product Principle

Prioritize the recruiter decision loop:

```txt
Job description -> structured interview -> candidate responses -> transcription -> AI evaluation -> recruiter decision
```

The MVP should not become a full ATS. Keep the scope focused on screening automation and candidate evaluation.

## User Types

### Recruiter

Authenticated user who can:

- Create and manage jobs.
- Generate AI-suggested interview questions from a job description.
- Review and edit interview questions.
- Create interview invitations.
- View candidate interview status.
- Open AI-generated candidate reports.
- Decide whether to advance, review, or reject a candidate.

### Candidate

Non-authenticated interview participant who can:

- Open a unique interview link.
- Provide basic contact information.
- Answer screening questions by voice.
- Submit the interview once.

Candidates are not application users. They do not create accounts and do not access dashboards.

## Key Product Decisions

### Candidate access

Use unique invitation links instead of candidate accounts.

Reasoning:

- Lower candidate friction.
- Simpler MVP.
- Avoids unnecessary auth complexity.
- Keeps recruiter dashboard protected separately.

Candidate links should be single-use, expirable, and backed by secure random tokens.

### Candidate data model

Candidate contact data should be stored as candidate/application information, not as a user account.

Required candidate fields for MVP:

- Full name
- Email
- Phone
- LinkedIn or portfolio URL, optional
- Location, optional

### Voice first

Start with voice-only responses. Avoid video in the MVP.

Reasoning:

- The assessment value comes from answer content, not facial analysis.
- Voice reduces complexity compared to video.
- Avoids introducing unnecessary bias-sensitive features.

### AI output

AI output must be structured and explainable. Avoid opaque scores without evidence.

Each report should include:

- Summary
- Overall fit score
- Score per criterion
- Reasoning per criterion
- Evidence from transcript per criterion
- Gaps and risks
- Estimated seniority
- Recommendation
- Confidence level

## Technical Stack

Required by the assessment:

- Backend: FastAPI / Python
- Frontend: Next.js / React / TypeScript recommended

Suggested services:

- Database: PostgreSQL via Supabase
- Storage: Supabase Storage
- Transcription: Speech-to-text provider
- LLM: Ollama local LLM 
- Deployment: Vercel for frontend, Render/Railway/Fly.io for backend

## Architecture Boundaries

### Private recruiter routes

Routes that require recruiter authentication:

```txt
/recruiter
/recruiter/jobs
/recruiter/jobs/[jobId]
/recruiter/jobs/[jobId]/candidates
/recruiter/interviews/[interviewId]/report
```

### Public candidate routes

Routes that are public but token-protected:

```txt
/interview/[token]
```

The public interview route must only allow the candidate to:

- Validate the invitation.
- Submit contact information.
- Upload or submit voice answers.
- Complete the interview.

It must never expose recruiter data, reports, other candidates, internal criteria not intended for the candidate, or dashboard access.

## Suggested Backend API Shape

### Auth

```txt
POST /auth/login
GET /me
```

### Jobs

```txt
POST /jobs
GET /jobs
GET /jobs/{job_id}
PUT /jobs/{job_id}
POST /jobs/{job_id}/generate-questions
GET /jobs/{job_id}/questions
PUT /jobs/{job_id}/questions
```

### Candidates and invitations

```txt
POST /jobs/{job_id}/invitations
GET /jobs/{job_id}/interviews
GET /interviews/{invitation_id}/report
```

### Public candidate interview

```txt
GET /public/interviews/{token}
POST /public/interviews/{token}/candidate
POST /public/interviews/{token}/responses
POST /public/interviews/{token}/complete
```

## Database Design Guidance

Recommended MVP entities:

- users
- jobs
- interview_questions
- interview_invitations
- candidates
- interview_responses
- interview_evaluations

Keep schema normalized enough to support the demo, but do not overbuild ATS concepts like companies, teams, people, applications, notes, calendars, or multi-role permission systems unless required later.

## Invitation Token Rules

Use strong random tokens for candidate interview links.

Implementation guidance:

- Generate a random token with sufficient entropy.
- Send the raw token only in the URL.
- Store only a hash of the token in the database.
- Validate token hash on every public interview request.
- Include expiration.
- Block access after interview completion.
- Enforce completion rules in the backend, not only the frontend.

Suggested statuses:

```txt
pending
in_progress
submitted
processing
completed
expired
failed
```

## UI/UX Direction

### Recruiter dashboard

The recruiter dashboard should prioritize action and review speed.

Main areas:

- Active jobs
- Number of invitations sent
- Number of completed interviews
- Candidates ready for review
- Recent activity

You will find context images in the `ui` folder. The dashboard should be clean and focused on driving recruiters to create jobs, send invitations, and review candidates.

### Job detail page

The job detail page should help recruiters manage one role.

Include:

- Job summary
- Interview questions
- Invitation creation
- Candidate list
- Statuses
- Scores
- Recommendations

### Candidate report page

This is the most important screen for the demo.

Design principle:

```txt
Decision first, evidence second, transcript last.
```

Recommended layout:

- Left profile card with contact info and interview metadata
- Top row score cards
- Main recommendation card
- Strengths and gaps
- Evidence by criterion
- Full transcript by question
- Recruiter actions: advance, review later, reject

## MVP Scope

Build:

- Recruiter login
- Job creation
- AI-generated interview questions
- Question editing/approval
- Unique candidate interview link
- Candidate contact form
- Voice answers
- Transcription
- AI evaluation report
- Candidate list by job
- Candidate report page

Do not build yet:

- Candidate accounts
- WhatsApp integration
- Video interviews
- Live video calls
- Calendar scheduling
- Full ATS pipeline
- Complex permissions
- Email automation
- Multi-company tenant model
- Facial/emotion analysis

## Coding Standards

- Keep business logic on the backend.
- Do not trust frontend state for interview completion, permissions, or token validity.
- Use typed request/response models in FastAPI.
- Use TypeScript types for frontend API responses.
- Keep AI prompts versioned or isolated in dedicated files/modules.
- Store structured AI outputs as JSON.
- Handle failed transcription or failed evaluation explicitly.
- Keep README setup instructions clear and reproducible.

## Demo Priorities

The Loom demo should show:

1. Recruiter creates a job.
2. AI suggests interview questions.
3. Recruiter creates or copies an invitation link.
4. Candidate opens link and fills contact data.
5. Candidate records voice answers.
6. System transcribes and evaluates.
7. Recruiter opens candidate report.
8. Report shows recommendation, scores, evidence, gaps, and transcript.

The strongest demo moment should be the candidate report page.