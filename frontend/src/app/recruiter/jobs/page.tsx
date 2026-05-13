export default function JobsPage() {
  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Vacancies</h2>
        <button className="bg-[#ec5b13] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#d4500f] transition-colors">
          Create New Vacancy
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <span className="material-symbols-outlined text-5xl mb-4 block text-gray-300">
          work_outline
        </span>
        <p className="text-gray-500 font-medium">No vacancies yet</p>
        <p className="text-gray-400 text-sm mt-1">Create your first vacancy to start interviewing candidates.</p>
      </div>
    </div>
  );
}
