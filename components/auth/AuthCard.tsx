"use client";

import { Suspense, useState } from "react";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

type Tab = "signup" | "login";

/**
 * Portal auth card: signup/login tabs sharing one form card.
 * Used on the landing hero; /signup and /login keep their own pages.
 * Full width on phones, capped on desktop. 48px targets throughout.
 */
export function AuthCard({ defaultTab = "signup" }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  return (
    <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
      <div role="tablist" aria-label="Account" className="grid grid-cols-2 gap-2">
        {(["signup", "login"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex h-12 min-h-[48px] items-center justify-center rounded-[10px] border text-base font-semibold transition-colors ${
              tab === t
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "border-[var(--border)] bg-[var(--background)]"
            }`}
          >
            {t === "signup" ? "Create account" : "Log in"}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
        {tab === "signup"
          ? "Students claim with Reg No. Staff join with the Staff ID admin gave them."
          : "Students use Reg No. Staff use Staff ID."}
      </p>
      <div className="mt-3" role="tabpanel">
        <Suspense
          fallback={
            <p role="status" className="py-6 text-center text-sm text-[var(--muted-foreground)]">
              Loading…
            </p>
          }
        >
          {tab === "signup" ? (
            <SignupForm onSwitchToLogin={() => setTab("login")} />
          ) : (
            <LoginForm onSwitchToSignup={() => setTab("signup")} />
          )}
        </Suspense>
      </div>
    </div>
  );
}
