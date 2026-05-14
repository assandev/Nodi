"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPublicJob, startInterview, PublicJobData } from "@/lib/api";

type Phase = "loading" | "error" | "preview" | "register" | "submitting" | "already_done";

function NodiLogoOrange() {
  return (
    <div className="flex items-center gap-3 mb-8 justify-center">
      <div className="size-8 text-[#EC5B13]">
        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <span className="text-[#221610] text-2xl font-bold">Nodi</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F8F6F6] flex items-center justify-center">
      <div className="size-8 border-2 border-[#EC5B13] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorScreen({ status }: { status: number }) {
  let message = "Something went wrong. Please try again later.";
  if (status === 404) message = "This interview link is invalid or no longer active.";
  return (
    <div className="min-h-screen bg-[#221610] flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <NodiLogoOrange />
        <div className="bg-[#2C1E14] border border-[#3D2A1A] rounded-2xl p-8">
          <span className="material-symbols-outlined text-5xl text-[#8B6E5A] mb-4 block">
            error_outline
          </span>
          <p className="text-white font-semibold text-lg mb-2">Link not available</p>
          <p className="text-[#8B6E5A] text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}

function AlreadyDoneScreen() {
  return (
    <div className="min-h-screen bg-[#F8F6F6] flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <NodiLogoOrange />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
          <span className="material-symbols-outlined text-5xl text-[#2FC278] mb-4 block">
            check_circle
          </span>
          <h2 className="text-2xl font-bold text-[#221610] mb-3">Already completed</h2>
          <p className="text-gray-500 text-sm">
            You&apos;ve already completed this interview. The hiring team will be in touch soon.
          </p>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-[#F0EDE8] border border-[#E0D8CF] rounded-xl px-4 py-2.5 text-[#221610] text-sm placeholder:text-[#9E8E7E] focus:outline-none focus:ring-2 focus:ring-[#EC5B13]/40 focus:border-[#EC5B13] transition-colors";
const labelClass = "block text-sm font-medium text-[#5C4A38] mb-1.5";

export default function InterviewLandingPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<PublicJobData | null>(null);
  const [loadError, setLoadError] = useState(0);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [location, setLocation] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    getPublicJob(token)
      .then((d) => {
        setData(d);
        setPhase("preview");
      })
      .catch((err: Error & { status?: number }) => {
        setLoadError(err.status ?? 0);
        setPhase("error");
      });
  }, [token]);

  async function handleStart(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setPhase("submitting");
    try {
      const resp = await startInterview(token, {
        full_name: fullName,
        email,
        phone,
        linkedin_url: linkedinUrl || undefined,
        location: location || undefined,
        years_experience: yearsExperience ? Number(yearsExperience) : undefined,
      });
      router.push(`/interview/session/${resp.session_token}`);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (e.status === 409) {
        setPhase("already_done");
      } else if (e.status === 404) {
        setLoadError(404);
        setPhase("error");
      } else {
        setFormError(e.message || "Something went wrong. Please try again.");
        setPhase("register");
      }
    }
  }

  if (phase === "loading" || phase === "submitting") return <LoadingScreen />;
  if (phase === "error") return <ErrorScreen status={loadError} />;
  if (phase === "already_done") return <AlreadyDoneScreen />;
  if (!data) return null;

  if (phase === "preview") {
    return (
      <div className="min-h-screen bg-[#F8F6F6]">
        <div className="max-w-2xl mx-auto py-16 px-6 text-center">
          <NodiLogoOrange />

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-8 text-left">
            <h1 className="text-2xl font-bold text-[#221610] mb-1">{data.job.title}</h1>
            <p className="text-[#EC5B13] font-semibold text-sm mb-4">{data.job.company}</p>
            <p className="text-gray-500 text-sm leading-relaxed">{data.job.description_preview}</p>
          </div>

          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-full px-4 py-2 shadow-sm">
              <span className="material-symbols-outlined text-[#EC5B13] text-base">quiz</span>
              <span className="text-sm font-semibold text-[#221610]">
                {data.questions_count} question{data.questions_count !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-full px-4 py-2 shadow-sm">
              <span className="material-symbols-outlined text-[#EC5B13] text-base">schedule</span>
              <span className="text-sm font-semibold text-[#221610]">~{data.estimated_minutes} min</span>
            </div>
          </div>

          <button
            onClick={() => setPhase("register")}
            className="bg-[#EC5B13] text-white rounded-2xl px-10 py-4 text-base font-bold shadow-lg hover:brightness-105 active:scale-95 transition-all"
          >
            Begin Interview →
          </button>

          <p className="mt-6 text-xs text-gray-400">
            Responses are encrypted and shared only with the hiring team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F6]">
      <div className="max-w-lg mx-auto py-12 px-4">
        <NodiLogoOrange />
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-[#221610] text-xl font-bold">{data.job.title}</h1>
            <p className="text-[#EC5B13] text-sm font-semibold mt-0.5">{data.job.company}</p>
            <p className="text-gray-500 text-sm mt-4">Tell us about yourself to begin</p>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-5">
              {formError}
            </div>
          )}

          <form onSubmit={handleStart} className="space-y-4">
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
                LinkedIn URL <span className="text-[#9E8E7E]">(optional)</span>
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
                Location <span className="text-[#9E8E7E]">(optional)</span>
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
                Years of experience <span className="text-[#9E8E7E]">(optional)</span>
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
              className="w-full bg-[#EC5B13] text-white rounded-xl py-2.5 text-sm font-bold hover:brightness-105 transition-all mt-2"
            >
              Start Interview →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
