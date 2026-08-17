"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [checkingSession, setCheckingSession] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setCheckingSession(false);
    });

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.replace("/feed");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900">
            Social<span className="text-brand-400">Cal</span>
          </h1>
          <p className="mt-2 text-stone-500 text-sm">Set a new password.</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          {checkingSession ? (
            <div className="flex items-center justify-center py-8 text-stone-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <h2 className="text-base font-semibold text-stone-900">Update password</h2>

              <label className="block">
                <span className="text-xs font-medium text-stone-600">New password</span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-50">
                  <LockKeyhole className="w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-stone-600">Confirm password</span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-50">
                  <LockKeyhole className="w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
              </label>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full bg-brand-400 hover:bg-brand-600 text-white rounded-xl py-3 px-4 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
