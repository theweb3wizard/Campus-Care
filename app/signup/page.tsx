import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-display text-2xl font-bold">Create account</h1>
      <p className="mt-1 text-[var(--muted-foreground)]">
        Students claim with Reg No. Staff join with the Staff ID admin gave them.
      </p>
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <SignupForm />
      </div>
    </div>
  );
}
