"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, UserPlus, Check, X, Clock } from "lucide-react";
import type { Profile } from "@/lib/supabase/database.types";

const STATUS_CONFIG = {
  free:  { label: "Free",  dot: "bg-green-400" },
  busy:  { label: "Busy",  dot: "bg-stone-300" },
  oot:   { label: "OOT",   dot: "bg-red-400"   },
  maybe: { label: "Maybe", dot: "bg-amber-400" },
};

function Avatar({ name, url }: { name?: string | null; url?: string | null }) {
  const initials = name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  if (url) return <img src={url} alt={name ?? ""} className="w-10 h-10 rounded-full object-cover" />;
  return (
    <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-sm font-semibold text-brand-600">
      {initials}
    </div>
  );
}

export default function FriendsClient({
  currentUserId,
  friends,
  pendingReceived,
  pendingSent,
}: {
  currentUserId: string;
  friends: Profile[];
  pendingReceived: never[];
  pendingSent: never[];
}) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [myFriends, setMyFriends] = useState<Profile[]>(friends);
  const [myPendingReceived, setMyPendingReceived] = useState<never[]>(pendingReceived);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, availability_status")
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .neq("id", currentUserId)
      .limit(10);
    setResults((data as Profile[]) ?? []);
    setSearching(false);
  }

  async function sendRequest(addresseeId: string) {
    await supabase.from("friend_requests").insert({
      requester_id: currentUserId,
      addressee_id: addresseeId,
    });
    setSentIds((prev) => new Set([...prev, addresseeId]));
  }

  async function acceptRequest(requestId: string, requester: Profile) {
    await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);
    setMyFriends((prev) => [...prev, requester]);
    setMyPendingReceived((prev) => prev.filter((r: never & { id: string }) => r.id !== requestId));
  }

  async function declineRequest(requestId: string) {
    await supabase
      .from("friend_requests")
      .update({ status: "declined" })
      .eq("id", requestId);
    setMyPendingReceived((prev) => prev.filter((r: never & { id: string }) => r.id !== requestId));
  }

  const friendIds = new Set(myFriends.map((f) => f.id));
  const sentFromDb = new Set((pendingSent as never & { addressee: { id: string } }[]).map((r) => r.addressee?.id));

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-stone-900 mb-6">Friends</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="flex-1 flex items-center gap-2 border border-stone-200 rounded-xl px-3 py-2.5 bg-white">
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username..."
            className="flex-1 text-sm outline-none bg-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="bg-brand-400 hover:bg-brand-600 text-white text-sm font-medium px-4 rounded-xl transition-colors"
        >
          Search
        </button>
      </form>

      {/* Search results */}
      {results.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">Results</p>
          <div className="space-y-2">
            {results.map((profile) => {
              const isFriend = friendIds.has(profile.id);
              const isPending = sentIds.has(profile.id) || sentFromDb.has(profile.id);
              return (
                <div key={profile.id} className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl p-3">
                  <Avatar name={profile.full_name} url={profile.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 text-sm">{profile.full_name ?? profile.username}</p>
                    <p className="text-xs text-stone-400">@{profile.username}</p>
                  </div>
                  {isFriend ? (
                    <span className="text-xs text-brand-600 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Friends
                    </span>
                  ) : isPending ? (
                    <span className="text-xs text-stone-400 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Pending
                    </span>
                  ) : (
                    <button
                      onClick={() => sendRequest(profile.id)}
                      className="flex items-center gap-1.5 text-xs font-medium bg-brand-50 text-brand-600 border border-brand-200 px-3 py-1.5 rounded-xl hover:bg-brand-100 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending requests received */}
      {myPendingReceived.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Friend requests ({myPendingReceived.length})
          </p>
          <div className="space-y-2">
            {(myPendingReceived as never & { id: string; requester: Profile }[]).map((req) => (
              <div key={req.id} className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl p-3">
                <Avatar name={req.requester?.full_name} url={req.requester?.avatar_url} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900 text-sm">{req.requester?.full_name ?? req.requester?.username}</p>
                  <p className="text-xs text-stone-400">@{req.requester?.username}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => acceptRequest(req.id, req.requester)}
                    className="p-1.5 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-100 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => declineRequest(req.id)}
                    className="p-1.5 rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
          My friends ({myFriends.length})
        </p>
        {myFriends.length === 0 ? (
          <div className="text-center py-10 text-stone-400">
            <p className="text-3xl mb-2">👋</p>
            <p className="text-sm font-medium text-stone-500">No friends yet</p>
            <p className="text-xs mt-1">Search for people to connect with</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myFriends.map((friend) => {
              const status = STATUS_CONFIG[friend.availability_status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.busy;
              return (
                <div key={friend.id} className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl p-3">
                  <Avatar name={friend.full_name} url={friend.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 text-sm">{friend.full_name ?? friend.username}</p>
                    <p className="text-xs text-stone-400">@{friend.username}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                    <span className="text-xs text-stone-500">{status.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}