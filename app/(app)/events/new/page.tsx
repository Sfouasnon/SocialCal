"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, Camera, X } from "lucide-react";
import Link from "next/link";

const EVENT_TYPES = [
  { value: "hangout", label: "Hangout", emoji: "🍕" },
  { value: "sport",   label: "Sport",   emoji: "🏀" },
  { value: "hike",    label: "Hike",    emoji: "🥾" },
  { value: "trip",    label: "Trip",    emoji: "🚗" },
  { value: "other",   label: "Other",   emoji: "📅" },
];

const VISIBILITY = [
  { value: "public", label: "All friends",  desc: "Everyone you're connected with" },
  { value: "group",  label: "Group only",   desc: "Only members of a specific group" },
  { value: "invite", label: "Invite only",  desc: "Only people you invite" },
];

export default function NewEventPage() {
  const router   = useRouter();
  const supabase = createClient();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title:         "",
    description:   "",
    location:      "",
    starts_at:     "",
    ends_at:       "",
    event_type:    "hangout",
    visibility:    "public",
    max_attendees: "",
  });
  const [coverFile,    setCoverFile]    = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function removeCover() {
    setCoverFile(null);
    setCoverPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadCover(userId: string): Promise<string | null> {
    if (!coverFile) return null;
    setUploading(true);
    const ext      = coverFile.name.split(".").pop() ?? "jpg";
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("event-covers")
      .upload(fileName, coverFile, { contentType: coverFile.type });
    setUploading(false);
    if (upErr) { console.error(upErr); return null; }
    return supabase.storage.from("event-covers").getPublicUrl(fileName).data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const coverUrl = await uploadCover(user.id);

    const { data: event, error: err } = await supabase
      .from("events")
      .insert({
        title:         form.title,
        description:   form.description || null,
        location:      form.location    || null,
        starts_at:     new Date(form.starts_at).toISOString(),
        ends_at:       form.ends_at ? new Date(form.ends_at).toISOString() : null,
        event_type:    form.event_type as "hangout" | "sport" | "hike" | "trip" | "other",
        visibility:    form.visibility as "public" | "group" | "invite",
        max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
        creator_id:    user.id,
        cover_url:     coverUrl,
      })
      .select()
      .single();

    if (err) { setError(err.message); setLoading(false); return; }

    // Auto-RSVP creator as going
    await supabase.from("event_attendees").insert({
      event_id: event.id,
      user_id:  user.id,
      status:   "going",
    });

    router.push("/feed");
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
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

        {/* ── Cover photo ── */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Cover photo <span className="text-stone-400 font-normal">(optional but recommended)</span>
          </label>
          {coverPreview ? (
            <div className="relative rounded-2xl overflow-hidden h-48">
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removeCover}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-36 rounded-2xl border-2 border-dashed border-stone-200 hover:border-stone-300 flex flex-col items-center justify-content-center gap-2 text-stone-400 hover:text-stone-500 transition-colors"
            >
              <Camera className="w-7 h-7 mt-8" />
              <span className="text-sm font-medium pb-8">Add a cover photo</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* ── Event type ── */}
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
                    ? "bg-violet-50 text-violet-600 border-violet-200"
                    : "border-stone-200 text-stone-500 hover:border-stone-300"
                }`}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Title ── */}
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
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all"
          />
        </div>

        {/* ── Description ── */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Details</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Any details friends should know..."
            rows={3}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all resize-none"
          />
        </div>

        {/* ── Location ── */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="El Segundo, Griffith Park, my place..."
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all"
          />
        </div>

        {/* ── Date/time ── */}
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
              className="w-full border border-stone-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-violet-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">End</label>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => set("ends_at", e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-violet-400 transition-all"
            />
          </div>
        </div>

        {/* ── Max attendees ── */}
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
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 transition-all"
          />
        </div>

        {/* ── Visibility ── */}
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
                    ? "bg-violet-50 border-violet-200"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                  form.visibility === v.value ? "border-violet-500" : "border-stone-300"
                }`}>
                  {form.visibility === v.value && (
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
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
          disabled={loading || uploading || !form.title || !form.starts_at}
          className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {(loading || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
          {uploading ? "Uploading photo..." : loading ? "Posting..." : "Post event"}
        </button>

        <div className="h-8" />
      </form>
    </div>
  );
}
