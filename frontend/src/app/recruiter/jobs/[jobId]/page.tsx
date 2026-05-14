"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getJob, getJobInterviews, getQuestions, JobOut, QuestionOut, SessionListItem } from "@/lib/api";

function StatusBadge({ status }: { status: JobOut["status"] }) {
  const config = {
    draft:  { bg: "bg-gray-100",          text: "text-gray-600",    label: "Draft"  },
    active: { bg: "bg-[#10B981]/15",       text: "text-[#10B981]",   label: "Active" },
    paused: { bg: "bg-yellow-100",         text: "text-yellow-700",  label: "Paused" },
    closed: { bg: "bg-red-100",            text: "text-red-600",     label: "Closed" },
  }[status];
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-gray-500">{title}</h3>
      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{children}</p>
    </div>
  );
}

const SESSION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  started:     { label: "Started",     color: "text-blue-500"   },
  in_progress: { label: "In Progress", color: "text-yellow-500" },
  submitted:   { label: "Submitted",   color: "text-[#10B981]"  },
  completed:   { label: "Completed",   color: "text-[#10B981]"  },
  failed:      { label: "Failed",      color: "text-red-400"    },
  expired:     { label: "Expired",     color: "text-gray-400"   },
};

export default function JobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobOut | null>(null);
  const [questions, setQuestions] = useState<QuestionOut[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedPublic, setCopiedPublic] = useState(false);

  useEffect(() => {
    Promise.all([getJob(params.jobId), getQuestions(params.jobId), getJobInterviews(params.jobId)])
      .then(([j, q, s]) => { setJob(j); setQuestions(q); setSessions(s); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.jobId]);

  function handleCopyPublic() {
    if (!job?.public_token) return;
    const url = `${window.location.origin}/interview/${job.public_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="size-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        {error ?? "Job not found"}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Link href="/recruiter/jobs" className="hover:text-[#22C55E] transition-colors">
              Vacancies
            </Link>
            <span>/</span>
            <span className="text-gray-600">{job.role}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{job.role}</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-gray-500 mt-1">{job.company}</p>
        </div>
        <Link
          href={`/recruiter/jobs/${job.id}/edit`}
          className="border border-gray-200 bg-white text-gray-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: job details + candidates */}
        <div className="lg:col-span-2 space-y-4">
          <Section title="Job Description">{job.job_description}</Section>
          {job.responsibilities && <Section title="Responsibilities">{job.responsibilities}</Section>}
          {job.requirements && <Section title="Requirements">{job.requirements}</Section>}
          {job.culture_notes && <Section title="Culture Notes">{job.culture_notes}</Section>}

          {/* Candidates */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500">Candidates</h3>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {sessions.length}
              </span>
            </div>
            {sessions.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <span className="material-symbols-outlined text-3xl mb-2 block text-gray-300">group</span>
                <p className="text-sm">No candidates yet.</p>
                <p className="text-xs mt-1">Share the public link to start receiving interviews.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Answers</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Decision</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sessions.map((s) => {
                      const sc = SESSION_STATUS_CONFIG[s.status] ?? { label: s.status, color: "text-gray-500" };
                      const evalDone = s.evaluation_status === "completed";
                      const evalRunning = s.evaluation_status === "processing";
                      const scoreColor =
                        s.overall_score == null ? "text-gray-400"
                        : s.overall_score >= 70 ? "text-[#22C55E] font-bold"
                        : s.overall_score >= 50 ? "text-yellow-500 font-bold"
                        : "text-red-500 font-bold";
                      const recConfig: Record<string, { label: string; cls: string }> = {
                        advance: { label: "Advance", cls: "bg-[#10B981]/15 text-[#10B981]" },
                        hold:    { label: "Hold",    cls: "bg-yellow-100 text-yellow-700" },
                        reject:  { label: "Reject",  cls: "bg-red-100 text-red-600" },
                      };
                      const rec = s.recommendation ? recConfig[s.recommendation] : null;
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900 text-sm">{s.candidate_name}</p>
                            <p className="text-gray-400 text-xs">{s.candidate_email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center gap-1.5 text-sm font-semibold ${sc.color}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {s.transcribed_count}/{s.responses_count} transcribed
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {evalRunning ? (
                              <span className="flex items-center gap-1 text-gray-400 text-xs">
                                <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                                Analyzing
                              </span>
                            ) : evalDone && s.overall_score != null ? (
                              <span className={scoreColor}>{s.overall_score}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {evalRunning ? (
                              <span className="text-gray-300 text-xs">—</span>
                            ) : rec ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rec.cls}`}>
                                {rec.label}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() =>
                                router.push(
                                  evalDone
                                    ? `/recruiter/jobs/${job.id}/candidates/${s.id}/report`
                                    : `/recruiter/jobs/${job.id}/candidates/${s.id}`
                                )
                              }
                              className="text-[#22C55E] text-xs font-semibold hover:underline"
                            >
                              {evalDone ? "View Report" : "View"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: questions + public link */}
        <div className="lg:col-span-1 space-y-4">
          {/* Public Interview Link */}
          {job.public_token && (
            <div className="bg-[#f0fdf4] border border-[#22C55E]/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[#22C55E]/70">
                  Public Interview Link
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      job.status === "active" ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      job.status === "active" ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {job.status === "active" ? "Live" : "Inactive"}
                  </span>
                </div>
              </div>
              {job.status !== "active" && (
                <p className="text-xs text-gray-500 mb-3">
                  Publish this job to activate the link.
                </p>
              )}
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                <span className="text-gray-500 text-xs truncate flex-1">
                  /interview/{job.public_token}
                </span>
                <button
                  onClick={handleCopyPublic}
                  className="flex-shrink-0 text-xs font-semibold text-[#22C55E] hover:text-[#16A34A] transition-colors"
                >
                  {copiedPublic ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Interview Questions */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm text-gray-900">Interview Questions</h3>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {questions.length}
              </span>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-3xl text-gray-300 mb-2 block">quiz</span>
                <p className="text-gray-400 text-sm">No questions yet.</p>
                <Link
                  href={`/recruiter/jobs/${job.id}/edit`}
                  className="text-[#22C55E] text-xs font-semibold hover:underline mt-1 block"
                >
                  Edit to add questions
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q) => (
                  <div key={q.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#22C55E] text-xs font-bold">Q{q.position}</span>
                      <span className="text-gray-400 text-[10px]">{q.question_type}</span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{q.question_text}</p>
                    {q.time_limit_seconds && (
                      <p className="text-gray-400 text-[10px] mt-1.5">{q.time_limit_seconds}s limit</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
