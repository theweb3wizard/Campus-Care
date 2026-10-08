import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { brand } from "@/lib/brand";
import { Reveal } from "@/components/motion/Reveal";
import { ResultSheet } from "@/components/ResultSheet";

function Slip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] ${className}`}>
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col gap-16 md:gap-24">
      {/* Hero: left-docked editorial split */}
      <section className="grid items-center gap-8 pt-4 md:grid-cols-[3fr_2fr] md:pt-8">
        <div>
          <h1 className="font-display max-w-[12ch] text-[32px] font-extrabold leading-[1.05] tracking-tight md:text-[44px] md:leading-[1.05]">
            Clinic care without the long queue
          </h1>
          <p className="mt-4 max-w-[60ch] text-lg leading-relaxed">
            Book a visit between lectures, get test results on your phone, and reach the
            FUD clinic fast when it matters. Built for student life.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/book"
              className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)]"
            >
              Book a clinic visit
              <ArrowRight size={20} aria-hidden />
            </Link>
            <Link
              href="/experts"
              className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-[10px] border border-[var(--secondary)] px-6 text-base font-semibold text-[var(--secondary)]"
            >
              Find a specialist
            </Link>
          </div>
          <p className="mt-4 text-base">
            <Link href="/signup" className="font-semibold underline">Create account with Reg No</Link>
            <span className="text-[var(--muted-foreground)]"> · already have one? </span>
            <Link href="/login" className="font-semibold underline">Log in</Link>
          </p>
          <p className="mt-4 text-base text-[var(--muted-foreground)]">
            {brand.subtitle} · {brand.tagline}
          </p>
        </div>

        <Reveal>
          <div aria-hidden className="relative mx-auto w-full max-w-sm">
            <Slip className="rotate-2 p-5">
              <p className="text-sm text-[var(--muted-foreground)]">General visit · Room 3</p>
              <p className="font-slip mt-1 text-xl font-medium">B27 · 10:40 · Room 3</p>
              <p className="mt-3 inline-block rounded-md bg-[var(--primary)] px-3 py-1 text-sm font-bold text-white">
                Booked
              </p>
            </Slip>
            <Slip className="absolute -bottom-10 left-6 right-0 -rotate-1 border-dashed p-4">
              <p className="font-slip text-sm">A14 · 09:20 · Lab window</p>
              <p className="mt-1 inline-block rounded-md bg-[var(--info-bg)] px-2 py-0.5 text-sm font-bold text-[var(--info-fg)]">
                Ready
              </p>
            </Slip>
            <div className="h-10" />
          </div>
        </Reveal>
      </section>

      {/* Visit rows: sticky split */}
      <section className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <div className="md:sticky md:top-24 md:self-start">
          <h2 className="font-display text-[20px] font-bold">Book visits</h2>
          <p className="mt-2 max-w-[60ch] text-base text-[var(--muted-foreground)]">
            Pick a service, pick a time. Your card and faculty details fill themselves in.
          </p>
          <Link href="/book" className="mt-4 inline-flex min-h-[48px] items-center gap-2 text-base font-semibold underline">
            Open booking <ArrowRight size={20} aria-hidden />
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {[
            { service: "General", meta: "Everyday complaints, referrals, follow-ups." },
            { service: "Dental", meta: "Tooth pain, cleaning, extraction days." },
            { service: "Antenatal", meta: "Scheduled maternity visits." },
          ].map((r) => (
            <div key={r.service} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div>
                <p className="text-lg font-semibold">{r.service}</p>
                <p className="font-slip mt-1 text-sm text-[var(--muted-foreground)]">{r.meta}</p>
              </div>
              <Link href={`/book?service=${r.service}`} className="flex h-12 min-h-[48px] items-center rounded-[10px] bg-[var(--primary)] px-6 font-semibold text-[var(--primary-foreground)]">
                Book {r.service}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Result sheet */}
      <section className="grid items-start gap-6 md:grid-cols-[2fr_1fr]">
        <ResultSheet />
        <div>
          <h2 className="font-display text-[20px] font-bold">Test results that wait for you</h2>
          <p className="mt-2 max-w-[60ch] text-base text-[var(--muted-foreground)]">
            Ordered, sampled, ready. You get an alert the moment the lab releases your
            result. Nothing critical lands on your screen without a doctor behind it.
          </p>
          <Link href="/tests" className="mt-4 inline-flex min-h-[48px] items-center gap-2 text-base font-semibold underline">
            See how results work <ArrowRight size={20} aria-hidden />
          </Link>
        </div>
      </section>

      {/* Doctors rail: snap carousel */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-[20px] font-bold">Doctors and pharmacy</h2>
          <Link href="/experts" className="inline-flex min-h-[48px] items-center gap-2 text-base font-semibold underline">
            All specialists <ArrowRight size={20} aria-hidden />
          </Link>
        </div>
        <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {[
            { name: "General care", spec: "Complaints, referrals, follow-ups", slot: "Reserve ahead in Book" },
            { name: "Eye and dental days", spec: "Specialist clinic days", slot: "Search in Find a specialist" },
            { name: "Maternity wing", spec: "Antenatal and follow-up visits", slot: "Open Pregnancy care" },
          ].map((d) => (
            <article key={d.name} className="w-[280px] shrink-0 snap-start rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <p className="text-lg font-semibold">{d.name}</p>
              <p className="mt-1 text-base text-[var(--muted-foreground)]">{d.spec}</p>
              <p className="font-slip mt-3 border-t border-dashed border-[var(--border)] pt-3 text-sm">{d.slot}</p>
            </article>
          ))}
          <article className="w-[280px] shrink-0 snap-start rounded-2xl bg-[var(--secondary)] p-5 text-white">
            <p className="text-lg font-semibold">Pharmacy pickup</p>
            <p className="mt-1 text-base text-white">Collect with your ticket after the doctor visit</p>
            <p className="font-slip mt-3 border-t border-dashed border-white/40 pt-3 text-sm">Alerts tell you when ready</p>
          </article>
        </div>
      </section>

      {/* Emergency: full-bleed solid banner */}
      <section className="-mx-4 bg-[var(--primary)] px-4 py-10 text-white md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <h2 className="font-display text-2xl font-bold">Emergency on campus?</h2>
          <p className="mt-2 max-w-[60ch] text-lg text-white">
            Go to Clinic Casualty now. Call, or send your hostel location so staff can find you.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/emergency" className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[var(--card)] px-6 font-semibold text-[var(--primary)]">
              <Phone size={20} aria-hidden />
              Get emergency help
            </Link>
          </div>
        </div>
      </section>

      {/* Pregnancy: asymmetric editorial */}
      <section className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <div>
          <h2 className="font-display text-[20px] font-bold">Pregnancy care</h2>
          <p className="mt-2 text-base text-[var(--muted-foreground)]">
            Private antenatal records, follow-up dates, and doctors who follow your case
            from the first visit to delivery.
          </p>
          <Link href="/pregnancy" className="mt-4 inline-flex min-h-[48px] items-center gap-2 text-base font-semibold underline">
            Open pregnancy care <ArrowRight size={20} aria-hidden />
          </Link>
        </div>
        <figure className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
          <div aria-hidden className="h-0.5 w-12 bg-[var(--color-gold)]" />
          <blockquote className="mt-4 text-xl leading-relaxed">
            Private by default. Maternity records are visible only to you and your care team.
          </blockquote>
          <figcaption className="mt-3 text-base text-[var(--muted-foreground)]">Antenatal schedule, follow-ups, notes</figcaption>
        </figure>
      </section>

      {/* Footer strip */}
      <footer className="-mx-4 bg-[var(--secondary)] px-4 py-8 text-white md:px-8">
        <div className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-3">
          <div>
            <p className="font-display text-lg font-bold">{brand.fullName}</p>
            <p className="mt-1 text-white">{brand.tagline}</p>
          </div>
          <div>
            <p className="font-semibold">Clinic hours</p>
            <p className="mt-1 text-white">Mon to Sat · 08:00 to 16:00</p>
          </div>
          <div>
            <p className="font-semibold">No phone?</p>
            <p className="mt-1 text-white">Use a clinic computer or ask reception to book for you.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
