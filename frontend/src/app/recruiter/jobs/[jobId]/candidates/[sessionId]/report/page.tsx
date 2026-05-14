"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  EvaluationCriteria,
  EvaluationData,
  SessionEvaluationOut,
  getSessionReport,
  triggerEvaluation,
} from "@/lib/api";

// ── Helpers ────────────────────────────────────────────────────────────────────

const RECOMMENDATION_CONFIG = {
  advance: { label: "Advance",  bg: "bg-[#10B981]/15", text: "text-[#10B981]",  border: "border-[#10B981]/30", icon: "thumb_up"    },
  hold:    { label: "Hold",     bg: "bg-yellow-50",    text: "text-yellow-700", border: "border-yellow-200",   icon: "pause_circle" },
  reject:  { label: "Reject",   bg: "bg-red-50",       text: "text-red-600",    border: "border-red-200",      icon: "thumb_down"   },
};

const CONFIDENCE_CONFIG = {
  high:   { label: "High Confidence",   color: "text-[#10B981]"  },
  medium: { label: "Medium Confidence", color: "text-yellow-600" },
  low:    { label: "Low Confidence",    color: "text-red-400"    },
};

const CRITERIA_ORDER = [
  "Technical Match",
  "Communication Clarity",
  "Problem Solving",
  "Culture Fit",
  "Seniority Alignment",
];

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? "bg-[#22C55E]" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ScoreCircle({ score, label }: { score: number | null; label: string }) {
  const display = score != null ? score : "–";
  const color =
    score == null ? "text-gray-400"
    : score >= 70 ? "text-[#22C55E]"
    : score >= 50 ? "text-yellow-600"
    : "text-red-500";
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
      <div className={`text-3xl font-black ${color}`}>{display}</div>
      <div className="text-xs text-gray-500 font-medium mt-1 leading-snug">{label}</div>
    </div>
  );
}

