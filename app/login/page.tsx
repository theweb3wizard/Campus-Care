"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { normalizeId } from "@/lib/identity";
import { StatusMessage, Spinner } from "@/components/motion/StatusMessage";
import { friendlyError } from "@/lib/errors";

export default function LoginPage() {
  return (
    <Suspense fallback={<p role="status" className="text-sm text-[var(--muted-foreground)]">Loading login…</p>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/profile";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/profile";
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement | null>(null);

  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const norm = normalizeId(id);
    if (!norm) {
      fail("Type your student ID or staff ID first.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: email, error: lookupErr } = await supabase.rpc("email_for_login", { p_login_id: norm });
      if (lookupErr) throw new Error("Network problem. Try again.");
      if (!email) throw new Error("No account uses that ID. Check it, or create one below.");
      const { error } = await supabase.auth.signInWithPassword({ email: email as string, password });
      if (error) throw new Error("Wrong ID or password. Check both and try again.");
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      fail(friendlyError(err, "Login failed. Try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-display text-2xl font-bold">Log in</h1>
      <p className="mt-1 text-[var(--muted-foreground)]">Students use Reg No. Staff use Staff ID. Email is only for password reset.</p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Student ID or Staff ID
          <input
            required
            autoComplete="username"
            placeholder="e.g. FCO/CSC/24/1001"
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base"
          />
        </label>
        {error ? (
          <div ref={errorRef} tabIndex={-1} className="text-[var(--destructive-fg)]">
            <StatusMessage role="alert">{error}</StatusMessage>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
        >
          {loading ? (<><Spinner /> Logging in…</>) : "Log in"}
        </button>
        <p className="text-sm text-[var(--muted-foreground)]">
          New student? <Link href="/signup" className="font-semibold underline">Create account</Link>
          {" · "}Forgot password? <Link href="/forgot" className="font-semibold underline">Reset it</Link>
        </p>
      </form>
    </div>
  );
}
