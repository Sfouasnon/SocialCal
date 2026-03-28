"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    console.log("Attempting sign in...");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log("Result:", { data, error });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      console.log("Session found, redirecting...");
      window.location.replace("/feed");
    } else {
      setError("No session returned.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900">
            Social<span className="text-brand-400">Cal</span>
          </h1>
          <p className="mt-2 text-stone-500 text-sm">Plan things with friends. Actually.</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-brand-400 hover:bg-brand-600 text-white rounded-xl py-3 px-4 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}