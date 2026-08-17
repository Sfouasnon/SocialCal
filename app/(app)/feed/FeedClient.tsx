"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";
import Link from "next/link";
import EventCard from "@/components/events/EventCard";
import FriendPanel, {
  type FriendPanelProfile,
} from "@/components/events/FriendPanel";
import { fetchFeedEventById } from "@/lib/events/feed";
import type { EventWithDetails } from "@/lib/supabase/database.types";

const EVENT_TYPES = ["all", "sport", "hike", "trip", "hangout", "other"];
const FEED_REFRESH_DELAY_MS = 150;

function sortFeedEvents(events: EventWithDetails[]) {
  return [...events].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );
}

function getRecordId(record: Record<string, unknown>, key: "id" | "event_id") {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

export default function FeedClient({
  initialEvents,
  friends,
  currentUserId,
}: {
  initialEvents: EventWithDetails[];
  friends: FriendPanelProfile[];
  currentUserId: string;
}) {
  const [events, setEvents] = useState<EventWithDetails[]>(initialEvents);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const pendingEventIdsRef = useRef(new Set<string>());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingEventRefreshes = useCallback(async () => {
    const eventIds = [...pendingEventIdsRef.current];
    pendingEventIdsRef.current.clear();

    if (eventIds.length === 0) {
      return;
    }

    try {
      const refreshedEvents = await Promise.all(
        eventIds.map(async (eventId) => ({
          eventId,
          event: await fetchFeedEventById(supabase, currentUserId, eventId),
        }))
      );

      setEvents((prev) => {
        const nextById = new Map(prev.map((event) => [event.id, event]));

        for (const { eventId, event } of refreshedEvents) {
          if (event) {
            nextById.set(eventId, event);
          } else {
            nextById.delete(eventId);
          }
        }

        return sortFeedEvents([...nextById.values()]);
      });
      setError(null);
    } catch {
      setError("Could not refresh the feed.");
    }
  }, [currentUserId, supabase]);

  const scheduleEventRefresh = useCallback((eventId: string | null) => {
    if (!eventId) {
      return;
    }

    pendingEventIdsRef.current.add(eventId);
    if (refreshTimerRef.current) {
      return;
    }

    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void flushPendingEventRefreshes();
    }, FEED_REFRESH_DELAY_MS);
  }, [flushPendingEventRefreshes]);

  useEffect(() => {
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const eventId = getRecordId(payload.old, "id");
          if (eventId) {
            setEvents((prev) => prev.filter((event) => event.id !== eventId));
          }
          return;
        }

        scheduleEventRefresh(getRecordId(payload.new, "id"));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_comments" }, (payload) => {
        scheduleEventRefresh(
          getRecordId(payload.new, "event_id") ?? getRecordId(payload.old, "event_id")
        );
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_attendees" }, (payload) => {
        scheduleEventRefresh(
          getRecordId(payload.new, "event_id") ?? getRecordId(payload.old, "event_id")
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [scheduleEventRefresh, supabase]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const filtered = useMemo(
    () => filter === "all" ? events : events.filter((e) => e.event_type === filter),
    [events, filter]
  );

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
          {error && (
            <p className="mb-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          {filtered.length === 0 ? (
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
                currentUserId={currentUserId}
                onRsvpChange={(eventId, status) => {
                  setEvents((prev) =>
                    prev.map((e) => {
                      if (e.id !== eventId) {
                        return e;
                      }

                      const existingSelf = e.attendees.find(
                        (attendee) => attendee.user?.id === currentUserId
                      );
                      const attendees = e.attendees.filter(
                        (attendee) => attendee.user?.id !== currentUserId
                      );

                      if (status) {
                        attendees.push({
                          status,
                          user: existingSelf?.user ?? {
                            id: currentUserId,
                            full_name: "You",
                            avatar_url: null,
                          },
                        });
                      }

                      return { ...e, my_rsvp: status, attendees };
                    })
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
