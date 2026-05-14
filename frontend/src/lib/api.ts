import { getToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${BASE_URL}${path}`, { ...options, headers });
}

export async function login(
  email: string,
  password: string
): Promise<{ access_token: string; token_type: string }> {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export interface MeResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobOut {
  id: string;
  recruiter_id: string;
  company: string;
  role: string;
  job_description: string;
  responsibilities: string | null;
  requirements: string | null;
  culture_notes: string | null;
  status: "draft" | "active" | "paused" | "closed";
  ai_question_suggestions: AISuggestion[] | null;
  public_token?: string;
  created_at: string;
  updated_at: string;
}

export interface AISuggestion {
  question_text: string;
  category: "Technical" | "Behavioral" | "Culture Fit";
  position: number;
  time_limit_seconds: number;
  question_type: "voice" | "text";
}

export interface QuestionOut {
  id: string;
  job_id: string;
  question_text: string;
  position: number;
  time_limit_seconds: number | null;
  question_type: "voice" | "text";
  created_at: string;
  updated_at: string;
}

export interface QuestionPayload {
  question_text: string;
  position: number;
  time_limit_seconds: number | null;
  question_type: "voice" | "text";
}

export async function createJob(data: {
  company: string;
  role: string;
  job_description: string;
  responsibilities?: string;
  requirements?: string;
  culture_notes?: string;
}): Promise<JobOut> {
  const res = await apiFetch("/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getJobs(): Promise<JobOut[]> {
  const res = await apiFetch("/jobs");
  if (!res.ok) throw new Error("Failed to load jobs");
  return res.json();
}

export async function getJob(id: string): Promise<JobOut> {
  const res = await apiFetch(`/jobs/${id}`);
  if (res.status === 404) throw new Error("Job not found");
  if (!res.ok) throw new Error("Failed to load job");
  return res.json();
}

export async function updateJob(
  id: string,
  data: Partial<{
    company: string;
    role: string;
    job_description: string;
    responsibilities: string;
    requirements: string;
    culture_notes: string;
    status: string;
  }>
): Promise<JobOut> {
  const res = await apiFetch(`/jobs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateQuestions(
  jobId: string
): Promise<{ suggestions: AISuggestion[]; warning?: string }> {
  const res = await apiFetch(`/jobs/${jobId}/generate-questions`, { method: "POST" });
  if (res.status === 503) throw new Error("AI service unavailable. Make sure Ollama is running.");
  if (!res.ok) throw new Error("Question generation failed");
  return res.json();
}

export async function getQuestions(jobId: string): Promise<QuestionOut[]> {
  const res = await apiFetch(`/jobs/${jobId}/questions`);
  if (!res.ok) throw new Error("Failed to load questions");
  return res.json();
}

export async function saveQuestions(
  jobId: string,
  questions: QuestionPayload[]
): Promise<QuestionOut[]> {
  const res = await apiFetch(`/jobs/${jobId}/questions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(questions),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function register(
  fullName: string,
  email: string,
  password: string
): Promise<MeResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: fullName, email, password }),
  });
  if (res.status === 409) throw new Error("Email already in use");
  if (!res.ok) throw new Error("Registration failed");
  return res.json();
}

export async function getMe(): Promise<MeResponse> {
  const res = await apiFetch("/me");
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

export interface InvitationOut {
  id: string;
  job_id: string;
  invited_by: string;
  candidate_id: string | null;
  status: string;
  expires_at: string;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface InvitationWithToken extends InvitationOut {
  token: string;
}

export interface PublicInterviewData {
  invitation: InvitationOut;
  job: { id: string; role: string; company: string };
  questions: QuestionOut[];
}

export interface CandidateOut {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  linkedin_url: string | null;
  portfolio_url: string | null;
  location: string | null;
  years_experience: number | null;
  created_at: string;
}

export async function createInvitation(jobId: string): Promise<InvitationWithToken> {
  const res = await apiFetch(`/jobs/${jobId}/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getInvitations(jobId: string): Promise<InvitationOut[]> {
  const res = await apiFetch(`/jobs/${jobId}/invitations`);
  if (!res.ok) throw new Error("Failed to load invitations");
  return res.json();
}

export async function getPublicInterview(token: string): Promise<PublicInterviewData> {
  const res = await fetch(`${BASE_URL}/public/interviews/${token}`);
  if (res.status === 404) throw Object.assign(new Error("Not found"), { status: 404 });
  if (res.status === 410) throw Object.assign(new Error("Already submitted"), { status: 410 });
  if (!res.ok) throw Object.assign(new Error("Failed to load interview"), { status: res.status });
  return res.json();
}

export async function submitCandidateInfo(
  token: string,
  data: {
    full_name: string;
    email: string;
    phone: string;
    linkedin_url?: string;
    portfolio_url?: string;
    location?: string;
    years_experience?: number;
  }
): Promise<CandidateOut> {
  const res = await fetch(`${BASE_URL}/public/interviews/${token}/candidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.status === 409) throw Object.assign(new Error("Already submitted"), { status: 409 });
  if (!res.ok) throw Object.assign(new Error(await res.text()), { status: res.status });
  return res.json();
}

export async function submitResponse(
  token: string,
  questionId: string,
  audioBlob: Blob,
  durationSeconds: number
): Promise<void> {
  const form = new FormData();
  form.append("question_id", questionId);
  form.append("audio", audioBlob, `${questionId}.webm`);
  form.append("duration_seconds", String(Math.round(durationSeconds)));
  const res = await fetch(`${BASE_URL}/public/interviews/${token}/responses`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw Object.assign(new Error(await res.text()), { status: res.status });
}

export async function completeInterview(token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/public/interviews/${token}/complete`, {
    method: "POST",
  });
  if (!res.ok) throw Object.assign(new Error(await res.text()), { status: res.status });
}

export interface PublicJobData {
  job: { title: string; company: string; description_preview: string };
  questions_count: number;
  estimated_minutes: number;
  status: "open" | "closed";
}

export interface SessionStartResponse {
  session_token: string;
  interview_url: string;
  questions: QuestionOut[];
}

export interface InterviewSessionData {
  session: { id: string; status: string; started_at: string | null; submitted_at: string | null };
  job: { id: string; role: string; company: string };
  questions: QuestionOut[];
  candidate: { full_name: string };
}

export async function getPublicJob(publicToken: string): Promise<PublicJobData> {
  const res = await fetch(`${BASE_URL}/public/jobs/${publicToken}`);
  if (res.status === 404) throw Object.assign(new Error("Not found"), { status: 404 });
  if (!res.ok) throw Object.assign(new Error("Failed to load job"), { status: res.status });
  return res.json();
}

export async function startInterview(
  publicToken: string,
  data: {
    full_name: string;
    email: string;
    phone: string;
    linkedin_url?: string;
    location?: string;
    years_experience?: number;
  }
): Promise<SessionStartResponse> {
  const res = await fetch(`${BASE_URL}/public/jobs/${publicToken}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.status === 409) throw Object.assign(new Error("already_completed"), { status: 409 });
  if (res.status === 404) throw Object.assign(new Error("Job not found"), { status: 404 });
  if (!res.ok) throw Object.assign(new Error(await res.text()), { status: res.status });
  return res.json();
}

export async function getInterviewSession(
  sessionToken: string
): Promise<InterviewSessionData> {
  const res = await fetch(`${BASE_URL}/public/interview-sessions/${sessionToken}`);
  if (res.status === 404) throw Object.assign(new Error("Session not found"), { status: 404 });
  if (res.status === 410) throw Object.assign(new Error("Already submitted"), { status: 410 });
  if (!res.ok) throw Object.assign(new Error("Failed to load session"), { status: res.status });
  return res.json();
}

export async function submitSessionResponse(
  sessionToken: string,
  questionId: string,
  audioBlob: Blob,
  durationSeconds: number
): Promise<void> {
  const form = new FormData();
  form.append("question_id", questionId);
  form.append("audio", audioBlob, `${questionId}.webm`);
  form.append("duration_seconds", String(Math.round(durationSeconds)));
  const res = await fetch(
    `${BASE_URL}/public/interview-sessions/${sessionToken}/responses`,
    { method: "POST", body: form }
  );
  if (!res.ok) throw Object.assign(new Error(await res.text()), { status: res.status });
}

export async function submitInterview(sessionToken: string): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/public/interview-sessions/${sessionToken}/submit`,
    { method: "POST" }
  );
  if (!res.ok) throw Object.assign(new Error(await res.text()), { status: res.status });
}

// ── Recruiter Dashboard ────────────────────────────────────────────────────────

export interface RecruiterStats {
  active_jobs: number;
  total_sessions: number;
  submitted_sessions: number;
  in_progress_sessions: number;
}

export interface SessionListItem {
  id: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  responses_count: number;
  transcribed_count: number;
}

export interface ResponseWithQuestion {
  id: string;
  question_id: string;
  question_text: string;
  question_position: number;
  audio_duration_seconds: number | null;
  transcript: string | null;
  transcription_status: "pending" | "processing" | "completed" | "failed";
  recorded_at: string | null;
}

export interface SessionDetail {
  id: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
  candidate: CandidateOut;
  responses: ResponseWithQuestion[];
}

export async function getDashboardStats(): Promise<RecruiterStats> {
  const res = await apiFetch("/jobs/stats");
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}

export async function getJobInterviews(jobId: string): Promise<SessionListItem[]> {
  const res = await apiFetch(`/jobs/${jobId}/interviews`);
  if (!res.ok) throw new Error("Failed to load interviews");
  return res.json();
}

export async function getJobInterview(jobId: string, sessionId: string): Promise<SessionDetail> {
  const res = await apiFetch(`/jobs/${jobId}/interviews/${sessionId}`);
  if (res.status === 404) throw Object.assign(new Error("Not found"), { status: 404 });
  if (!res.ok) throw new Error("Failed to load interview");
  return res.json();
}
