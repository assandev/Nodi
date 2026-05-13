"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { removeToken } from "@/lib/auth";

const nav = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: "dashboard" },
  { label: "Vacancies", href: "/recruiter/jobs", icon: "work" },
  { label: "Candidates", href: "/recruiter/candidates", icon: "group" },
  { label: "Interviews", href: "/recruiter/interviews", icon: "calendar_today" },
  { label: "Reports", href: "/recruiter/reports", icon: "show_chart" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    removeToken();
    router.replace("/login");
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-[#1E2744] bg-[#0F172A] p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col pb-4 border-b border-[#1E2744]">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-5 text-[#A0A3FF]">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h1 className="text-white text-base font-bold">Nodi</h1>
          </div>
          <p className="text-[#8899BB] text-xs">Manage your hiring</p>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                  active
                    ? "bg-[#1E2744] text-white"
                    : "text-[#8899BB] hover:text-white hover:bg-[#1E2744]/60"
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2">
        <div className="p-4 bg-[#1E2744] rounded-xl">
          <p className="text-white text-xs font-bold uppercase tracking-wider mb-1">Usage Plan</p>
          <p className="text-[#8899BB] text-xs mb-3">Enterprise Gold</p>
          <div className="w-full bg-[#0F172A] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#A0A3FF] h-full w-3/4" />
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#8899BB] hover:text-white hover:bg-[#1E2744]/60 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
