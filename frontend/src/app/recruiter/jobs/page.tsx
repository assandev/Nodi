"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getJobs, JobOut } from "@/lib/api";

function StatusBadge({ status }: { status: JobOut["status"] }) {
  const config = {
    draft:  { bg: "bg-gray-100",           text: "text-gray-600",   label: "Draft"  },
    active: { bg: "bg-[#2FC278]/15",        text: "text-[#2FC278]",  label: "Active" },
    paused: { bg: "bg-yellow-100",          text: "text-yellow-700", label: "Paused" },
    closed: { bg: "bg-red-100",             text: "text-red-600",    label: "Closed" },
  }[status];
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Vacancies</h2>
        <button
          onClick={() => router.push("/recruiter/jobs/new")}
          className="bg-[#A0A3FF] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#8C8FF0] transition-colors"
        >
          Create New Vacancy
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="size-8 border-2 border-[#A0A3FF] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <span className="material-symbols-outlined text-5xl mb-4 block text-gray-300">
            work_outline
          </span>
          <p className="text-gray-500 font-medium">No vacancies yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first vacancy to start interviewing candidates.</p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{job.role}</td>
                  <td className="px-6 py-4 text-gray-500">{job.company}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(job.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/recruiter/jobs/${job.id}`}
                      className="text-[#A0A3FF] text-sm font-semibold hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
