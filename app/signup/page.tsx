"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { normalizeId } from "@/lib/identity";
import { StatusMessage, Spinner } from "@/components/motion/StatusMessage";

type Mode = "student" | "staff";

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("student");
  const [id, setId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement | null>(null);

  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc(name, args);
    if (error) throw new Error("Network problem. Try again.");
    return data as T;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const norm = normalizeId(id);
    const cleanEmail = email.trim().toLowerCase();
    if (!norm) {
      fail(mode === "student" ? "Type your reg number first." : "Type your staff ID first.");
      return;
    }
    if (!/.+@.+\..+/.test(cleanEmail)) {
      fail("Type a valid school email. It is only used if you forget your password.");
      return;
    }
    if (mode === "student" && !fullName.trim()) {
      fail("Type your full name as it appears on your admission record.");
      return;
    }
    if (password.length < 6) {
      fail("Password needs at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();

      if (mode === "student") {
        const found = await rpc<{ reg_number: string; full_name: string; is_claimed: boolean }[]>(
          "verify_student",
          { p_reg: norm }
        );
        const row = found[0];
        if (row && row.is_claimed) {
          fail("This reg number is already claimed. Log in, or see reception if this is you.");
          return;
        }
        const { error: signErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { login_id: norm, full_name: fullName.trim() } },
        });
        if (signErr) throw new Error("Could not create account. That email may already be used.");
        const { error: inErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (inErr) throw new Error("Account created. Log in with your reg number.");
        const res = row
          ? await rpc<{ success: boolean; error?: string }>("claim_student", { p_reg: norm, p_email: cleanEmail })
          : await rpc<{ success: boolean; error?: string; verified?: boolean }>("register_student", {
              p_reg: norm,
              p_name: fullName.trim(),
            });
        if (!res.success) {
          await supabase.auth.signOut();
          throw new Error(`${res.error ?? "Signup failed. See reception."} You can try again.`);
        }
        router.push("verified" in res && res.verified === false ? "/profile?welcome=verify" : "/profile");
      } else {
        const { error: signErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { login_id: norm, full_name: "" } },
        });
        if (signErr) throw new Error("Could not create account. That email may already be used.");
        const { error: inErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (inErr) throw new Error("Account created. Log in with your staff ID.");
        const res = await rpc<{ success: boolean; error?: string }>("claim_staff", { p_staff_id: norm, p_email: cleanEmail });
        if (!res.success) {
          await supabase.auth.signOut();
          throw new Error(res.error ?? "Staff signup failed.");
        }
        router.push("/profile");
      }
      router.refresh();
    } catch (err) {
      fail(err instanceof Error ? err.message : "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const input = "h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base";

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-display text-2xl font-bold">Create account</h1>
      <p className="mt-1 text-[var(--muted-foreground)]">
        Students claim with Reg No. Staff join with the Staff ID admin gave them.
      </p>
      <div role="tablist" aria-label="Account type" className="mt-4 grid grid-cols-2 gap-2">
        {(["student", "staff"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex h-12 min-h-[48px] items-center justify-center rounded-[10px] border text-base font-semibold ${
              mode === m
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "border-[var(--border)] bg-[var(--card)]"
            }`}
          >
            {m === "student" ? "Student" : "Staff"}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {mode === "student" ? "Reg number" : "Staff ID"}
          <input
            required
            autoComplete="username"
            placeholder={mode === "student" ? "e.g. FCO/CSC/24/1001" : "e.g. FUD/ST/014"}
            value={id}
            onChange={(e) => setId(e.target.value)}
            className={input}
          />
        </label>
        {mode === "student" ? (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Full name (as on admission record)
            <input required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm font-medium">
          School email (only for password reset)
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Password (min 6)
          <input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
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
          {loading ? (<><Spinner /> Creating…</>) : "Create account"}
        </button>
        <p className="text-sm text-[var(--muted-foreground)]">
          Have an account? <Link href="/login" className="font-semibold underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
