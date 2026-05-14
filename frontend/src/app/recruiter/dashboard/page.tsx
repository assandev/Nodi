"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDashboardStats, getJobs, JobOut, RecruiterStats } from "@/lib/api";

const STATUS_LABEL: Record<JobOut["status"], string> = {
  active: "Active",
  draft: "Draft",
  paused: "Paused",
  closed: "Closed",
};

const STATUS_COLOR: Record<JobOut["status"], string> = {
  active: "text-[#2FC278]",
  draft: "text-gray-400",
  paused: "text-yellow-500",
  closed: "text-red-400",
};

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobOut[]>([]);
  const [statsData, setStatsData] = useState<RecruiterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getJobs(), getDashboardStats()])
      .then(([j, s]) => { setJobs(j); setStatsData(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "Active Vacancies",
      value: loading ? "…" : String(statsData?.active_jobs ?? 0),
      icon: "assignment",
    },
    {
      label: "Interviews Started",
      value: loading ? "…" : String(statsData?.total_sessions ?? 0),
      icon: "send",
    },
    {
      label: "Completed Interviews",
      value: loading ? "…" : String(statsData?.submitted_sessions ?? 0),
      icon: "check_circle",
    },
    {
      label: "In Progress",
      value: loading ? "…" : String(statsData?.in_progress_sessions ?? 0),
      icon: "pending",
    },
  ];

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Hiring Overview</h2>
          <p className="text-gray-500 mt-1">{"Here's what's happening with your pipeline today."}</p>
        </div>
        <button
          onClick={() => router.push("/recruiter/jobs/new")}
          className="bg-[#A0A3FF] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-[#8C8FF0] transition-colors"
        >
          Create New Vacancy
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-[#A0A3FF]/10 rounded-lg text-[#A0A3FF]">
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium">{s.label}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Vacancies table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Vacancies</h3>
              <Link href="/recruiter/jobs" className="text-[#A0A3FF] text-sm font-semibold hover:underline">
                View All
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="size-6 border-2 border-[#A0A3FF] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-3 block text-gray-300">
                  work_outline
                </span>
                <p className="text-sm">No vacancies yet.</p>
                <p className="text-xs mt-1">Create your first vacancy to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {jobs.map((job) => (
                      <tr
                        key={job.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/recruiter/jobs/${job.id}`)}
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">{job.role}</td>
                        <td className="px-6 py-4 text-gray-500">{job.company}</td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1.5 font-semibold text-sm ${STATUS_COLOR[job.status]}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {STATUS_LABEL[job.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {new Date(job.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full">
            <h3 className="font-bold text-gray-900 mb-6">Recent Activity</h3>
            <div className="text-center text-gray-400 py-8">
              <span className="material-symbols-outlined text-3xl mb-2 block text-gray-300">
                history
              </span>
              <p className="text-sm">No activity yet.</p>
            </div>

            <div className="mt-8 p-4 bg-[#A0A3FF]/8 rounded-xl border border-dashed border-[#A0A3FF]/30">
              <div className="flex items-center gap-3">
                <div className="size-8 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#A0A3FF] text-base">
                    tips_and_updates
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700">Recruiter Tip</p>
                  <p className="text-[11px] text-gray-500">
                    Create a job and invite candidates to get started.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
