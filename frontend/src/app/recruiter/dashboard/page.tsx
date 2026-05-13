const stats = [
  { label: "Active Vacancies", value: "0", change: "", icon: "assignment", changeColor: "" },
  { label: "Invitations Sent", value: "0", change: "", icon: "send", changeColor: "" },
  { label: "Completed Interviews", value: "0", change: "", icon: "check_circle", changeColor: "" },
  { label: "AI Recommended", value: "0", change: "", icon: "psychology", changeColor: "" },
];

const vacancies: {
  role: string;
  candidates: number;
  status: string;
  statusColor: string;
  lastActivity: string;
}[] = [];

const activity: {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  time: string;
}[] = [];

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Hiring Overview</h2>
          <p className="text-gray-500 mt-1">{"Here's what's happening with your pipeline today."}</p>
        </div>
        <button className="bg-[#ec5b13] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-[#d4500f] transition-colors">
          Create New Vacancy
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-[#ec5b13]/10 rounded-lg text-[#ec5b13]">
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              {s.change && (
                <span className={`text-xs font-bold px-2 py-1 rounded ${s.changeColor}`}>
                  {s.change}
                </span>
              )}
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
              <h3 className="font-bold text-gray-900">Active Vacancies</h3>
              <button className="text-[#ec5b13] text-sm font-semibold hover:underline">
                View All
              </button>
            </div>
            {vacancies.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-3 block text-gray-300">
                  work_outline
                </span>
                <p className="text-sm">No active vacancies yet.</p>
                <p className="text-xs mt-1">Create your first vacancy to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Role Name
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                        Candidates
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Pipeline Status
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vacancies.map((v) => (
                      <tr key={v.role} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-5 font-medium text-gray-900">{v.role}</td>
                        <td className="px-6 py-5 text-center">
                          <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-sm font-semibold">
                            {v.candidates}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`flex items-center gap-2 font-semibold text-sm ${v.statusColor}`}
                          >
                            <span className={`w-2 h-2 rounded-full bg-current`} />
                            {v.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-gray-500 text-sm">{v.lastActivity}</td>
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
            {activity.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <span className="material-symbols-outlined text-3xl mb-2 block text-gray-300">
                  history
                </span>
                <p className="text-sm">No activity yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activity.map((a, i) => (
                  <div key={i} className="flex gap-4">
                    <div
                      className={`size-10 rounded-full ${a.iconBg} flex items-center justify-center ${a.iconColor} shrink-0`}
                    >
                      <span className="material-symbols-outlined text-xl">{a.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{a.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{a.description}</p>
                      <span className="text-[10px] font-bold text-gray-400 uppercase mt-2 block">
                        {a.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <div className="flex items-center gap-3">
                <div className="size-8 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-gray-400 text-base">
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
