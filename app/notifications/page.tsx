import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { NotificationsList } from "@/components/NotificationsList";
import { NoticesSkeleton } from "@/components/motion/Skeletons";
import { QueryError } from "@/components/QueryError";

export const instant = false;

export default async function NotificationsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Alerts</h1>
      <div className="mt-4">
        <Suspense fallback={<NoticesSkeleton />}>
          <NoticesContent />
        </Suspense>
      </div>
    </div>
  );
}

async function NoticesContent() {
  await connection();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return <p className="text-[var(--muted-foreground)]">No alerts yet.</p>;
  const user = await getSessionUser();
  if (!user) {
    return (
      <p className="text-[var(--muted-foreground)]">
        <Link href="/login" className="font-semibold underline">Log in</Link> to see alerts.
      </p>
    );
  }
  const supabase = await createClient();
  const { data, error: listError } = await supabase
    .from("notifications")
    .select("id,title,body,link,is_read,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (listError) return <QueryError />;
  return <NotificationsList initial={(data ?? []) as { id: string; title: string; body: string; link: string; is_read: boolean; created_at: string }[]} />;
}
