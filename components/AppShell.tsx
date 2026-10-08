import { Suspense } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";
import { ClinicLogo } from "./ClinicLogo";
import { BottomNav } from "./BottomNav";
import { DesktopNav } from "./DesktopNav";
import { UserMenu } from "./UserMenu";
import { brand } from "@/lib/brand";
import { getSessionUser, createClient } from "@/lib/supabase/server";

async function HeaderSession() {
  const user = await getSessionUser();
  if (!user) return <UserMenu user={null} />;
  let headerUser: { full_name: string; role: string; login_id: string } | null = null;
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,role,login_id")
      .eq("id", user.id)
      .single();
    const p = profile as { full_name?: string; role?: string; login_id?: string } | null;
    if (p) {
      headerUser = {
        full_name: p.full_name ?? "Staff",
        role: p.role ?? "patient",
        login_id: p.login_id ?? "",
      };
    }
  } catch {
    headerUser = null;
  }
  return <UserMenu user={headerUser} />;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:p-2">
        Skip to main content
      </a>

      <header className="print-hidden sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Campus Care home">
            <ClinicLogo size={32} />
            <span className="min-w-0 leading-tight">
              <span className="font-display block truncate text-lg font-bold tracking-tight">
                {brand.name}
              </span>
              <span className="hidden truncate text-xs text-[var(--muted-foreground)] sm:block">
                {brand.subtitle} · {brand.tagline}
              </span>
            </span>
          </Link>

          <DesktopNav />

          <div className="flex shrink-0 items-center gap-2">
            <Suspense
              fallback={
                <span
                  aria-hidden
                  className="flex h-11 min-h-[44px] items-center rounded-full border border-[var(--border)] px-4 sm:h-12 sm:px-5"
                >
                  <span className="block h-4 w-14 rounded-md bg-[var(--border)]" />
                </span>
              }
            >
              <HeaderSession />
            </Suspense>
            <Link
              href="/emergency"
              className="flex h-11 min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full bg-[var(--emergency)] px-4 text-sm font-semibold text-white hover:bg-[var(--emergency-hover)] sm:h-12 sm:px-5 sm:text-base"
            >
              <Phone size={20} aria-hidden />
              {brand.emergencyLabel}
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 overflow-x-clip px-4 py-6 pb-24 md:pb-10">
        {children}
      </main>

      <BottomNav />

      <footer className="print-hidden hidden border-t border-[var(--border)] md:block">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 text-sm text-[var(--muted-foreground)]">
          {brand.fullName} · {brand.tagline}
        </div>
      </footer>
    </div>
  );
}
