"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatusMessage, Spinner } from "@/components/motion/StatusMessage";

export default function ResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 6) {
      setMsg("Password needs at least 6 characters.");
      requestAnimationFrame(() => boxRef.current?.focus());
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error("Link expired or invalid. Request a new one.");
      router.push("/login");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed. Request a new link.");
      requestAnimationFrame(() => boxRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-display text-2xl font-bold">New password</h1>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <label className="flex flex-col gap-1 text-sm font-medium">
          New password (min 6)
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base"
          />
        </label>
        {msg ? (
          <div ref={boxRef} tabIndex={-1} className="text-[var(--destructive-fg)]">
            <StatusMessage role="alert">{msg}</StatusMessage>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
        >
          {loading ? (<><Spinner /> Saving…</>) : "Save new password"}
        </button>
      </form>
    </div>
  );
}
