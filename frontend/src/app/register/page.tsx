"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, login } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(fullName, email, password);
      const data = await login(email, password);
      setToken(data.access_token);
      router.push("/recruiter/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d2818] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="size-8 text-[#2fc16c]">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="text-white text-2xl font-bold">Nodi</span>
        </div>

        <div className="bg-[#112318] border border-[#1a4030] rounded-2xl p-8">
          <h2 className="text-white text-xl font-bold mb-1">Create your account</h2>
          <p className="text-[#8fc9a7] text-sm mb-6">Start hiring smarter with AI-powered interviews</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8fc9a7] mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Jane Smith"
                className="w-full bg-[#1a4030] border border-[#2a5a40] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-[#5a9070] focus:outline-none focus:ring-2 focus:ring-[#2fc16c]/50 focus:border-[#2fc16c] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8fc9a7] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full bg-[#1a4030] border border-[#2a5a40] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-[#5a9070] focus:outline-none focus:ring-2 focus:ring-[#2fc16c]/50 focus:border-[#2fc16c] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8fc9a7] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#1a4030] border border-[#2a5a40] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-[#5a9070] focus:outline-none focus:ring-2 focus:ring-[#2fc16c]/50 focus:border-[#2fc16c] transition-colors"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2fc16c] text-white rounded-xl py-2.5 text-sm font-bold hover:bg-[#28a85d] disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-[#8fc9a7] mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-[#2fc16c] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
