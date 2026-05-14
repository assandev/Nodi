"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  getInterviewSession,
  submitSessionResponse,
  submitInterview,
  InterviewSessionData,
  QuestionOut,
} from "@/lib/api";

type Phase = "loading" | "error" | "intro" | "interview" | "done";
type RecordingState = "idle" | "recording" | "recorded";

interface SavedResponse {
  blob: Blob;
  url: string;
  duration: number;
}

interface ErrorInfo {
  status: number;
  message: string;
}

function NodiLogo() {
  return (
    <div className="flex items-center gap-3 mb-8 justify-center">
      <div className="size-8 text-[#22C55E]">
        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <span className="text-gray-900 text-2xl font-bold">Nodi</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="size-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorScreen({ error }: { error: ErrorInfo }) {
  let message = error.message || "Something went wrong.";
  if (error.status === 404) message = "This session link is invalid or has expired.";
  if (error.status === 410) message = "This interview has already been submitted.";
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <NodiLogo />
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8">
          <span className="material-symbols-outlined text-5xl text-gray-400 mb-4 block">
            error_outline
          </span>
          <p className="text-white font-semibold text-lg mb-2">Unable to load interview</p>
          <p className="text-gray-400 text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}

interface IntroScreenProps {
  data: InterviewSessionData;
  onStart: () => void;
}

function IntroScreen({ data, onStart }: IntroScreenProps) {
  const tips = [
    { icon: "mic", label: "Find a quiet place", desc: "Background noise affects transcription quality" },
    { icon: "schedule", label: "Speak naturally", desc: "Take your time — there's no rush" },
    { icon: "check_circle", label: "Answer fully", desc: "Use examples from your experience" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto py-16 px-6 text-center">
        <NodiLogo />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">You&apos;re ready to begin</h1>
        <p className="text-gray-500 mb-10">
          Your interview for{" "}
          <span className="font-semibold text-gray-900">{data.job.role}</span> at{" "}
          <span className="font-semibold text-gray-900">{data.job.company}</span> has{" "}
          <span className="font-semibold text-gray-900">
            {data.questions.length} question{data.questions.length !== 1 ? "s" : ""}
          </span>
          .
        </p>
        <div className="space-y-3 mb-10 text-left">
          {tips.map((tip) => (
            <div
              key={tip.label}
              className="bg-white rounded-2xl px-5 py-4 flex items-start gap-4 shadow-sm border border-gray-200"
            >
              <div className="h-9 w-9 rounded-full bg-[#22C55E] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white text-base">{tip.icon}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{tip.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onStart}
          className="bg-[#22C55E] text-white rounded-2xl px-10 py-4 text-base font-bold shadow-lg hover:bg-[#16A34A] active:scale-95 transition-all"
        >
          Start Interview →
        </button>
        <p className="mt-6 text-xs text-gray-400">
          Responses are encrypted and shared only with the hiring team.
        </p>
      </div>
    </div>
  );
}

function DoneScreen({ candidateName }: { candidateName: string }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <NodiLogo />
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
          <span className="material-symbols-outlined text-5xl text-[#10B981] mb-4 block">
            check_circle
          </span>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Interview submitted!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Thank you, <span className="font-semibold text-gray-900">{candidateName}</span>! We&apos;ll
            review your responses and be in touch soon.
          </p>
          <p className="text-xs text-gray-400">You can close this tab.</p>
        </div>
      </div>
    </div>
  );
}

interface InterviewScreenProps {
  sessionToken: string;
  questions: QuestionOut[];
  onComplete: () => void;
  onError: (msg: string) => void;
}

function InterviewScreen({ sessionToken, questions, onComplete, onError }: InterviewScreenProps) {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, SavedResponse>>({});
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(20).fill(4));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const currentQuestion = questions[currentQIndex];

  useEffect(() => {
    setRecordingState(responses[currentQuestion.id] ? "recorded" : "idle");
    setTimeElapsed(0);
    setWaveformBars(Array(20).fill(4));
    setUploadError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQIndex]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  async function startRecording() {
    setUploadError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setUploadError("Microphone access denied. Please allow microphone access and try again.");
      return;
    }

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    function animateWaveform() {
      analyser.getByteFrequencyData(data);
      const bars = Array.from({ length: 20 }, (_, i) => {
        const val = data[Math.floor((i * data.length) / 20)] / 255;
        return Math.max(4, Math.round(val * 80));
      });
      setWaveformBars(bars);
      animFrameRef.current = requestAnimationFrame(animateWaveform);
    }
    animateWaveform();

    elapsedRef.current = 0;
    setTimeElapsed(0);
    const limit = currentQuestion.time_limit_seconds ?? 120;
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setTimeElapsed(elapsedRef.current);
      if (elapsedRef.current >= limit) {
        mediaRecorderRef.current?.stop();
      }
    }, 1000);

    audioChunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      const duration = elapsedRef.current;
      setResponses((prev) => ({ ...prev, [currentQuestion.id]: { blob, url, duration } }));
      setRecordingState("recorded");
      stream.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
    recorder.start(100);
    mediaRecorderRef.current = recorder;
    setRecordingState("recording");
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function reRecord() {
    const existing = responses[currentQuestion.id];
    if (existing) URL.revokeObjectURL(existing.url);
    setResponses((prev) => {
      const next = { ...prev };
      delete next[currentQuestion.id];
      return next;
    });
    setRecordingState("idle");
  }

  async function advanceOrSubmit() {
    const isLast = currentQIndex === questions.length - 1;
    const r = responses[currentQuestion.id];
    if (!r) return;

    setUploading(true);
    setUploadError(null);
    try {
      await submitSessionResponse(sessionToken, currentQuestion.id, r.blob, r.duration);
    } catch (err: unknown) {
      const e = err as Error;
      setUploadError(e.message || "Failed to upload response. Please try again.");
      setUploading(false);
      return;
    }

    if (!isLast) {
      setCurrentQIndex((i) => i + 1);
      setUploading(false);
    } else {
      try {
        await submitInterview(sessionToken);
        onComplete();
      } catch (err: unknown) {
        const e = err as Error;
        onError(e.message || "Failed to submit interview. Please try again.");
        setUploading(false);
      }
    }
  }

  const isLast = currentQIndex === questions.length - 1;
  const hasResponse = Boolean(responses[currentQuestion.id]);
  const timeLimit = currentQuestion.time_limit_seconds ?? 120;
  const progressFraction = Math.min(timeElapsed / timeLimit, 1);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressFraction * circumference;
  const timeRemaining = Math.max(0, timeLimit - timeElapsed);
  const mm = Math.floor(timeRemaining / 60);
  const ss = String(timeRemaining % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          {currentQIndex > 0 && (
            <button
              onClick={() => {
                if (recordingState === "recording") stopRecording();
                setCurrentQIndex((i) => i - 1);
              }}
              className="h-10 w-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#22C55E] transition-colors"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
          )}
          <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
            Question {currentQIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-5 text-[#22C55E]">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="text-gray-900 font-bold text-sm">Nodi</span>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 flex flex-col items-center text-center">
        {uploadError && (
          <div className="w-full bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-6">
            {uploadError}
          </div>
        )}

        {recordingState !== "idle" ? (
          <div className="flex flex-col items-center mb-8">
            <svg width="128" height="128" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="8" />
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="#22C55E"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 64 64)"
                style={{ transition: "stroke-dashoffset 0.5s linear" }}
              />
              <text
                x="64"
                y="68"
                textAnchor="middle"
                fontSize="20"
                fontWeight="700"
                fill="#111827"
                fontFamily="sans-serif"
              >
                {mm}:{ss}
              </text>
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
              Remaining
            </span>
          </div>
        ) : (
          <div className="mb-8 h-[152px] flex items-center justify-center" />
        )}

        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight max-w-2xl">
          &ldquo;{currentQuestion.question_text}&rdquo;
        </h2>
        <p className="mt-4 text-gray-500">Take a moment to reflect before answering.</p>

        <div className="mt-8 w-full flex flex-col items-center">
          {recordingState === "idle" && (
            <>
              {hasResponse ? (
                <button onClick={reRecord} className="text-sm text-gray-400 hover:text-gray-900 underline">
                  Re-record response
                </button>
              ) : (
                <>
                  <button
                    onClick={startRecording}
                    className="h-24 w-24 mx-auto rounded-full bg-[#22C55E] text-white flex items-center justify-center shadow-xl hover:bg-[#16A34A] active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-4xl">mic</span>
                  </button>
                  <p className="mt-4 text-sm text-gray-400">Click to start recording</p>
                </>
              )}
            </>
          )}

          {recordingState === "recording" && (
            <>
              <div className="relative flex h-28 w-full max-w-lg mx-auto items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm px-8">
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Recording Audio
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {waveformBars.map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}px` }}
                      className="w-1.5 rounded-full bg-[#22C55E] transition-all duration-100"
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={stopRecording}
                className="rounded-full bg-white border-2 border-[#22C55E] text-[#22C55E] px-6 py-2.5 font-semibold text-sm flex items-center gap-2 mx-auto mt-4 hover:bg-[#22C55E] hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-base">stop</span>
                Stop Recording
              </button>
            </>
          )}

          {recordingState === "recorded" && (
            <>
              <audio
                controls
                src={responses[currentQuestion.id]?.url}
                className="w-full max-w-md mx-auto rounded-xl"
              />
              <button onClick={reRecord} className="mt-3 text-sm text-gray-400 hover:text-gray-900 underline">
                Re-record
              </button>
            </>
          )}
        </div>

        {recordingState !== "recording" && (hasResponse || recordingState === "recorded") && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <button
              onClick={advanceOrSubmit}
              disabled={uploading}
              className="bg-[#22C55E] text-white rounded-2xl px-10 py-3.5 text-sm font-bold shadow-md hover:bg-[#16A34A] active:scale-95 transition-all disabled:opacity-60"
            >
              {uploading ? "Uploading…" : isLast ? "Submit Interview" : "Next Question →"}
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.currentTarget.blur()}
              className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
            >
              I need a moment to pause
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 py-6 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-400 text-base">smart_toy</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Interviewer</p>
            <p className="text-xs font-semibold text-gray-900">Nodi AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="material-symbols-outlined text-base">lock</span>
          <span>Responses are encrypted and shared only with the hiring team.</span>
        </div>
      </footer>
    </div>
  );
}

export default function InterviewSessionPage() {
  const params = useParams<{ sessionToken: string }>();
  const sessionToken = params.sessionToken;

  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<InterviewSessionData | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo>({ status: 0, message: "" });
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getInterviewSession(sessionToken)
      .then((d) => {
        setData(d);
        setPhase("intro");
      })
      .catch((err: Error & { status?: number }) => {
        setErrorInfo({ status: err.status ?? 0, message: err.message });
        setPhase("error");
      });
  }, [sessionToken]);

  if (phase === "loading") return <LoadingScreen />;
  if (phase === "error") return <ErrorScreen error={errorInfo} />;
  if (!data) return null;

  if (phase === "intro") {
    return <IntroScreen data={data} onStart={() => setPhase("interview")} />;
  }

  if (phase === "interview") {
    return (
      <>
        {submitError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-600 rounded-xl px-5 py-3 text-sm shadow-lg">
            {submitError}
          </div>
        )}
        <InterviewScreen
          sessionToken={sessionToken}
          questions={data.questions}
          onComplete={() => setPhase("done")}
          onError={(msg) => {
            setSubmitError(msg);
            setTimeout(() => setSubmitError(null), 5000);
          }}
        />
      </>
    );
  }

  if (phase === "done") {
    return <DoneScreen candidateName={data.candidate.full_name} />;
  }

  return null;
}
