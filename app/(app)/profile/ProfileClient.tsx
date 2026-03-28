"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check } from "lucide-react";
import type { Profile } from "@/lib/supabase/database.types";

const STATUS_OPTIONS = [
  { value: "free",  label: "Free",  emoji: "🟢", desc: "Open for plans" },
  { value: "busy",  label: "Busy",  emoji: "⚫", desc: "Occupied but local" },
  { value: "oot",   label: "OOT",   emoji: "🔴", desc: "Out of town" },
  { value: "maybe", label: "Maybe", emoji: "🟡", desc: "Might be free" },
];

export default function ProfileClient({
  profile,
  userId,
}: {
  profile: Profile | null;
  userId: string;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    username: profile?.username ?? "",
    availability_status: profile?.availability_status ?? "free",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        username: form.username,
        availability_status: form.availability_status as Profile["availability_status"],
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-stone-900 mb-6">Profile</h1>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Full name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Username</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Availability this weekend
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, availability_status: s.value }))}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-colors ${
                  form.availability_status === s.value
                    ? "bg-brand-50 border-brand-200"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <span className="text-lg">{s.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-stone-900">{s.label}</p>
                  <p className="text-xs text-stone-400">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-brand-400 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saved ? <><Check className="w-4 h-4" /> Saved</> : saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
