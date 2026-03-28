"use client";

import type { Profile } from "@/lib/supabase/database.types";

const STATUS_CONFIG = {
  free:  { label: "Free",  dot: "bg-green-400",  text: "text-green-700" },
  busy:  { label: "Busy",  dot: "bg-stone-300",  text: "text-stone-500" },
  oot:   { label: "OOT",   dot: "bg-red-400",    text: "text-red-600"   },
  maybe: { label: "Maybe", dot: "bg-amber-400",  text: "text-amber-700" },
};

function Initials({ name, url }: { name: string | null; url: string | null }) {
  const init = name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  if (url) return <img src={url} alt={name ?? ""} className="w-7 h-7 rounded-full object-cover" />;
  return (
    <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center text-[10px] font-semibold text-brand-600">
      {init}
    </div>
  );
}

export default function FriendPanel({ friends }: { friends: Profile[] }) {
  const free  = friends.filter((f) => f.availability_status === "free");
  const other = friends.filter((f) => f.availability_status !== "free");

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-l border-stone-100 bg-white px-4 py-5">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-3">
        This weekend
      </h3>

      {friends.length === 0 ? (
        <p className="text-xs text-stone-400 leading-relaxed">
          Add friends to see who&apos;s free this weekend.
        </p>
      ) : (
        <div className="space-y-2.5">
          {[...free, ...other].map((friend) => {
            const status = STATUS_CONFIG[friend.availability_status as keyof typeof STATUS_CONFIG]
              ?? STATUS_CONFIG.busy;
            return (
              <div key={friend.id} className="flex items-center gap-2.5">
                <Initials name={friend.full_name} url={friend.avatar_url} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate leading-none">
                    {friend.full_name ?? friend.username}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                  <span className={`text-[11px] font-medium ${status.text}`}>
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-stone-100">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">
          Availability key
        </p>
        {Object.entries(STATUS_CONFIG).map(([, cfg]) => (
          <div key={cfg.label} className="flex items-center gap-2 mb-1.5">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className="text-xs text-stone-500">{cfg.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
