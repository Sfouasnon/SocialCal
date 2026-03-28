"use client";

import { useState } from "react";
import { MapPin, Clock, Users, Check } from "lucide-react";
import { formatDistanceToNow, format, isToday, isTomorrow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { EventWithDetails } from "@/lib/supabase/database.types";
import clsx from "clsx";

const TYPE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  sport:   { label: "Sport",   bg: "bg-blue-50",   text: "text-blue-600" },
  hike:    { label: "Hike",    bg: "bg-green-50",  text: "text-green-700" },
  trip:    { label: "Trip",    bg: "bg-purple-50", text: "text-purple-600" },
  hangout: { label: "Hangout", bg: "bg-amber-50",  text: "text-amber-700" },
  other:   { label: "Other",   bg: "bg-stone-100", text: "text-stone-500" },
};

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

function Avatar({ name, url, size = 7 }: { name?: string | null; url?: string | null; size?: number }) {
  const initials = name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const sz = `w-${size} h-${size}`;
  if (url) return <img src={url} alt={name ?? ""} className={`${sz} rounded-full object-cover`} />;
  return (
    <div className={`${sz} rounded-full bg-brand-50 flex items-center justify-center text-[10px] font-semibold text-brand-600`}>
      {initials}
    </div>
  );
}

export default function EventCard({
  event,
  currentUserId,
  onRsvpChange,
}: {
  event: EventWithDetails;
  currentUserId: string;
  onRsvpChange: (eventId: string, status: "going" | "maybe" | null) => void;
}) {
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const supabase = createClient();

  const typeStyle = TYPE_STYLES[event.event_type] ?? TYPE_STYLES.other;
  const goingCount = event.attendees?.filter((a) => a.status === "going").length ?? 0;
  const isCreator = event.creator_id === currentUserId;
  const myRsvp = event.my_rsvp;

  async function handleRsvp(status: "going" | "maybe") {
    setRsvpLoading(true);
    const newStatus = myRsvp === status ? null : status;

    if (newStatus === null) {
      await supabase
        .from("event_attendees")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", currentUserId);
    } else {
      await supabase
        .from("event_attendees")
        .upsert({ event_id: event.id, user_id: currentUserId, status: newStatus });
    }

    onRsvpChange(event.id, newStatus);
    setRsvpLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-4 hover:border-stone-200 transition-colors">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={event.creator?.full_name} url={event.creator?.avatar_url} />
          <div>
            <p className="text-sm font-medium text-stone-900 leading-none">
              {event.creator?.full_name ?? event.creator?.username}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <span className={clsx("text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0", typeStyle.bg, typeStyle.text)}>
          {typeStyle.label}
        </span>
      </div>

      {/* Title + description */}
      <h3 className="font-semibold text-stone-900 mb-1 leading-snug">{event.title}</h3>
      {event.description && (
        <p className="text-sm text-stone-500 mb-3 leading-relaxed">{event.description}</p>
      )}

      {/* Details pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="flex items-center gap-1.5 text-xs text-stone-500 bg-stone-50 px-2.5 py-1 rounded-full border border-stone-100">
          <Clock className="w-3 h-3" />
          {formatEventDate(event.starts_at)}
        </span>
        {event.location && (
          <span className="flex items-center gap-1.5 text-xs text-stone-500 bg-stone-50 px-2.5 py-1 rounded-full border border-stone-100">
            <MapPin className="w-3 h-3" />
            {event.location}
          </span>
        )}
        {event.max_attendees && (
          <span className="flex items-center gap-1.5 text-xs text-stone-500 bg-stone-50 px-2.5 py-1 rounded-full border border-stone-100">
            <Users className="w-3 h-3" />
            {goingCount}/{event.max_attendees} going
          </span>
        )}
        {event.group && (
          <span
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
            style={{
              background: `${event.group.color}15`,
              color: event.group.color,
              borderColor: `${event.group.color}30`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: event.group.color }} />
            {event.group.name}
          </span>
        )}
      </div>

      {/* Footer: attendee avatars + RSVP */}
      <div className="flex items-center justify-between pt-3 border-t border-stone-50">
        <div className="flex items-center gap-1">
          {event.attendees?.slice(0, 5).map((a, i) => (
            <div key={i} className="-ml-1 first:ml-0 border-2 border-white rounded-full">
              <Avatar
                name={(a as { user: { full_name: string | null } }).user?.full_name}
                url={(a as { user: { avatar_url: string | null } }).user?.avatar_url}
                size={6}
              />
            </div>
          ))}
          {goingCount > 0 && (
            <span className="text-xs text-stone-400 ml-1.5">
              {goingCount} {goingCount === 1 ? "going" : "going"}
            </span>
          )}
          {goingCount === 0 && !isCreator && (
            <span className="text-xs text-stone-400">Be the first to join</span>
          )}
        </div>

        {!isCreator && (
          <div className="flex gap-1.5">
            <button
              onClick={() => handleRsvp("maybe")}
              disabled={rsvpLoading}
              className={clsx(
                "text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors",
                myRsvp === "maybe"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "text-stone-500 border-stone-200 hover:bg-stone-50"
              )}
            >
              Maybe
            </button>
            <button
              onClick={() => handleRsvp("going")}
              disabled={rsvpLoading}
              className={clsx(
                "text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1",
                myRsvp === "going"
                  ? "bg-brand-50 text-brand-600 border-brand-200"
                  : "text-stone-600 border-stone-200 hover:bg-stone-50"
              )}
            >
              {myRsvp === "going" && <Check className="w-3 h-3" />}
              {myRsvp === "going" ? "Going!" : "Join"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
