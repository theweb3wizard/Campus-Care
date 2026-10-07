# Phase 4 — Special modules (Done, needs Supabase connect)

## Built
- `supabase/migrations/0004_special.sql` — `pregnancy_records`, `emergency_requests` (anon can file), `questionnaire_responses` (jsonb), `notifications`; RLS throughout. Expert finder reuses doctors.
- `/pregnancy` — patient view (own records, next visit) + staff form (add by card number, risk flag)
- `/emergency` — one-tap call + request form (works logged-out); `/emergency/requests` — staff acknowledge/resolve queue
- `/experts` — live search over doctors by name/specialty/room
- `/questionnaire` — patient form (problem, duration, allergies, meds, pregnancy, notes); staff see recent answers
- `/notifications` — alerts inbox with mark-read; auto-created on booking confirm, test release, dispense (best-effort, never breaks flows)
- `/reception` — no-phone mode: search by card/reg/name, quick book as Confirmed, printable black-on-white ticket, today's queue
- Home + profile link all modules; staff quick links extended

## Verify
- `npm run lint` — pass
- `npm run build` — pass, 22 routes

## To go live
1. Run `0004_special.sql`
2. Test: file emergency logged-out → staff resolves; answer questionnaire → staff reads; book → alert appears; release test → alert appears; reception books for patient → ticket prints

## Next — Hardening for real university pilot
Audit log table, print-card polish, session timeouts, data backup notes, RLS review, Vercel + Supabase deploy, user acceptance walkthrough with clinic staff.
