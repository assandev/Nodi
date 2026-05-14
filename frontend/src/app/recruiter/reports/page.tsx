"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllSessions, EnrichedSession } from "@/lib/api";

type SortKey = "score_desc" | "score_asc" | "date_desc" | "recommendation";

const REC_ORDER: Record<string, number> = { advance: 0, hold: 1, reject: 2 };

const REC_CONFIG: Record<string, { label: string; cls: string }> = {
  advance: { label: "Advance", cls: "bg-[#10B981]/15 text-[#10B981]" },
  hold:    { label: "Hold",    cls: "bg-yellow-100 text-yellow-700"  },
  reject:  { label: "Reject",  cls: "bg-red-100 text-red-600"        },
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-[#10B981]" : score >= 50 ? "bg-yellow-400" : "bg-red-400";
  const textColor = score >= 70 ? "text-[#10B981]" : score >= 50 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold ${textColor}`}>{score}</span>
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score_desc");
  const [jobFilter, setJobFilter] = useState("all");
  const [decisionFilter, setDecisionFilter] = useState("all");

  useEffect(() => {
    getAllSessions()
      .then((all) => setSessions(all.filter((s) => s.evaluation_status === "completed")))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const jobs = useMemo(
    () => Array.from(new Map(sessions.map((s) => [s.job_id, { id: s.job_id, role: s.job_role }])).values()),
    [sessions]
  );

  const filtered = useMemo(() => {
    let list = sessions.filter((s) => {
      if (jobFilter !== "all" && s.job_id !== jobFilter) return false;
      if (decisionFilter !== "all" && s.recommendation !== decisionFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortKey === "score_desc") return (b.overall_score ?? 0) - (a.overall_score ?? 0);
      if (sortKey === "score_asc")  return (a.overall_score ?? 0) - (b.overall_score ?? 0);
      if (sortKey === "date_desc")
        return new Date(b.submitted_at ?? b.created_at).getTime() - new Date(a.submitted_at ?? a.created_at).getTime();
      if (sortKey === "recommendation")
        return (REC_ORDER[a.recommendation ?? ""] ?? 99) - (REC_ORDER[b.recommendation ?? ""] ?? 99);
      return 0;
    });
    return list;
  }, [sessions, sortKey, jobFilter, decisionFilter]);

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
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports</h1>
        <p className="text-gray-500 mt-1">AI evaluation results ready for review</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40"
        >
          <option value="score_desc">Sort: Score (high → low)</option>
          <option value="score_asc">Sort: Score (low → high)</option>
          <option value="date_desc">Sort: Most recent</option>
          <option value="recommendation">Sort: Decision</option>
        </select>

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
          value={decisionFilter}
          onChange={(e) => setDecisionFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40"
        >
          <option value="all">All Decisions</option>
          <option value="advance">Advance</option>
          <option value="hold">Hold</option>
          <option value="reject">Reject</option>
        </select>

        {(jobFilter !== "all" || decisionFilter !== "all") && (
          <button
            onClick={() => { setJobFilter("all"); setDecisionFilter("all"); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl mb-3 block text-gray-300">show_chart</span>
          {sessions.length === 0 ? (
            <>
              <p className="font-medium text-gray-500">No evaluations completed yet.</p>
              <p className="text-sm mt-1">
                Run an evaluation from a candidate&apos;s session page after they submit.
              </p>
            </>
          ) : (
            <p className="text-sm">No reports match the selected filters.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <span className="text-sm text-gray-500">{filtered.length} report{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Vacancy</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Decision</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => {
                  const rec = s.recommendation ? REC_CONFIG[s.recommendation] : null;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 text-sm">{s.candidate_name}</p>
                        <p className="text-gray-400 text-xs">{s.candidate_email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{s.job_role}</td>
                      <td className="px-6 py-4">
                        {s.overall_score != null ? (
                          <ScoreBar score={s.overall_score} />
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
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
                            router.push(`/recruiter/jobs/${s.job_id}/candidates/${s.id}/report`)
                          }
                          className="text-[#22C55E] text-xs font-semibold hover:underline"
                        >
                          View Report →
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
