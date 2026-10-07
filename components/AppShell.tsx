import Link from "next/link";
import { Phone } from "lucide-react";
import { ClinicLogo } from "./ClinicLogo";
import { BottomNav } from "./BottomNav";
import { brand } from "@/lib/brand";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:p-2">
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Campus Care home">
            <ClinicLogo size={32} />
            <span className="leading-tight">
              <span className="font-display block text-lg font-bold tracking-tight">
                {brand.name}
              </span>
              <span className="block text-xs text-[var(--muted-foreground)]">
                {brand.subtitle} · {brand.tagline}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-12 min-h-[48px] items-center rounded-full border border-[var(--border)] px-5 text-base font-semibold sm:flex"
            >
              Log in
            </Link>
            <Link
              href="/emergency"
              className="flex h-12 min-h-[48px] items-center gap-2 rounded-full bg-[#991b1b] px-5 text-base font-semibold text-white hover:bg-[#7f1d1d]"
            >
              <Phone size={20} aria-hidden />
              {brand.emergencyLabel}
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-10">
        {children}
      </main>

      <BottomNav />

      <footer className="hidden border-t border-[var(--border)] md:block">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 text-sm text-[var(--muted-foreground)]">
          {brand.fullName} · {brand.tagline}
        </div>
      </footer>
    </div>
  );
}
