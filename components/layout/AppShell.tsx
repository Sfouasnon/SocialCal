"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Users, User, Plus, Rss } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Group } from "@/lib/supabase/database.types";
import clsx from "clsx";

const NAV = [
  { href: "/feed",     label: "Feed",     icon: Rss },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/groups",   label: "Groups",   icon: Users },
  { href: "/profile",  label: "Profile",  icon: User },
];

function SocialCalLogo({ height = 44 }: { height?: number }) {
  const w = Math.round(height * 4.8);
  return (
    <svg width={w} height={height} viewBox="0 0 480 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A05AA8" stopOpacity="0.52"/>
          <stop offset="30%" stopColor="#E06880" stopOpacity="0.48"/>
          <stop offset="62%" stopColor="#F49860" stopOpacity="0.44"/>
          <stop offset="82%" stopColor="#F9C870" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#FADA90" stopOpacity="0.36"/>
        </linearGradient>
        <linearGradient id="sc-ocean" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3ABEC8" stopOpacity="0.44"/>
          <stop offset="100%" stopColor="#1E8898" stopOpacity="0.38"/>
        </linearGradient>
        <linearGradient id="sc-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EAC878" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#D09850" stopOpacity="0.44"/>
        </linearGradient>
        <clipPath id="sc-clip">
          <rect x="0" y="0" width="480" height="100"/>
        </clipPath>
      </defs>
      <g clipPath="url(#sc-clip)">
        <rect x="0" y="0" width="480" height="64" fill="url(#sc-sky)"/>
        <ellipse cx="240" cy="64" rx="200" ry="12" fill="#F9C870" opacity="0.18"/>
        <rect x="0" y="62" width="480" height="20" fill="url(#sc-ocean)"/>
        <path d="M0 67 Q100 64 200 67 Q300 70 400 67 Q440 66 480 67" stroke="white" strokeWidth="1.2" fill="none" opacity="0.28"/>
        <rect x="0" y="80" width="480" height="20" fill="url(#sc-sand)"/>
        <path d="M0 81 Q160 79 320 81 Q400 82 480 81" stroke="#C09050" strokeWidth="0.7" fill="none" opacity="0.35"/>
      </g>
      <text x="14" y="76"
        fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontSize="74"
        fontWeight="700"
        letterSpacing="-2"
      >
        <tspan fill="#E8C88A">Social</tspan><tspan fill="#2E94B0">Cal</tspan>
      </text>
      <circle cx="458" cy="34" r="20" fill="#FAEAB0" opacity="0.36"/>
      <circle cx="458" cy="34" r="13" fill="#F9D880" opacity="0.50"/>
      <circle cx="458" cy="34" r="7"  fill="#FAECC0" opacity="0.65"/>
    </svg>
  );
}

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
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-stone-100 shrink-0">
        <div className="border-b border-stone-100 overflow-hidden">
          <SocialCalLogo height={52} />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-brand-50 text-brand-600"
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
              )}>
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}

          {groups.length > 0 && (
            <div className="pt-4">
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                My groups
              </p>
              {groups.map((g) => (
                <Link key={g.id} href={`/groups/${g.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition-colors">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                  {g.name}
                </Link>
              ))}
            </div>
          )}
        </nav>

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
            <button onClick={signOut} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
              Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* Mobile top header */}
        <div className="md:hidden sticky top-0 z-10 overflow-hidden flex items-center justify-between bg-white border-b border-stone-100">
          <SocialCalLogo height={48} />
          <Link href="/events/new"
            className="mr-3 bg-brand-400 hover:bg-brand-600 text-white text-xs font-medium px-3 py-1.5 rounded-xl transition-colors shrink-0">
            + Event
          </Link>
        </div>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-stone-100 pb-safe z-50">
        <div className="flex items-center justify-around h-14">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={clsx(
                "flex flex-col items-center gap-1 px-4 py-1 text-[10px] font-medium transition-colors",
                pathname.startsWith(href) ? "text-brand-600" : "text-stone-400"
              )}>
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile compose FAB */}
      <Link href="/events/new"
        className="md:hidden fixed bottom-20 right-4 w-12 h-12 bg-brand-400 hover:bg-brand-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-50">
        <Plus className="w-5 h-5" />
      </Link>
    </div>
  );
}
