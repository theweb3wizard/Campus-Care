# Phase 2 — Booking (Done, needs Supabase connect)

## Built
- `supabase/migrations/0002_booking.sql` — `doctors` table, `appointments` table (service, starts_at/ends_at, status, reference unique), partial unique index blocking double-book per doctor per slot, RLS (own read/insert/cancel, staff full)
- `lib/booking.ts` — services, demo doctors, 7-day 20-min slot builder, reference gen
- `app/book/page.tsx` + `components/BookingForm.tsx` — service chips → doctor → slot grid → confirm with reference code, friendly taken-slot error
- `app/visits/page.tsx` + `components/VisitsList.tsx` — upcoming/history, Cancel/Reschedule in plain words
- `app/doctor/page.tsx` + `components/DoctorQueue.tsx` — staff-only today queue, Confirm/Complete/Cancel
- Next 16 fixes per `node_modules/next/dist/docs`: `middleware.ts` → `proxy.ts` (`export function proxy`), dynamic pages use `connection()` + `<Suspense>` with `export const instant = false`
- Hausa copy removed everywhere: Emergency label, footer, landing, docs

## Verify
- `npm run lint` — pass
- `npm run build` — pass, 12 routes (`/` static, `/book` `/doctor` `/profile` `/visits` partial-prerender)

## To go live
1. Run `0002_booking.sql` in Supabase SQL Editor
2. Add doctors: insert profile with role doctor, then `insert into doctors (id, specialty, room) values (...)`
3. Test: signup → book → reference shown → /visits lists it → /doctor (as staff) confirms → patient sees Confirmed

## Next — Phase 3 Clinical
Lab/test orders + gated results, pharmacy dispense queue, visit reports. Then Phase 4: pregnancy, emergency contacts, expert finder, questionnaire, notifications, reception mode.
