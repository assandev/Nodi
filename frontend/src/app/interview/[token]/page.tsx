"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getPublicInterview,
  submitCandidateInfo,
  PublicInterviewData,
  CandidateOut,
} from "@/lib/api";

const inputClass =
  "w-full bg-[#1E2744] border border-[#2A3A5E] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-[#4A6080] focus:outline-none focus:ring-2 focus:ring-[#A0A3FF]/50 focus:border-[#A0A3FF] transition-colors";

const labelClass = "block text-sm font-medium text-[#8899BB] mb-1.5";

function NodiLogo() {
  return (
    <div className="flex items-center gap-3 mb-8 justify-center">
      <div className="size-8 text-[#A0A3FF]">
        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <span className="text-white text-2xl font-bold">Nodi</span>
    </div>
  );
}

export default function InterviewPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [data, setData] = useState<PublicInterviewData | null>(null);
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [location, setLocation] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<CandidateOut | null>(null);

  useEffect(() => {
    getPublicInterview(token)
      .then(setData)
      .catch((err: Error & { status?: number }) => {
        setLoadError({ status: err.status ?? 0, message: err.message });
      })
      .finally(() => setLoadingPage(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const candidate = await submitCandidateInfo(token, {
        full_name: fullName,
        email,
        phone,
        linkedin_url: linkedinUrl || undefined,
        location: location || undefined,
        years_experience: yearsExperience ? Number(yearsExperience) : undefined,
      });
      setSubmitted(candidate);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (e.status === 409) {
        setFormError("Your contact information has already been submitted for this interview.");
      } else {
        setFormError(e.message || "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="size-8 border-2 border-[#A0A3FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    let message = "Something went wrong. Please try again later.";
    if (loadError.status === 404) message = "This interview link is invalid or has expired.";
    if (loadError.status === 410) message = "This interview has already been submitted.";
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <NodiLogo />
          <div className="bg-[#131C2E] border border-[#1E2744] rounded-2xl p-8">
            <span className="material-symbols-outlined text-5xl text-[#8899BB] mb-4 block">
              error_outline
            </span>
            <p className="text-white font-semibold text-lg mb-2">Unable to load interview</p>
            <p className="text-[#8899BB] text-sm">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.invitation.candidate_id !== null && !submitted) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <NodiLogo />
          <div className="bg-[#131C2E] border border-[#1E2744] rounded-2xl p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-[#2FC278] mb-4 block">
              check_circle
            </span>
            <p className="text-white font-bold text-lg mb-2">You&apos;ve already registered.</p>
            <p className="text-[#8899BB] text-sm mb-6">Your interview is ready.</p>
            <button
              disabled
              className="w-full bg-gray-700 text-gray-400 rounded-xl py-2.5 text-sm font-bold cursor-not-allowed"
              title="Voice recording — coming soon"
            >
              Continue Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <NodiLogo />
          <div className="bg-[#131C2E] border border-[#1E2744] rounded-2xl p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-[#2FC278] mb-4 block">
              check_circle
            </span>
            <p className="text-white font-bold text-xl mb-2">
              You&apos;re all set, {submitted.full_name}!
            </p>
            <p className="text-[#8899BB] text-sm mb-6">
              Your interview for {data.job.role} at {data.job.company} is ready to begin.
            </p>
            <button
              disabled
              className="w-full bg-gray-700 text-gray-400 rounded-xl py-2.5 text-sm font-bold cursor-not-allowed mb-4"
              title="Voice recording — coming soon"
            >
              Begin Interview
            </button>
            <p className="text-[#8899BB] text-sm">
              You&apos;ll complete {data.questions.length} voice questions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <div className="max-w-lg mx-auto py-12 px-4">
        <NodiLogo />

        <div className="bg-[#131C2E] border border-[#1E2744] rounded-2xl p-8">
          <div className="mb-6">
            <h1 className="text-white text-xl font-bold">{data.job.role}</h1>
            <p className="text-[#8899BB] text-sm mt-0.5">{data.job.company}</p>
            <p className="text-[#8899BB] text-sm mt-4">Tell us about yourself to begin your interview</p>
          </div>

          {formError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm mb-5">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Jane Doe"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="jane@example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+1 555 000 0000"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                LinkedIn URL <span className="text-[#4A6080]">(optional)</span>
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/your-name"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Location <span className="text-[#4A6080]">(optional)</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Years of experience <span className="text-[#4A6080]">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#A0A3FF] text-white rounded-xl py-2.5 text-sm font-bold hover:bg-[#8C8FF0] disabled:opacity-50 transition-colors mt-2"
            >
              {submitting ? "Submitting…" : "Continue to Interview"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
