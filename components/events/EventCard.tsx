"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Clock, Users, Check, Flame, MessageCircle, Send } from "lucide-react";
import { formatDistanceToNow, format, isToday, isTomorrow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import type { EventWithDetails, EventCommentWithUser } from "@/lib/supabase/database.types";
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

function HypeMeter({ going, comments }: { going: number; comments: number }) {
  const score = going * 2 + comments;
  if (score < 2) return null;
  const level = score >= 20 ? 3 : score >= 8 ? 2 : 1;
  const labels = ["", "Getting popular", "Heating up!", "On fire!"];
  const colors = ["", "text-amber-500", "text-orange-500", "text-red-500"];
  return (
    <div className={`flex items-center gap-1 text-xs font-semibold ${colors[level]}`}>
      {Array.from({ length: level }).map((_, i) => (
        <Flame key={i} className="w-3.5 h-3.5 fill-current" />
      ))}
      <span>{labels[level]}</span>
    </div>
  );
}

const QUICK_EMOJIS = ["👍", "🔥", "😂", "🎉", "👀", "💪", "🙌", "❤️"];

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
  const [chatOpen, setChatOpen] = useState(false);
  const [comments, setComments] = useState<EventCommentWithUser[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const typeStyle = TYPE_STYLES[event.event_type] ?? TYPE_STYLES.other;
  const goingCount = event.attendees?.filter((a) => a.status === "going").length ?? 0;
  const isCreator = event.creator_id === currentUserId;
  const myRsvp = event.my_rsvp;

  useEffect(() => {
    supabase
      .from("event_comments")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .then(({ count }) => setCommentCount(count ?? 0));
  }, [event.id]);

  useEffect(() => {
    if (!chatOpen) return;
    async function loadComments() {
      const { data } = await supabase
        .from("event_comments")
        .select("*, user:profiles!event_comments_user_id_fkey(id, full_name, username, avatar_url)")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });
      if (data) {
        setComments(data as EventCommentWithUser[]);
        setCommentCount(data.length);
      }
    }
    loadComments();
  }, [chatOpen, event.id]);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments, chatOpen]);

  async function handleRsvp(status: "going" | "maybe") {
    setRsvpLoading(true);
    const newStatus = myRsvp === status ? null : status;
    if (newStatus === null) {
      await supabase.from("event_attendees").delete().eq("event_id", event.id).eq("user_id", currentUserId);
    } else {
      await supabase.from("event_attendees").upsert({ event_id: event.id, user_id: currentUserId, status: newStatus });
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
      setComments((prev) =>
        prev.map((c) => c.id === optimistic.id ? data as EventCommentWithUser : c)
      );
    }
    setCommentLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden hover:border-stone-200 transition-colors">
      <div className="p-4">
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
          <p className="text-sm text-stone-500 mb-3 leading-relaxed">{event.description}</p>
        )}

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
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
              style={{ background: `${event.group.color}15`, color: event.group.color, borderColor: `${event.group.color}30` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: event.group.color }} />
              {event.group.name}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-stone-50">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {event.attendees?.slice(0, 4).map((a, i) => (
                <div key={i} className="-ml-1 first:ml-0 border-2 border-white rounded-full">
                  <Avatar
                    name={(a as { user: { full_name: string | null } }).user?.full_name}
                    url={(a as { user: { avatar_url: string | null } }).user?.avatar_url}
                    size={6}
                  />
                </div>
              ))}
              {goingCount > 0 && <span className="text-xs text-stone-400 ml-2">{goingCount} going</span>}
              {goingCount === 0 && !isCreator && <span className="text-xs text-stone-400">Be the first</span>}
            </div>
            <HypeMeter going={goingCount} comments={commentCount} />
            <button
              onClick={() => setChatOpen((o) => !o)}
              className={clsx(
                "flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border transition-colors",
                chatOpen ? "bg-stone-100 text-stone-700 border-stone-200" : "text-stone-500 border-stone-200 hover:bg-stone-50"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
            </button>
          </div>

          {!isCreator && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => handleRsvp("maybe")} disabled={rsvpLoading}
                className={clsx("text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors",
                  myRsvp === "maybe" ? "bg-amber-50 text-amber-700 border-amber-200" : "text-stone-500 border-stone-200 hover:bg-stone-50"
                )}>
                Maybe
              </button>
              <button onClick={() => handleRsvp("going")} disabled={rsvpLoading}
                className={clsx("text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1",
                  myRsvp === "going" ? "bg-brand-50 text-brand-600 border-brand-200" : "text-stone-600 border-stone-200 hover:bg-stone-50"
                )}>
                {myRsvp === "going" && <Check className="w-3 h-3" />}
                {myRsvp === "going" ? "Going!" : "Join"}
              </button>
            </div>
          )}
        </div>
      </div>

      {chatOpen && (
        <div className="border-t border-stone-100">
          <div className="max-h-52 overflow-y-auto px-4 py-3 space-y-3 bg-stone-50">
            {comments.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-4">No comments yet — be the first!</p>
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
            <div className="flex gap-2">
              {QUICK_EMOJIS.map((emoji) => (
                <button key={emoji} type="button"
                  onClick={() => setCommentText((t) => t + emoji)}
                  className="text-lg hover:scale-125 transition-transform">
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Avatar name={null} url={null} size={6} />
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Say something..."
                className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-brand-400 transition-colors"
              />
              <button type="submit" disabled={!commentText.trim() || commentLoading}
                className="p-2 rounded-xl bg-brand-400 hover:bg-brand-600 disabled:opacity-40 text-white transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
