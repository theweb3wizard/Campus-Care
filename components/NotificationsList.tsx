"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StateBlock } from "@/components/StateBlock";

export type Notice = { id: string; title: string; body: string; link: string; is_read: boolean; created_at: string };

const SAFE_LINKS = ["/visits", "/tests", "/book", "/reports", "/profile", "/pregnancy", "/notifications"];

function safeLink(link: string): string | null {
  if (!link.startsWith("/")) return null;
  if (SAFE_LINKS.some((p) => link === p || link.startsWith(`${p}/`) || link.startsWith(`${p}?`))) return link;
  return null;
}

export function NotificationsList({ initial }: { initial: Notice[] }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function markRead(id: string) {
    setError(null);
    const prev = items;
    setItems((v) => v.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
    try {
      const supabase = createClient();
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    } catch {
      setItems(prev);
      setError("Could not mark as read. Check connection and try again.");
    }
  }

  if (items.length === 0) return <StateBlock state="notificationsEmpty" href="/book" />;

  return (
    <div className="flex flex-col gap-2">
      {error ? <p role="alert" className="text-sm font-medium text-[var(--destructive-fg)]">{error}</p> : null}
      {items.map((n) => {
        const open = safeLink(n.link);
        return (
          <div key={n.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center justify-between gap-2">
              <strong>{n.title}</strong>
              {!n.is_read ? (
                <button type="button" onClick={() => markRead(n.id)} aria-label={`Mark read: ${n.title}`} className="flex min-h-[44px] items-center px-2 text-sm font-semibold underline">Mark read</button>
              ) : null}
            </div>
            {n.body ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{n.body}</p> : null}
            {open ? (
              <p className="mt-1 text-sm"><Link href={open} className="inline-flex min-h-[44px] items-center font-semibold underline">Open</Link></p>
            ) : (
              <p className="mt-1 text-sm"><Link href="/visits" className="inline-flex min-h-[44px] items-center font-semibold underline">Open Visits</Link></p>
            )}
          </div>
        );
      })}
    </div>
  );
}
