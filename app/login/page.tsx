import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-display text-2xl font-bold">Log in</h1>
      <p className="mt-1 text-[var(--muted-foreground)]">Students use Reg No. Staff use Staff ID. Email is only for password reset.</p>
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <Suspense fallback={<p role="status" className="text-sm text-[var(--muted-foreground)]">Loading login…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
