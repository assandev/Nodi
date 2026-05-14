"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getJobInterview, SessionDetail } from "@/lib/api";

const TRANSCRIPTION_STATUS = {
  pending:    { label: "Pending",    color: "text-gray-400",   icon: "schedule"       },
  processing: { label: "Processing", color: "text-yellow-500", icon: "sync"           },
  completed:  { label: "Transcribed",color: "text-[#2FC278]",  icon: "check_circle"   },
  failed:     { label: "Failed",     color: "text-red-400",    icon: "error"          },
};

const SESSION_STATUS: Record<string, string> = {
  started:     "Started",
  in_progress: "In Progress",
  submitted:   "Submitted",
  completed:   "Completed",
  failed:      "Failed",
  expired:     "Expired",
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function SessionDetailPage() {
  const params = useParams<{ jobId: string; sessionId: string }>();
  const [data, setData] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJobInterview(params.jobId, params.sessionId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.jobId, params.sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="size-8 border-2 border-[#A0A3FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        {error ?? "Session not found"}
      </div>
    );
  }

  const allTranscribed = data.responses.every((r) => r.transcription_status === "completed");
  const pendingCount = data.responses.filter(
    (r) => r.transcription_status === "pending" || r.transcription_status === "processing"
  ).length;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/recruiter/jobs" className="hover:text-[#A0A3FF] transition-colors">Vacancies</Link>
        <span>/</span>
        <Link href={`/recruiter/jobs/${params.jobId}`} className="hover:text-[#A0A3FF] transition-colors">
          Job Detail
        </Link>
        <span>/</span>
        <span className="text-gray-600">{data.candidate.full_name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: candidate profile card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-12 rounded-full bg-[#A0A3FF]/15 flex items-center justify-center shrink-0">
                <span className="text-[#A0A3FF] font-bold text-lg">
                  {data.candidate.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{data.candidate.full_name}</h2>
                <p className="text-gray-400 text-sm">{data.candidate.email}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {data.candidate.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="material-symbols-outlined text-base text-gray-400">phone</span>
                  {data.candidate.phone}
                </div>
              )}
              {data.candidate.location && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="material-symbols-outlined text-base text-gray-400">location_on</span>
                  {data.candidate.location}
                </div>
              )}
              {data.candidate.years_experience != null && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="material-symbols-outlined text-base text-gray-400">work</span>
                  {data.candidate.years_experience} yr{data.candidate.years_experience !== 1 ? "s" : ""} experience
                </div>
              )}
              {data.candidate.linkedin_url && (
                <a
                  href={data.candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#A0A3FF] hover:underline"
                >
                  <span className="material-symbols-outlined text-base">link</span>
                  LinkedIn
                </a>
              )}
              {data.candidate.portfolio_url && (
                <a
                  href={data.candidate.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#A0A3FF] hover:underline"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Portfolio
                </a>
              )}
            </div>
          </div>

          {/* Interview metadata */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3 text-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-4">Interview Info</h3>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-semibold text-gray-900">{SESSION_STATUS[data.status] ?? data.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Started</span>
              <span className="text-gray-700">{fmt(data.started_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Submitted</span>
              <span className="text-gray-700">{fmt(data.submitted_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Answers</span>
              <span className="text-gray-700">{data.responses.length}</span>
            </div>
            {!allTranscribed && pendingCount > 0 && (
              <div className="mt-3 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-yellow-700 text-xs">
                <span className="material-symbols-outlined text-sm">schedule</span>
                {pendingCount} transcript{pendingCount > 1 ? "s" : ""} still processing
              </div>
            )}
          </div>
        </div>

        {/* Right: transcripts */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-gray-900 text-lg">Interview Transcripts</h2>

          {data.responses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
              <span className="material-symbols-outlined text-3xl mb-2 block text-gray-300">mic_off</span>
              <p className="text-sm">No answers recorded yet.</p>
            </div>
          ) : (
            data.responses.map((r) => {
              const ts = TRANSCRIPTION_STATUS[r.transcription_status] ?? TRANSCRIPTION_STATUS.pending;
              return (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[#A0A3FF] font-bold text-sm">Q{r.question_position}</span>
                      <h4 className="font-semibold text-gray-900 text-sm leading-snug">{r.question_text}</h4>
                    </div>
                    <div className={`flex items-center gap-1 shrink-0 text-xs font-semibold ${ts.color}`}>
                      <span className="material-symbols-outlined text-sm">{ts.icon}</span>
                      {ts.label}
                    </div>
                  </div>

                  {fmtDuration(r.audio_duration_seconds) && (
                    <p className="text-xs text-gray-400 mb-3">
                      Recording: {fmtDuration(r.audio_duration_seconds)}
                    </p>
                  )}

                  {r.transcription_status === "completed" && r.transcript ? (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                      <p className="text-gray-700 text-sm leading-relaxed">{r.transcript}</p>
                    </div>
                  ) : r.transcription_status === "failed" ? (
                    <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                      <p className="text-red-500 text-sm">Transcription failed for this answer.</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg px-4 py-3">
                      <p className="text-gray-400 text-sm italic">
                        {r.transcription_status === "processing"
                          ? "Transcription in progress…"
                          : "Transcription queued — check back shortly."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
