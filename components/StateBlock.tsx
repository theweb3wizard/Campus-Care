import Link from "next/link";
import { states, type StateKey } from "@/lib/states";

/** Premium empty/success/failure block: static, one headline, one action. */
export function StateBlock({
  state,
  href,
  onAction,
}: {
  state: StateKey;
  href?: string;
  onAction?: () => void;
}) {
  const s = states[state];
  const buttonClass =
    "mt-4 flex h-12 min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)]";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
      <p className="font-display text-lg font-semibold">{s.headline}</p>
      <p className="mx-auto mt-1 max-w-md text-base text-[var(--muted-foreground)]">{s.body}</p>
      {href ? (
        <Link href={href} className={buttonClass}>
          {s.action}
        </Link>
      ) : onAction ? (
        <button type="button" onClick={onAction} className={buttonClass}>
          {s.action}
        </button>
      ) : null}
    </div>
  );
}
