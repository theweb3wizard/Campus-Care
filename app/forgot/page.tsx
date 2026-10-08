"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { normalizeId } from "@/lib/identity";
import { StatusMessage, Spinner } from "@/components/motion/StatusMessage";
import { friendlyError } from "@/lib/errors";

export default function ForgotPage() {
  const [id, setId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setIsError(false);
    const norm = normalizeId(id);
    if (!norm) {
      setMsg("Type your student ID or staff ID first.");
      setIsError(true);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: email, error: lookupErr } = await supabase.rpc("email_for_login", { p_login_id: norm });
      if (lookupErr) throw new Error("Network problem. Try again.");
      if (!email) throw new Error("No account uses that ID. Check it, or see reception.");
      const { error } = await supabase.auth.resetPasswordForEmail(email as string, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset`,
      });
      if (error) throw new Error("Could not send reset email. Try again later.");
      setMsg("Reset link sent. Check your school email inbox.");
    } catch (err) {
      setMsg(friendlyError(err, "Failed. Try again."));
      setIsError(true);
      requestAnimationFrame(() => boxRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-display text-2xl font-bold">Reset password</h1>
      <p className="mt-1 text-[var(--muted-foreground)]">Type your ID. The link goes to the school email you signed up with.</p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Student ID or Staff ID
          <input
            required
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. FCO/CSC/24/1001"
            className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base"
          />
        </label>
        {msg ? (
          <div ref={boxRef} tabIndex={-1} className={isError ? "text-[var(--destructive-fg)]" : ""}>
            <StatusMessage role={isError ? "alert" : "status"}>{msg}</StatusMessage>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
        >
          {loading ? (<><Spinner /> Sending…</>) : "Send reset link"}
        </button>
        <p className="text-sm text-[var(--muted-foreground)]">
          <Link href="/login" className="font-semibold underline">Back to login</Link>
        </p>
      </form>
    </div>
  );
}
