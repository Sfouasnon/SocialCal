"use client";

import { useState, useEffect, useRef } from "react";
import {
  MapPin, Clock, Users, Check, MessageCircle, Send, CalendarPlus,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isTomorrow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { EventWithDetails, EventCommentWithUser } from "@/lib/supabase/database.types";
import clsx from "clsx";

// ─── Helpers ─────────────────────────────────────────────────

const TYPE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  sport:   { label: "Sport",   bg: "bg-blue-50",   text: "text-blue-600"  },
  hike:    { label: "Hike",    bg: "bg-green-50",  text: "text-green-700" },
  trip:    { label: "Trip",    bg: "bg-purple-50", text: "text-purple-600"},
  hangout: { label: "Hangout", bg: "bg-amber-50",  text: "text-amber-700" },
  other:   { label: "Other",   bg: "bg-stone-100", text: "text-stone-500" },
};

const HYPE_LEVELS: Record<number, { name: string; badgeBg: string; badgeText: string; bar: string }> = {
  1: { name: "Warming up",  badgeBg: "bg-green-50",  badgeText: "text-green-800",  bar: "bg-green-500"  },
  2: { name: "Heating up",  badgeBg: "bg-amber-50",  badgeText: "text-amber-800",  bar: "bg-amber-500"  },
  3: { name: "On fire",     badgeBg: "bg-orange-50", badgeText: "text-orange-800", bar: "bg-orange-500" },
  4: { name: "Legendary",   badgeBg: "bg-purple-50", badgeText: "text-purple-800", bar: "rainbow"       },
};

const QUICK_EMOJIS = ["👍", "🔥", "😂", "🎉", "👀", "💪", "🙌", "❤️"];

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d))    return `Today · ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, "h:mm a")}`;
  return format(d, "MMM d · h:mm a");
}

function Avatar({
  name, url, size = 7,
}: { name?: string | null; url?: string | null; size?: number }) {
  const initials = name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const sz = `w-${size} h-${size}`;
  if (url)
    return <img src={url} alt={name ?? ""} className={`${sz} rounded-full object-cover`} />;
  return (
    <div className={`${sz} rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-semibold text-violet-600`}>
      {initials}
    </div>
  );
}

// ─── Hype Meter ──────────────────────────────────────────────

function HypeMeter({ score, level }: { score: number; level: number }) {
  const cfg = HYPE_LEVELS[level] ?? HYPE_LEVELS[1];
  const pct = `${score}%`;

  return (
    <div className="px-4 pt-3 pb-2 border-b border-stone-100">
      {/* Top row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🔥</span>
          <span className={clsx("text-xs font-semibold", level === 4 ? "text-violet-600" : "text-stone-700")}>
            {cfg.name}
          </span>
          <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.badgeBg, cfg.badgeText)}>
            Level {level}
          </span>
        </div>
        <span className={clsx("text-xs font-semibold tabular-nums", level === 4 ? "text-violet-600" : "text-stone-400")}>
          {score} / 100
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden mb-2">
        {cfg.bar === "rainbow" ? (
          <div
            className="h-full rounded-full"
            style={{
              width: pct,
              background: "linear-gradient(90deg, #639922, #BA7517, #D85A30, #D4537E, #534AB7)",
            }}
          />
        ) : (
          <div className={clsx("h-full rounded-full transition-all", cfg.bar)} style={{ width: pct }} />
        )}
      </div>

      {/* Reactions summary — collapsed, quiet */}
      <ReactionRow eventId="" score={score} />
    </div>
  );
}

