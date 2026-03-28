"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const EVENT_TYPES = [
  { value: "hangout", label: "Hangout", emoji: "🍕" },
  { value: "sport",   label: "Sport",   emoji: "🏀" },
  { value: "hike",    label: "Hike",    emoji: "🥾" },
  { value: "trip",    label: "Trip",    emoji: "🚗" },
  { value: "other",   label: "Other",   emoji: "📅" },
];

const VISIBILITY = [
  { value: "public", label: "All friends",   desc: "Everyone you're connected with" },
  { value: "group",  label: "Group only",    desc: "Only members of a specific group" },
  { value: "invite", label: "Invite only",   desc: "Only people you invite" },
];

export default function NewEventPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    starts_at: "",
    ends_at: "",
    event_type: "hangout",
    visibility: "public",
    max_attendees: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { error: err } = await supabase.from("events").insert({
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      event_type: form.event_type as never,
      visibility: form.visibility as never,
      max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
      creator_id: user.id,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    router.push("/feed");
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Back */}
      <Link
        href="/feed"
        className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to feed
      </Link>

      <h1 className="font-display text-2xl font-bold text-stone-900 mb-6">
        Post an event
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Event type */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Type</label>
          <div className="flex gap-2 flex-wrap">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set("event_type", t.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  form.event_type === t.value
                    ? "bg-brand-50 text-brand-600 border-brand-200"
                    : "border-stone-200 text-stone-500 hover:border-stone-300"
                }`}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            What are you planning? <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Lakers game at my place, Griffith Park hike..."
            required
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Details</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Any details friends should know..."
            rows={3}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all resize-none"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="El Segundo, Griffith Park, my place..."
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all"
          />
        </div>

        {/* Date/time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Start <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => set("starts_at", e.target.value)}
              required
              className="w-full border border-stone-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">End</label>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => set("ends_at", e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all"
            />
          </div>
        </div>

        {/* Max attendees */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Max attendees <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            value={form.max_attendees}
            onChange={(e) => set("max_attendees", e.target.value)}
            placeholder="Leave blank for unlimited"
            min={1}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all"
          />
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Who can see this?
          </label>
          <div className="space-y-2">
            {VISIBILITY.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => set("visibility", v.value)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
                  form.visibility === v.value
                    ? "bg-brand-50 border-brand-200"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                  form.visibility === v.value ? "border-brand-400" : "border-stone-300"
                }`}>
                  {form.visibility === v.value && (
                    <div className="w-2 h-2 rounded-full bg-brand-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900">{v.label}</p>
                  <p className="text-xs text-stone-500">{v.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !form.title || !form.starts_at}
          className="w-full bg-brand-400 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? "Posting..." : "Post event"}
        </button>
      </form>
    </div>
  );
}
