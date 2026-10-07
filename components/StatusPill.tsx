import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  Pending: "bg-[var(--warning-bg)] text-[var(--warning-fg)]",
  Confirmed: "bg-[var(--info-bg)] text-[var(--info-fg)]",
  Completed: "bg-[var(--success-bg)] text-[var(--success-fg)]",
  Ready: "bg-[var(--success-bg)] text-[var(--success-fg)]",
  Cancelled: "bg-[var(--destructive-bg)] text-[var(--destructive-fg)]",
  Rescheduled: "bg-[var(--warning-bg)] text-[var(--warning-fg)]",
};

export function StatusPill({ status, className }: { status: keyof typeof styles | string; className?: string }) {
  const key = status as keyof typeof styles;
  return (
    <span
      className={cn(
        "inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-sm font-medium",
        styles[key] ?? "bg-[var(--card)] text-[var(--foreground)]",
        className
      )}
    >
      <span aria-hidden className="inline-block size-2 rounded-full bg-current" />
      {status}
    </span>
  );
}
