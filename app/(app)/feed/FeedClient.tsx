"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";
import Link from "next/link";
import EventCard from "@/components/events/EventCard";
import FriendPanel from "@/components/events/FriendPanel";
import type { EventWithDetails, Profile } from "@/lib/supabase/database.types";

const EVENT_TYPES = ["all", "sport", "hike", "trip", "hangout", "other"];

export default function FeedClient({
  initialEvents,
  friends,
  currentUserId,
}: {
  initialEvents: EventWithDetails[];
  friends: Profile[];
  currentUserId: string;
}) {
  const [events, setEvents]   = useState<EventWithDetails[]>(initialEvents);
  const [filter, setFilter]   = useState<string>("all");
  const [userId, setUserId]   = useState<string>(currentUserId);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data } = await supabase
      .from("events")
      .select(`
        *,
        creator:profiles!events_creator_id_fkey(id, full_name, username, avatar_url),
        group:groups(id, name, color),
        attendees:event_attendees(
          status,
          user:profiles!event_attendees_user_id_fkey(id, full_name, avatar_url)
        ),
        top_comments:event_comments(
          id, content, created_at,
          user:profiles!event_comments_user_id_fkey(id, full_name, username, avatar_url)
        )
      `)
      .order("starts_at", { ascending: true })
      .limit(50);

    if (data) {
      setEvents(
        data.map((e) => ({
          ...e,
          my_rsvp: e.attendees?.find(
            (a: { user: { id: string }; status: string }) => a.user?.id === user?.id
          )?.status ?? null,
          // Show 2 most recent comments on the card face
          top_comments: (e.top_comments ?? [])
            .sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            .slice(0, 2)
            .reverse(),
        })) as EventWithDetails[]
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    load();

    // Real-time: new events, RSVPs, and comments update feed instantly
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_comments" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_attendees" }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered =
    filter === "all" ? events : events.filter((e) => e.event_type === filter);

  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Header + filters */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-stone-100 px-4 md:px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-stone-900">Feed</h2>
            <Link
              href="/events/new"
              className="hidden md:flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              New event
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {EVENT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                  filter === type
                    ? "bg-violet-500 text-white"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                }`}
              >
                {type === "all" ? "All events" : type}
              </button>
            ))}
          </div>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3">
          {loading ? (
            <div className="text-center py-16 text-stone-400">
              <p className="text-sm">Loading events...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <p className="text-3xl mb-3">📅</p>
              <p className="font-medium text-stone-500">No events yet</p>
              <p className="text-sm mt-1">Be the first to plan something</p>
              <Link
                href="/events/new"
                className="inline-flex items-center gap-1.5 mt-4 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Post an event
              </Link>
            </div>
          ) : (
            filtered.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                currentUserId={userId}
                onRsvpChange={(eventId, status) => {
                  setEvents((prev) =>
                    prev.map((e) => e.id === eventId ? { ...e, my_rsvp: status } : e)
                  );
                }}
              />
            ))
          )}
        </div>
      </div>

      <FriendPanel friends={friends} />
    </div>
  );
}
