"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getJob, getQuestions, createInvitation, JobOut, QuestionOut } from "@/lib/api";

function StatusBadge({ status }: { status: JobOut["status"] }) {
  const config = {
    draft:  { bg: "bg-gray-100",         text: "text-gray-600",   label: "Draft"  },
    active: { bg: "bg-[#2FC278]/15",      text: "text-[#2FC278]",  label: "Active" },
    paused: { bg: "bg-yellow-100",        text: "text-yellow-700", label: "Paused" },
    closed: { bg: "bg-red-100",           text: "text-red-600",    label: "Closed" },
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

export default function JobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobOut | null>(null);
  const [questions, setQuestions] = useState<QuestionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([getJob(params.jobId), getQuestions(params.jobId)])
      .then(([j, q]) => { setJob(j); setQuestions(q); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.jobId]);

  async function handleGenerateInvite() {
    if (!job) return;
    setCreatingLink(true);
    try {
      const inv = await createInvitation(job.id);
      setInviteLink(`${window.location.origin}/interview/${inv.token}`);
    } catch {
      // silent — could show a toast here
    } finally {
      setCreatingLink(false);
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="size-8 border-2 border-[#A0A3FF] border-t-transparent rounded-full animate-spin" />
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
            <Link href="/recruiter/jobs" className="hover:text-[#A0A3FF] transition-colors">
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
        <div className="flex gap-3 shrink-0">
          <Link
            href={`/recruiter/jobs/${job.id}/edit`}
            className="border border-gray-200 bg-white text-gray-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleGenerateInvite}
            disabled={creatingLink}
            className="bg-[#A0A3FF] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#8C8FF0] disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {creatingLink ? (
              <>
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              "Generate Invite Link"
            )}
          </button>
        </div>
      </div>

      {inviteLink && (
        <div className="bg-[#0F172A] text-white rounded-xl p-4 mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#A0A3FF] text-base">link</span>
              <span className="text-sm font-semibold">Candidate Interview Link</span>
            </div>
            <button
              onClick={() => setInviteLink(null)}
              className="text-[#8899BB] hover:text-white transition-colors"
              title="Close"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 bg-[#1E2744] border border-[#2A3A5E] rounded-xl px-4 py-2.5 text-sm text-[#8899BB] focus:outline-none select-all"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={handleCopy}
              className="bg-[#A0A3FF] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#8C8FF0] transition-colors shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-[#8899BB] text-xs">Share this link with the candidate. It expires in 7 days.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: job details */}
        <div className="lg:col-span-2 space-y-4">
          <Section title="Job Description">{job.job_description}</Section>
          {job.responsibilities && <Section title="Responsibilities">{job.responsibilities}</Section>}
          {job.requirements && <Section title="Requirements">{job.requirements}</Section>}
          {job.culture_notes && <Section title="Culture Notes">{job.culture_notes}</Section>}
        </div>

        {/* Right: questions */}
        <div className="lg:col-span-1">
          <div className="bg-[#0F172A] text-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm">Interview Questions</h3>
              <span className="bg-white/10 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
                {questions.length}
              </span>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-3xl text-slate-600 mb-2 block">quiz</span>
                <p className="text-slate-500 text-sm">No questions yet.</p>
                <Link
                  href={`/recruiter/jobs/${job.id}/edit`}
                  className="text-[#A0A3FF] text-xs font-semibold hover:underline mt-1 block"
                >
                  Edit to add questions
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#A0A3FF] text-xs font-bold">Q{q.position}</span>
                      <span className="text-slate-500 text-[10px]">{q.question_type}</span>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed">{q.question_text}</p>
                    {q.time_limit_seconds && (
                      <p className="text-slate-500 text-[10px] mt-1.5">{q.time_limit_seconds}s limit</p>
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
