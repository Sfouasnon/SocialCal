"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Users, Bell, User, Plus, Rss } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Group } from "@/lib/supabase/database.types";
import clsx from "clsx";

const NAV = [
  { href: "/feed",     label: "Feed",     icon: Rss },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/groups",   label: "Groups",   icon: Users },
  { href: "/profile",  label: "Profile",  icon: User },
];

export default function AppShell({
  children,
  profile,
  groups,
}: {
  children: React.ReactNode;
  profile: Profile | null;
  groups: Group[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : profile?.username?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-stone-100 shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-400 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="3" width="12" height="10" rx="2" stroke="white" strokeWidth="1.5"/>
                <path d="M1 6h12" stroke="white" strokeWidth="1.5"/>
                <path d="M4 1v3M10 1v3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="4.5" cy="9" r="1" fill="white"/>
                <circle cx="7" cy="9" r="1" fill="white"/>
                <circle cx="9.5" cy="9" r="1" fill="white"/>
              </svg>
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight">
              Social<span className="text-brand-400">Cal</span>
            </h1>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-brand-50 text-brand-600"
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}

          {/* Groups */}
          {groups.length > 0 && (
            <div className="pt-4">
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                My groups
              </p>
              {groups.map((g) => (
                <Link
                  key={g.id}
                  href={`/groups/${g.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: g.color }}
                  />
                  {g.name}
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* Profile + sign out */}
        <div className="p-3 border-t border-stone-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-xs font-semibold text-brand-600 shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">
                {profile?.full_name ?? profile?.username}
              </p>
            </div>
            <button
              onClick={signOut}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-stone-100 pb-safe z-50">
        <div className="flex items-center justify-around h-14">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center gap-1 px-4 py-1 text-[10px] font-medium transition-colors",
                pathname.startsWith(href)
                  ? "text-brand-600"
                  : "text-stone-400"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Floating compose button (mobile) ── */}
      <Link
        href="/events/new"
        className="md:hidden fixed bottom-20 right-4 w-12 h-12 bg-brand-400 hover:bg-brand-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-50"
      >
        <Plus className="w-5 h-5" />
      </Link>
    </div>
  );
}
