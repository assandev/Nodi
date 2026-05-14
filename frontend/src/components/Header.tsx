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
    <header className="flex items-center justify-between shrink-0 border-b border-gray-200 bg-white px-8 py-3">
      <label className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 h-10 min-w-48 max-w-xs cursor-text">
        <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
        <input
          className="bg-transparent text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none w-full"
          placeholder="Search"
        />
      </label>

      <div className="flex items-center gap-2">
        <button className="flex items-center justify-center size-10 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>
        <button className="flex items-center justify-center size-10 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>
        <div className="size-10 rounded-full bg-[#22C55E] flex items-center justify-center text-white text-sm font-bold ml-1">
          {initials}
        </div>
      </div>
    </header>
  );
}
