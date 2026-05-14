"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllSessions, EnrichedSession } from "@/lib/api";

const SESSION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  started:     { label: "Started",     color: "text-blue-500"   },
  in_progress: { label: "In Progress", color: "text-yellow-500" },
  submitted:   { label: "Submitted",   color: "text-[#10B981]"  },
  completed:   { label: "Completed",   color: "text-[#10B981]"  },
  failed:      { label: "Failed",      color: "text-red-400"    },
  expired:     { label: "Expired",     color: "text-gray-400"   },
};

const REC_CONFIG: Record<string, { label: string; cls: string }> = {
  advance: { label: "Advance", cls: "bg-[#10B981]/15 text-[#10B981]" },
  hold:    { label: "Hold",    cls: "bg-yellow-100 text-yellow-700"  },
  reject:  { label: "Reject",  cls: "bg-red-100 text-red-600"        },
};

export default function CandidatesPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [decisionFilter, setDecisionFilter] = useState("all");

  useEffect(() => {
    getAllSessions()
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const jobs = useMemo(
    () => Array.from(new Map(sessions.map((s) => [s.job_id, { id: s.job_id, role: s.job_role }])).values()),
    [sessions]
  );

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (jobFilter !== "all" && s.job_id !== jobFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (decisionFilter === "pending") {
        if (s.recommendation != null) return false;
      } else if (decisionFilter !== "all" && s.recommendation !== decisionFilter) {
        return false;
      }
      return true;
    });
  }, [sessions, jobFilter, statusFilter, decisionFilter]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="size-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Candidates</h1>
        <p className="text-gray-500 mt-1">All candidates across your vacancies</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40"
        >
          <option value="all">All Vacancies</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.role}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40"
        >
          <option value="all">All Statuses</option>
          {Object.entries(SESSION_STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={decisionFilter}
          onChange={(e) => setDecisionFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40"
        >
          <option value="all">All Decisions</option>
          <option value="advance">Advance</option>
          <option value="hold">Hold</option>
          <option value="reject">Reject</option>
          <option value="pending">Pending evaluation</option>
        </select>

        {(jobFilter !== "all" || statusFilter !== "all" || decisionFilter !== "all") && (
          <button
            onClick={() => { setJobFilter("all"); setStatusFilter("all"); setDecisionFilter("all"); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl mb-3 block text-gray-300">group</span>
          {sessions.length === 0 ? (
            <>
              <p className="font-medium text-gray-500">No candidates yet.</p>
              <p className="text-sm mt-1">Share your public interview links to start receiving applications.</p>
            </>
          ) : (
            <p className="text-sm">No candidates match the selected filters.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">{filtered.length} candidate{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Vacancy</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Decision</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => {
                  const sc = SESSION_STATUS_CONFIG[s.status] ?? { label: s.status, color: "text-gray-500" };
                  const evalDone = s.evaluation_status === "completed";
                  const evalRunning = s.evaluation_status === "processing";
                  const scoreColor =
                    s.overall_score == null ? ""
                    : s.overall_score >= 70 ? "text-[#10B981] font-bold"
                    : s.overall_score >= 50 ? "text-yellow-500 font-bold"
                    : "text-red-500 font-bold";
                  const rec = s.recommendation ? REC_CONFIG[s.recommendation] : null;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 text-sm">{s.candidate_name}</p>
                        <p className="text-gray-400 text-xs">{s.candidate_email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{s.job_role}</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-sm font-semibold ${sc.color}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {sc.label}
                        </span>
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
                        {rec ? (
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
                                ? `/recruiter/jobs/${s.job_id}/candidates/${s.id}/report`
                                : `/recruiter/jobs/${s.job_id}/candidates/${s.id}`
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
        </div>
      )}
    </div>
  );
}
