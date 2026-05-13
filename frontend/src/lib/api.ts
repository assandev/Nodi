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
