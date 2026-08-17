"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Chrome, Loader2, LockKeyhole, Mail, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up" | "reset";
type LoadingAction = AuthMode | "google" | null;

const MODE_COPY: Record<AuthMode, { title: string; submit: string }> = {
  "sign-in": { title: "Sign in", submit: "Sign in" },
  "sign-up": { title: "Create account", submit: "Create account" },
  reset: { title: "Reset password", submit: "Send reset link" },
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (active && user) {
        router.replace("/feed");
      }
    });

    Promise.resolve().then(() => {
      const params = new URLSearchParams(window.location.search);
      if (active && params.get("error") === "auth_failed") {
        setError(
          params.get("message") ??
            "We could not complete authentication. Try again."
        );
      }
    });

    return () => {
      active = false;
    };
  }, [router, supabase]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingAction(mode);
    setError(null);
    setNotice(null);

    if (mode === "reset") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      });

      setLoadingAction(null);
      if (resetError) {
        setError(resetError.message);
        return;
      }

      setNotice("Check your email for a password reset link.");
      return;
    }

    if (mode === "sign-up") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoadingAction(null);
        return;
      }

      if (data.session) {
        window.location.replace("/feed");
        return;
      }

      setNotice("Check your email to confirm your account.");
      setLoadingAction(null);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoadingAction(null);
      return;
    }

    if (data.session) {
      window.location.replace("/feed");
      return;
    }

    setError("No session returned.");
    setLoadingAction(null);
  }

  async function handleGoogleSignIn() {
    setLoadingAction("google");
    setError(null);
    setNotice(null);

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (googleError) {
      setError(googleError.message);
      setLoadingAction(null);
    }
  }

  const busy = loadingAction !== null;
  const copy = MODE_COPY[mode];
  const submitDisabled =
    busy || !email || (mode !== "reset" && password.length < 6);

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
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 mb-5">
            <button
              type="button"
              onClick={() => switchMode("sign-in")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === "sign-in"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("sign-up")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === "sign-up"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-base font-semibold text-stone-900">{copy.title}</h2>

            {mode === "sign-up" && (
              <label className="block">
                <span className="text-xs font-medium text-stone-600">Name</span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-50">
                  <User className="w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="text-xs font-medium text-stone-600">Email</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-50">
                <Mail className="w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full py-3 text-sm outline-none"
                />
              </div>
            </label>

            {mode !== "reset" && (
              <label className="block">
                <span className="text-xs font-medium text-stone-600">Password</span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-200 px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-50">
                  <LockKeyhole className="w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                    minLength={6}
                    required
                    className="w-full py-3 text-sm outline-none"
                  />
                </div>
              </label>
            )}

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            {notice && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full bg-brand-400 hover:bg-brand-600 text-white rounded-xl py-3 px-4 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingAction === mode && <Loader2 className="w-4 h-4 animate-spin" />}
              {copy.submit}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-100" />
            <span className="text-[11px] font-medium uppercase text-stone-400">or</span>
            <div className="h-px flex-1 bg-stone-100" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy}
            className="w-full rounded-xl border border-stone-200 py-3 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingAction === "google" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Chrome className="w-4 h-4" />
            )}
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => switchMode(mode === "reset" ? "sign-in" : "reset")}
            className="mt-4 w-full text-center text-xs font-medium text-stone-400 hover:text-stone-700 transition-colors"
          >
            {mode === "reset" ? "Back to sign in" : "Forgot password?"}
          </button>
        </div>
      </div>
    </div>
  );
}
