"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AISuggestion,
  createJob,
  generateQuestions,
  QuestionPayload,
  saveQuestions,
  updateJob,
} from "@/lib/api";

const inputClass =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#A0A3FF]/30 focus:border-[#A0A3FF] transition-colors bg-white resize-none";

const CATEGORY_COLORS: Record<string, string> = {
  Technical: "text-blue-400",
  Behavioral: "text-purple-300",
  "Culture Fit": "text-[#2FC278]",
};

export default function NewJobPage() {
  const router = useRouter();
  const jobIdRef = useRef<string | null>(null);

  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [requirements, setRequirements] = useState("");
  const [cultureNotes, setCultureNotes] = useState("");

  const [editableQuestions, setEditableQuestions] = useState<AISuggestion[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!role.trim() || !company.trim() || !jobDescription.trim()) {
      setGenerateError("Please fill in Role, Company, and Job Description before generating questions.");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      if (jobIdRef.current === null) {
        const job = await createJob({
          role,
          company,
          job_description: jobDescription,
          responsibilities: responsibilities || undefined,
          requirements: requirements || undefined,
          culture_notes: cultureNotes || undefined,
        });
        jobIdRef.current = job.id;
      } else {
        await updateJob(jobIdRef.current, {
          role,
          company,
          job_description: jobDescription,
          responsibilities: responsibilities || undefined,
          requirements: requirements || undefined,
          culture_notes: cultureNotes || undefined,
        });
      }
      const result = await generateQuestions(jobIdRef.current);
      setEditableQuestions(result.suggestions);
      if (result.warning) setGenerateError(result.warning);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(publish: boolean) {
    if (!role.trim() || !company.trim() || !jobDescription.trim()) {
      setSaveError("Role, Company, and Job Description are required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      let id = jobIdRef.current;
      if (id === null) {
        const job = await createJob({
          role,
          company,
          job_description: jobDescription,
          responsibilities: responsibilities || undefined,
          requirements: requirements || undefined,
          culture_notes: cultureNotes || undefined,
        });
        id = job.id;
        jobIdRef.current = id;
      }
      if (publish) {
        await updateJob(id, { status: "active" });
      }
      if (editableQuestions.length > 0) {
        const payload: QuestionPayload[] = editableQuestions.map((q, i) => ({
          question_text: q.question_text,
          position: i + 1,
          time_limit_seconds: q.time_limit_seconds,
          question_type: q.question_type,
        }));
        await saveQuestions(id, payload);
      }
      router.push(`/recruiter/jobs/${id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function confirmEdit(index: number) {
    setEditableQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, question_text: editingText } : q))
    );
    setEditingIndex(null);
  }

  function deleteQuestion(index: number) {
    setEditableQuestions((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function addCustomQuestion() {
    const next: AISuggestion = {
      question_text: "",
      category: "Behavioral",
      position: editableQuestions.length + 1,
      time_limit_seconds: 120,
      question_type: "voice",
    };
    setEditableQuestions((prev) => [...prev, next]);
    setEditingIndex(editableQuestions.length);
    setEditingText("");
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/recruiter/jobs"
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Vacancies
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">Create New Vacancy</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="border border-gray-200 bg-white text-gray-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="bg-[#A0A3FF] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#8C8FF0] disabled:opacity-50 transition-colors"
          >
            {saving ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: form */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Role Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Company <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Job Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={8}
                placeholder="Describe the role, its context, and what success looks like…"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Responsibilities</label>
              <textarea
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                rows={5}
                placeholder="Key responsibilities and day-to-day tasks…"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Requirements</label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={5}
                placeholder="Required skills, experience, and qualifications…"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Culture Notes</label>
              <textarea
                value={cultureNotes}
                onChange={(e) => setCultureNotes(e.target.value)}
                rows={4}
                placeholder="Team values, ways of working, what makes a great culture fit…"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Right: AI questions panel */}
        <aside className="lg:col-span-4">
          <div className="bg-[#0F172A] rounded-2xl p-6 text-white sticky top-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#A0A3FF]/20 p-2 rounded-lg shrink-0">
                <span className="material-symbols-outlined text-[#A0A3FF]">auto_awesome</span>
              </div>
              <div>
                <h2 className="font-bold text-sm">AI Interview Questions</h2>
                <p className="text-slate-400 text-xs">Generated from your job description</p>
              </div>
            </div>

            {editableQuestions.length === 0 && !generating && (
              <div className="text-center py-8 mb-4">
                <span className="material-symbols-outlined text-3xl text-slate-600 mb-2 block">
                  quiz
                </span>
                <p className="text-slate-500 text-sm">
                  Fill in the job details and click Generate to get AI-suggested questions.
                </p>
              </div>
            )}

            {editableQuestions.length > 0 && (
              <div className="space-y-3 mb-4 max-h-[480px] overflow-y-auto pr-1">
                {editableQuestions.map((q, i) => (
                  <div
                    key={i}
                    className="group bg-white/5 border border-white/10 hover:border-[#A0A3FF]/40 rounded-xl p-3 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${CATEGORY_COLORS[q.category] ?? "text-slate-400"}`}>
                        {q.category}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => { setEditingIndex(i); setEditingText(q.question_text); }}
                          className="text-slate-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => deleteQuestion(i)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>

                    {editingIndex === i ? (
                      <div>
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={3}
                          autoFocus
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-[#A0A3FF]/60"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => confirmEdit(i)}
                            className="text-xs bg-[#A0A3FF] text-white px-3 py-1 rounded-lg font-semibold hover:bg-[#8C8FF0] transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-200 text-sm leading-relaxed">{q.question_text || <em className="text-slate-500">Empty question</em>}</p>
                    )}

                    <p className="text-slate-500 text-[10px] mt-1.5">{q.time_limit_seconds}s · {q.question_type}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-[#A0A3FF] text-white rounded-xl py-3 font-bold text-sm hover:bg-[#8C8FF0] disabled:opacity-60 transition-colors mb-3 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  {editableQuestions.length > 0 ? "Regenerate Questions" : "Generate Questions with AI"}
                </>
              )}
            </button>

            <button
              onClick={addCustomQuestion}
              className="w-full text-slate-400 hover:text-white text-sm font-medium py-2 transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Add Custom Question
            </button>

            {generateError && (
              <p className="text-amber-400 text-xs mt-3 bg-amber-400/10 rounded-lg px-3 py-2">
                {generateError}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
