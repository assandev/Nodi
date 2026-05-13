"use client";
import { useEffect, useState } from "react";
import { getMe, type MeResponse } from "@/lib/api";

export default function Header() {
  const [user, setUser] = useState<MeResponse | null>(null);

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, []);

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "R";

  return (
    <header className="flex items-center justify-between shrink-0 border-b border-[#1E2744] bg-[#0F172A] px-8 py-3">
      <label className="flex items-center gap-2 bg-[#1E2744] rounded-xl px-4 h-10 min-w-48 max-w-xs cursor-text">
        <span className="material-symbols-outlined text-[#8899BB] text-xl">search</span>
        <input
          className="bg-transparent text-white text-sm placeholder:text-[#8899BB] focus:outline-none w-full"
          placeholder="Search"
        />
      </label>

      <div className="flex items-center gap-2">
        <button className="flex items-center justify-center size-10 rounded-xl bg-[#1E2744] text-white hover:bg-[#252E55] transition-colors">
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>
        <button className="flex items-center justify-center size-10 rounded-xl bg-[#1E2744] text-white hover:bg-[#252E55] transition-colors">
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>
        <div className="size-10 rounded-full bg-[#A0A3FF] flex items-center justify-center text-white text-sm font-bold ml-1">
          {initials}
        </div>
      </div>
    </header>
  );
}