function ReactionRow({ eventId, score }: { eventId: string; score: number }) {
  // Static display on card — full interaction opens in chat panel
  if (score === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-stone-400">
      <span>🎉</span><span>🔥</span><span>🙌</span>
      <span className="ml-1">{score} hype points</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function EventCard({
  event,
  currentUserId,
  onRsvpChange,
}: {
  event: EventWithDetails;
  currentUserId: string;
  onRsvpChange: (eventId: string, status: "going" | "maybe" | null) => void;
}) {
  const [rsvpLoading, setRsvpLoading]     = useState(false);
  const [chatOpen, setChatOpen]           = useState(false);
  const [comments, setComments]           = useState<EventCommentWithUser[]>(event.top_comments ?? []);
  const [commentText, setCommentText]     = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentCount, setCommentCount]   = useState(event.top_comments?.length ?? 0);
  const [calAdded, setCalAdded]           = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const supabase   = createClient();

  const typeStyle  = TYPE_STYLES[event.event_type] ?? TYPE_STYLES.other;
  const goingCount = event.attendees?.filter((a) => a.status === "going").length ?? 0;
  const isCreator  = event.creator_id === currentUserId;
  const myRsvp     = event.my_rsvp;
  const hypeScore  = event.hype_score ?? 0;
  const hypeLevel  = (event.hype_level as 1 | 2 | 3 | 4) ?? 1;

  // Keep comment count fresh without opening chat
  useEffect(() => {
    supabase
      .from("event_comments")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .then(({ count }) => { if (count !== null) setCommentCount(count); });
  }, [event.id]);

  // Load full comments when chat opens
  useEffect(() => {
    if (!chatOpen) return;
    supabase
      .from("event_comments")
      .select("*, user:profiles!event_comments_user_id_fkey(id, full_name, username, avatar_url)")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) { setComments(data as EventCommentWithUser[]); setCommentCount(data.length); }
      });
  }, [chatOpen, event.id]);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments, chatOpen]);

  async function handleRsvp(status: "going" | "maybe") {
    setRsvpLoading(true);
    const newStatus = myRsvp === status ? null : status;
    if (newStatus === null) {
      await supabase.from("event_attendees").delete()
        .eq("event_id", event.id).eq("user_id", currentUserId);
    } else {
      await supabase.from("event_attendees")
        .upsert({ event_id: event.id, user_id: currentUserId, status: newStatus });
    }
    onRsvpChange(event.id, newStatus);
    setRsvpLoading(false);
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || commentLoading) return;
    setCommentLoading(true);

    const optimistic: EventCommentWithUser = {
      id: `temp-${Date.now()}`,
      event_id: event.id,
      user_id: currentUserId,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
      user: { id: currentUserId, full_name: "You", username: "you", avatar_url: null },
    };
    setComments((prev) => [...prev, optimistic]);
    setCommentCount((c) => c + 1);
    const text = commentText.trim();
    setCommentText("");

    const { data } = await supabase
      .from("event_comments")
      .insert({ event_id: event.id, user_id: currentUserId, content: text })
      .select("*, user:profiles!event_comments_user_id_fkey(id, full_name, username, avatar_url)")
      .single();

    if (data) {
      setComments((prev) => prev.map((c) => c.id === optimistic.id ? data as EventCommentWithUser : c));
    }
    setCommentLoading(false);
  }

  function handleAddToCalendar() {
    const start = new Date(event.starts_at);
    const end   = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

    // Google Calendar URL — opens in new tab, works on any device
    const params = new URLSearchParams({
      action:   "TEMPLATE",
      text:     event.title,
      dates:    `${formatGCal(start)}/${formatGCal(end)}`,
      details:  event.description ?? "",
      location: event.location ?? "",
    });
    window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank");
    setCalAdded(true);
  }

  function formatGCal(d: Date) {
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  const topComments = comments.slice(0, 2);

  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden hover:border-stone-200 transition-colors">

      {/* ── Cover photo ── */}
      {event.cover_url && (
        <div className="relative h-44 overflow-hidden">
          <img
            src={event.cover_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-bold text-white text-lg leading-snug">{event.title}</h3>
            <p className="text-white/80 text-xs mt-0.5">{formatEventDate(event.starts_at)}</p>
          </div>
          <span className={clsx(
            "absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full",
            typeStyle.bg, typeStyle.text
          )}>
            {typeStyle.label}
          </span>
        </div>
      )}

      {/* ── Header (no cover) ── */}
      {!event.cover_url && (
        <div className="p-4 pb-3">
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
          <h3 className="font-semibold text-stone-900 mb-1 leading-snug">{event.title}</h3>
          {event.description && (
            <p className="text-sm text-stone-500 mb-2 leading-relaxed line-clamp-2">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <span className="flex items-center gap-1 text-xs text-stone-500 bg-stone-50 px-2.5 py-1 rounded-full border border-stone-100">
              <Clock className="w-3 h-3" />{formatEventDate(event.starts_at)}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 text-xs text-stone-500 bg-stone-50 px-2.5 py-1 rounded-full border border-stone-100">
                <MapPin className="w-3 h-3" />{event.location}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Hype meter ── */}
      <HypeMeter score={hypeScore} level={hypeLevel} />

      {/* ── Top 2 comments (always visible) ── */}
      {topComments.length > 0 && (
        <div className="px-4 py-3 space-y-2.5 border-b border-stone-50">
          {topComments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar name={c.user?.full_name} url={c.user?.avatar_url} size={6} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-600 leading-snug">
                  <span className="font-semibold text-stone-800 mr-1">
                    {c.user?.full_name?.split(" ")[0] ?? "Someone"}
                  </span>
                  {c.content}
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          {commentCount > 2 && (
            <button
              onClick={() => setChatOpen(true)}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              View all {commentCount} comments →
            </button>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Attendee avatars */}
          <div className="flex items-center">
            {event.attendees?.slice(0, 3).map((a, i) => (
              <div key={i} className="-ml-1 first:ml-0 border-2 border-white rounded-full">
                <Avatar
                  name={(a as any).user?.full_name}
                  url={(a as any).user?.avatar_url}
                  size={6}
                />
              </div>
            ))}
          </div>
          {goingCount > 0 && (
            <span className="text-xs text-stone-400">{goingCount} going</span>
          )}

          {/* Comment toggle */}
          <button
            onClick={() => setChatOpen((o) => !o)}
            className={clsx(
              "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl border transition-colors",
              chatOpen
                ? "bg-stone-100 text-stone-700 border-stone-200"
                : "text-stone-400 border-stone-200 hover:bg-stone-50"
            )}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {commentCount > 0 && commentCount}
          </button>

          {/* Add to Google Calendar */}
          <button
            onClick={handleAddToCalendar}
            title="Add to Google Calendar"
            className={clsx(
              "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl border transition-colors",
              calAdded
                ? "bg-green-50 text-green-700 border-green-200"
                : "text-stone-400 border-stone-200 hover:bg-stone-50 hover:text-stone-600"
            )}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            {calAdded ? "Added" : "Calendar"}
          </button>
        </div>

        {/* RSVP buttons */}
        {!isCreator && (
          <div className="flex items-center gap-1.5">
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
                  ? "bg-violet-50 text-violet-700 border-violet-200"
                  : "text-stone-600 border-stone-200 hover:bg-stone-50"
              )}
            >
              {myRsvp === "going" && <Check className="w-3 h-3" />}
              {myRsvp === "going" ? "Going!" : "I'm in"}
            </button>
          </div>
        )}
      </div>

      {/* ── Expandable chat ── */}
      {chatOpen && (
        <div className="border-t border-stone-100">
          <div className="max-h-56 overflow-y-auto px-4 py-3 space-y-3 bg-stone-50">
            {comments.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-6">
                No comments yet — say something 👋
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <Avatar name={c.user?.full_name} url={c.user?.avatar_url} size={6} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-semibold text-stone-800">
                        {c.user?.full_name ?? c.user?.username ?? "Someone"}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600 leading-snug mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleComment} className="px-4 py-3 bg-white border-t border-stone-100 space-y-2">
            <div className="flex gap-2 flex-wrap">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCommentText((t) => t + emoji)}
                  className="text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Say something..."
                className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-violet-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || commentLoading}
                className="p-2 rounded-xl bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
