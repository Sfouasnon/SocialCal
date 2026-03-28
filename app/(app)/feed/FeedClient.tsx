"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";
import Link from "next/link";
import EventCard from "@/components/events/EventCard";
import FriendPanel from "@/components/events/FriendPanel";
import type { EventWithDetails, Profile } from "@/lib/supabase/database.types";

interface Props {
  initialEvents: EventWithDetails[];
  friends: Profile[];
  currentUserId: string;
}

export default function FeedClient({ initialEvents, friends, currentUserId }: Props) {
  const [events, setEvents] = useState<EventWithDetails[]>(initialEvents);
  const [filter, setFilter] = useState<string>("all");
  const supabase = createClient();

  // ── Realtime: new events appear instantly across all devices ──
  useEffect(() => {
    const channel = supabase
      .channel("public:events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        async (payload) => {
          // Fetch the full event with relations
          const { data } = await supabase
            .from("events")
            .select(`
              *,
              creator:profiles!events_creator_id_fkey(id, full_name, username, avatar_url),
              group:groups(id, name, color),
              attendees:event_attendees(
                status,
                user:profiles!event_attendees_user_id_fkey(id, full_name, avatar_url)
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setEvents((prev) => [{ ...data, my_rsvp: null }, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_attendees" },
        (payload) => {
          // Update attendee count live
          setEvents((prev) =>
            prev.map((e) => {
              if (e.id !== payload.new.event_id) return e;
              const already = e.attendees?.some(
                (a) => (a as { user: { id: string } }).user?.id === payload.new.user_id
              );
              if (already) return e;
              return {
                ...e,
                attendees: [
                  ...(e.attendees ?? []),
                  { status: payload.new.status, user: { id: payload.new.user_id, full_name: null, avatar_url: null } },
                ],
                my_rsvp: payload.new.user_id === currentUserId
                  ? payload.new.status
                  : e.my_rsvp,
              };
            })
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, currentUserId]);

  const EVENT_TYPES = ["all", "sport", "hike", "trip", "hangout", "other"];

  const filtered = filter === "all"
    ? events
    : events.filter((e) => e.event_type === filter);

  return (
    <div className="flex h-full">
      {/* ── Feed ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-stone-100 px-4 md:px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-stone-900">Feed</h2>
            <Link
              href="/events/new"
              className="hidden md:flex items-center gap-1.5 bg-brand-400 hover:bg-brand-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              New event
            </Link>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {EVENT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                  filter === type
                    ? "bg-brand-400 text-white"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                }`}
              >
                {type === "all" ? "All events" : type}
              </button>
            ))}
          </div>
        </div>

        {/* Events list */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <p className="text-3xl mb-3">📅</p>
              <p className="font-medium text-stone-500">No events yet</p>
              <p className="text-sm mt-1">Be the first to plan something</p>
              <Link
                href="/events/new"
                className="inline-flex items-center gap-1.5 mt-4 bg-brand-400 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
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
                currentUserId={currentUserId}
                onRsvpChange={(eventId, status) => {
                  setEvents((prev) =>
                    prev.map((e) =>
                      e.id === eventId ? { ...e, my_rsvp: status } : e
                    )
                  );
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Friend availability panel (desktop only) ── */}
      <FriendPanel friends={friends} />
    </div>
  );
}