function CriteriaCard({ criterion }: { criterion: EvaluationCriteria }) {
  const [open, setOpen] = useState(true);
  const pct = Math.round((criterion.score / 5) * 100);
  const color = pct >= 70 ? "text-[#22C55E]" : pct >= 50 ? "text-yellow-600" : "text-red-500";
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className={`font-bold text-lg ${color}`}>{criterion.score}/5</span>
          <span className="font-semibold text-gray-800 text-sm">{criterion.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 hidden sm:block">
            <ScoreBar score={criterion.score} />
          </div>
          <span className="material-symbols-outlined text-gray-400 text-base">
            {open ? "expand_less" : "expand_more"}
          </span>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
          <p className="text-gray-700 text-sm leading-relaxed">{criterion.reasoning}</p>
          {criterion.evidence.length > 0 && (
            <div className="space-y-2">
              {criterion.evidence.map((ev, i) => (
                <blockquote
                  key={i}
                  className="border-l-2 border-[#8B5CF6] pl-3 text-gray-500 text-sm italic"
                >
                  &ldquo;{ev}&rdquo;
                </blockquote>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Processing / empty states ──────────────────────────────────────────────────

function useElapsedSeconds() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return elapsed;
}

function ProcessingBanner({
  status,
  jobId,
  sessionId,
  onRetrigger,
}: {
  status: string;
  jobId: string;
  sessionId: string;
  onRetrigger: () => void;
}) {
  const elapsed = useElapsedSeconds();

  if (status === "processing") {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 flex items-center gap-3">
        <div className="size-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-yellow-800 text-sm">AI evaluation in progress</p>
          <p className="text-yellow-700 text-xs">Analyzing transcripts · {timeStr} elapsed · page updates automatically</p>
        </div>
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <div>
            <p className="font-semibold text-red-800 text-sm">Evaluation failed</p>
            <p className="text-red-600 text-xs">The AI could not complete the evaluation. Make sure Ollama is running.</p>
          </div>
        </div>
        <button
          onClick={onRetrigger}
          className="text-xs font-bold text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors shrink-0"
        >
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-gray-400">pending</span>
        <div>
          <p className="font-semibold text-gray-700 text-sm">No evaluation yet</p>
          <p className="text-gray-500 text-xs">Run the AI evaluation to generate a candidate report.</p>
        </div>
      </div>
      <button
        onClick={onRetrigger}
        className="text-xs font-bold text-[#22C55E] border border-[#22C55E]/40 px-3 py-1.5 rounded-lg hover:bg-[#22C55E]/10 transition-colors shrink-0"
      >
        Run Evaluation
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 8_000;

export default function ReportPage() {
  const params = useParams<{ jobId: string; sessionId: string }>();
  const router = useRouter();
  const [data, setData] = useState<SessionEvaluationOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function load() {
    setLoading(true);
    getSessionReport(params.jobId, params.sessionId)
      .then((d) => {
        setData(d);
        const status = d.evaluation?.evaluation_status;
        if (status === "processing" && !pollRef.current) {
          pollRef.current = setInterval(() => {
            getSessionReport(params.jobId, params.sessionId).then((fresh) => {
              setData(fresh);
              const s = fresh.evaluation?.evaluation_status;
              if (s !== "processing") stopPolling();
            }).catch(stopPolling);
          }, POLL_INTERVAL_MS);
        } else if (status !== "processing") {
          stopPolling();
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    return stopPolling;
  }, [params.jobId, params.sessionId]);

  async function handleTrigger() {
    setTriggering(true);
    try {
      await triggerEvaluation(params.jobId, params.sessionId);
      setTimeout(load, 1500);
    } catch {
      load();
    } finally {
      setTriggering(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="size-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        {error ?? "Report not found"}
      </div>
    );
  }

  const ev = data.evaluation;
  const evData: EvaluationData | null =
    ev?.evaluation_status === "completed" && ev.evaluation_data ? ev.evaluation_data : null;

  const recConfig = evData
    ? (RECOMMENDATION_CONFIG[evData.recommendation] ?? RECOMMENDATION_CONFIG.hold)
    : null;

  const orderedCriteria = evData
    ? CRITERIA_ORDER.map((name) => evData.criteria.find((c) => c.name === name)).filter(
        Boolean
      ) as EvaluationCriteria[]
    : [];

  return (
    <div>
      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Link href="/recruiter/jobs" className="hover:text-[#22C55E] transition-colors">Vacancies</Link>
            <span>/</span>
            <Link
              href={`/recruiter/jobs/${params.jobId}`}
              className="hover:text-[#22C55E] transition-colors"
            >
              {data.job.role}
            </Link>
            <span>/</span>
            <Link
              href={`/recruiter/jobs/${params.jobId}/candidates/${params.sessionId}`}
              className="hover:text-[#22C55E] transition-colors"
            >
              {data.candidate.full_name}
            </Link>
            <span>/</span>
            <span className="text-gray-600">Report</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{data.candidate.full_name}</h1>
            {recConfig && (
              <span
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${recConfig.bg} ${recConfig.text} ${recConfig.border}`}
              >
                <span className="material-symbols-outlined text-sm">{recConfig.icon}</span>
                {recConfig.label}
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1 text-sm">
            {data.job.role} · {data.job.company}
          </p>
        </div>

        <Link
          href={`/recruiter/jobs/${params.jobId}/candidates/${params.sessionId}`}
          className="text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
        >
          ← Transcripts
        </Link>
      </div>

      {/* No / pending / failed evaluation banner */}
      {(!ev || ev.evaluation_status !== "completed") && (
        <div className="mb-6">
          <ProcessingBanner
            status={ev?.evaluation_status ?? "none"}
            jobId={params.jobId}
            sessionId={params.sessionId}
            onRetrigger={handleTrigger}
          />
          {triggering && (
            <p className="text-xs text-gray-400 mt-2">Evaluation queued, reloading shortly…</p>
          )}
        </div>
      )}

      {evData && (
        <>
          {/* Score row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <ScoreCircle score={evData.overall_score} label="Overall Score" />
            {orderedCriteria.map((c) => (
              <ScoreCircle
                key={c.name}
                score={Math.round((c.score / 5) * 100)}
                label={c.name}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: profile */}
            <div className="lg:col-span-1 space-y-4">
              {/* Candidate card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="size-12 rounded-full bg-[#22C55E]/15 flex items-center justify-center shrink-0">
                    <span className="text-[#22C55E] font-bold text-lg">
                      {data.candidate.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">{data.candidate.full_name}</h2>
                    <p className="text-gray-400 text-sm">{data.candidate.email}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
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
                      {data.candidate.years_experience} yr{data.candidate.years_experience !== 1 ? "s" : ""} exp.
                    </div>
                  )}
                  {data.candidate.linkedin_url && (
                    <a href={data.candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#22C55E] hover:underline">
                      <span className="material-symbols-outlined text-base">link</span>LinkedIn
                    </a>
                  )}
                </div>
              </div>

              {/* AI summary card */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">AI Summary</p>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${CONFIDENCE_CONFIG[evData.confidence_level]?.color ?? "text-gray-400"}`}>
                    <span className="material-symbols-outlined text-sm">verified</span>
                    {CONFIDENCE_CONFIG[evData.confidence_level]?.label ?? evData.confidence_level}
                  </div>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{evData.summary}</p>
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                  <span>Seniority: <span className="text-gray-900 font-semibold">{evData.seniority_level}</span></span>
                  {ev?.model_version && <span>Model: {ev.model_version}</span>}
                </div>
              </div>

              {/* Strengths / Gaps / Risks */}
              {evData.strengths.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Strengths</h3>
                  <ul className="space-y-2">
                    {evData.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="material-symbols-outlined text-[#10B981] text-base mt-0.5">check_circle</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {evData.gaps.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Gaps</h3>
                  <ul className="space-y-2">
                    {evData.gaps.map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="material-symbols-outlined text-yellow-500 text-base mt-0.5">warning</span>
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {evData.risks.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Risks</h3>
                  <ul className="space-y-2">
                    {evData.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="material-symbols-outlined text-red-400 text-base mt-0.5">flag</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right: criteria + transcripts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Evidence by criterion */}
              <div>
                <h2 className="font-bold text-gray-900 mb-3">Evidence by Criterion</h2>
                <div className="space-y-3">
                  {orderedCriteria.map((c) => (
                    <CriteriaCard key={c.name} criterion={c} />
                  ))}
                </div>
              </div>

              {/* Transcripts */}
              <div>
                <h2 className="font-bold text-gray-900 mb-3">Full Transcript</h2>
                <div className="space-y-3">
                  {data.responses.map((r) => (
                    <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#22C55E] mb-1">
                        Q{r.question_position}
                      </p>
                      <p className="font-semibold text-gray-800 text-sm mb-3">{r.question_text}</p>
                      {r.transcript ? (
                        <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 rounded-lg px-4 py-3">
                          {r.transcript}
                        </p>
                      ) : (
                        <p className="text-gray-400 text-sm italic">
                          {r.transcription_status === "failed"
                            ? "Transcription failed for this answer."
                            : "Transcript not yet available."}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
