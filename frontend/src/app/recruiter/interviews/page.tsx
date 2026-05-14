"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllSessions, EnrichedSession } from "@/lib/api";

const POLL_MS = 15_000;

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  started:     { label: "Recording",         color: "text-blue-500"   },
  in_progress: { label: "In Progress",       color: "text-yellow-500" },
  submitted:   { label: "Awaiting review",   color: "text-[#10B981]"  },
  failed:      { label: "Failed",            color: "text-red-400"    },
  expired:     { label: "Expired",           color: "text-gray-400"   },
};

const ACTIVE_STATUSES = new Set(["started", "in_progress", "submitted"]);

export default function InterviewsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function load(initial = false) {
    if (initial) setLoading(true);
    getAllSessions()
      .then((all) => setSessions(all.filter((s) => ACTIVE_STATUSES.has(s.status) || s.evaluation_status === "processing"))      )
      .catch((e) => setError(e.message))
      .finally(() => { if (initial) setLoading(false); });
  }

  useEffect(() => {
    load(true);
    pollRef.current = setInterval(() => load(false), POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const jobs = useMemo(
    () => Array.from(new Map(sessions.map((s) => [s.job_id, { id: s.job_id, role: s.job_role }])).values()),
    [sessions]
  );

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (jobFilter !== "all" && s.job_id !== jobFilter) return false;
      if (stageFilter !== "all" && s.status !== stageFilter) return false;
      return true;
    });
  }, [sessions, jobFilter, stageFilter]);

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
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Interviews</h1>
        <p className="text-gray-500 mt-1">Active and pending interview sessions · auto-refreshes every 15s</p>
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
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40"
        >
          <option value="all">All Stages</option>
          {Object.entries(STAGE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {(jobFilter !== "all" || stageFilter !== "all") && (
          <button
            onClick={() => { setJobFilter("all"); setStageFilter("all"); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl mb-3 block text-gray-300">calendar_today</span>
          {sessions.length === 0 ? (
            <>
              <p className="font-medium text-gray-500">No active interviews right now.</p>
              <p className="text-sm mt-1">Candidates are not currently recording.</p>
            </>
          ) : (
            <p className="text-sm">No interviews match the selected filters.</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <span className="text-sm text-gray-500">{filtered.length} session{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Vacancy</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Answers</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Started</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => {
                  const sc = STAGE_CONFIG[s.status] ?? { label: s.status, color: "text-gray-500" };
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
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {s.transcribed_count}/{s.responses_count} transcribed
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            router.push(`/recruiter/jobs/${s.job_id}/candidates/${s.id}`)
                          }
                          className="text-[#22C55E] text-xs font-semibold hover:underline"
                        >
                          View Transcripts
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
