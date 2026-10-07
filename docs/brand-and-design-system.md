# Campus Care — Brand + UI/UX Decision (Final)

**Status:** Decided. Clean, clear, simple-first for real university clinic use.
**Stack:** Next.js 16 App Router + Supabase + Tailwind v4 + shadcn/ui
**Date:** 2026-10-07
**Name in use:** `Campus Care` (replaces earlier `FUD Lafiya` working title per owner request).

Decided by 5-role brainstorm: naming, logo, UX research, UI tokens, critic/a11y.

## 1. Name + Voice

**App name:** `Campus Care`
**Full lockup:** `Campus Care` — subtitle `FUD Clinic`
**Domain idea:** `campuscare.fud.edu.ng`
**Tagline:** `Your health, made simple.`

Why: plain English + campus scope. Every persona (student, staff, pregnant woman, elderly, receptionist) understands it on first read. No jargon.

**Voice:** Calm, Respectful, Plain. Short sentences. Simple English.

- Booked: `Done. Your appointment is booked. Doctor: Dr. Amina - Tuesday, 10:00am, Clinic 2. Come with your card number: FUD/123.`
- Test ready: `Hello, your test result is ready. Please open Campus Care to see it. If you need help, meet reception.`

## 2. Logo

**Winner:** Cross-Book — bold rounded medical cross where horizontal bar is an open book, white on solid rounded square.

- Header 32px: white mark on emerald square. Favicon 16px: mono square + cross only.
- Print: single-color stamp, photocopy-safe.
- Component: `ClinicLogo.tsx` inline SVG <2KB, `variant="solid|mono"`.
- Clear space = height of cross arm. Min digital 24px, min print 12mm.
- Icons: Lucide outlined, stroke 2px, 24px grid. Slate-700 default, emerald-700 only for active. Never filled icons next to logo.

Rejected shield (reads as police/security) and people-circle (fails at small size).

## 3. Colors + Themes

Light-first, dark supported, WCAG AA, colorblind-safe, photocopy-safe. No SaaS purple/blue gradient.

| Token | Light | Dark | Use |
|---|---|---|---|
| Primary teal | `#0F766E` | `#2DD4BF` | actions, active nav, focus |
| University navy | `#1E3A5F` | `#BFCDDE` text | headers, sidebar, display |
| Accent gold | `#9A7B2E` text / `#F5E8C7` tint | `#E3C878` | badges/dividers only, never body |
| Background | `#F7F9F8` | `#0B1518` | app bg |
| Surface | `#FFFFFF` | `#132227` | cards |
| Border | `#E2E8F0` | `#26414A` | dividers/inputs |
| Text / muted | `#0F172A` / `#475569` | `#E8F0F1` / `#A7B9BE` | body/meta |

Status pills (always pill + dot + label + icon, never color-alone):
- Pending/Sampled: bg `#FEF3C7`, text `#92400E`, dot `#D97706`
- Confirmed/Info: bg `#E0F2FE`, text `#0C4A6E`, dot `#0284C7`
- Completed/Ready: bg `#D1FAE5`, text `#065F46`, dot `#059669`
- Cancelled: bg `#FEE2E2`, text `#991B1B`, dot `#DC2626`
- Rescheduled: bg `#E6F0EE`, text `#134E4A`, dot `#0F766E` + ↻ icon

Typography: Display `Plus Jakarta Sans`, Body `Inter`, fallback `-apple-system, Segoe UI, Roboto, sans-serif`. Base 16px/1.5. Scale: 12 pill, 14 secondary, 16 body, 18 lead, 20 section, 24 page, 30 hero. Load 400/500/600/700 only.

Shape: inputs 6px, buttons 10px, cards 12-16px (`rounded-xl` default), pills 9999px. Card padding 20-24px. Focus: 2px teal + 2px offset.

Tailwind v4 `@theme`: `--color-primary:#0F766E; --color-navy:#1E3A5F; --color-gold:#9A7B2E; --color-bg:#F7F9F8;` + shadcn vars in `:root` / `.dark` (see subagent spec).

## 4. UX — Clean/Clear/Simple

Principles:
1. One job per screen, one primary CTA above fold.
2. Never ask twice — card/reg/faculty auto-fill, search by any one ID.
3. Show next step (what+where+when), not system state.
4. Thumb-first sun-readable: 44px min, 16px min text.
5. No dead ends — every empty/error has forward action + emergency exit.

IA — Patient mobile bottom nav (max 5): Home, Book, Visits, Tests, Profile/More. Emergency is NOT a tab — sticky header + FAB `Emergency` 48px+, `tel:` link, visible logged-out.

Role dashboards (left nav, dense tables): Reception (Search/Register, Queue, Book-for-patient), Doctor (My Queue, Consult, Orders), Lab (Inbox, Enter Result, Mark Ready), Pharmacy (To Dispense, Dispense), Admin (wait times, staff/experts, reports).

Journeys max 3 taps: Book (service chips > slot > confirm), antenatal rebook same doctor, reception search > quick-book > print/SMS slip, doctor queue > consult > order, tests badge > view > QR, pharmacy scan > tick > dispense.

Reception Mode: PIN-locked clinic PC, Search/Book/Queue only, large text, print A6 ticket (Name, ID, Date/Time, Queue No, phone), 5-min auto-logout, works offline cached.

Critical safety from critic: no raw critical results without clinician release — show `Your result is ready - Come to clinic to discuss` + follow-up book + counselor phone. No OTP-only login — Card/Matric + PIN + reception recovery. Mask diagnoses in lists, session banner on shared PCs.

Copy: `No visit yet. Book your first visit.` / `Not ready yet. We will tell you when ready. No need to queue.` / `No network. Your booking is saved. It will send when network returns.`

## 5. Pre-delivery Checklist

1. Contrast ≥4.5:1, sun-glare test on Tecno.
2. Targets ≥44px, emergency ≥56px, no icon-only critical.
3. Keyboard Tab/Enter full flow, visible focus.
4. 360x640 no horizontal scroll, one CTA above fold.
5. Airplane-mode: ticket/card/help visible, no blank loader >3s.
6. Simple English, no ALL-CAPS eyebrows, no emoji icons.
7. Reception Mode locked + print in 1 click + auto-logout.
8. Print card B/W legible.
9. Emergency always-visible + `tel:` + address.
10. No double-submit, confirmation + queue no + SMS fallback.
11. Results gated, follow-up + counselor required.
12. Privacy: masked lists, logout clears back-button, audit.

## Next

See roadmap in chat: Phase 0 tokens/logo shell → Phase 1 foundation (auth/cards/profiles) → Phase 2 booking/queue → Phase 3 lab/pharmacy/reports → Phase 4 pregnancy/emergency/expert/reception/notifications → hardening for real university pilot.
