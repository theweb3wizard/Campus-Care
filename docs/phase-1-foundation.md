# Phase 1 — Foundation (Done, needs Supabase connect)

## Built
- `lib/supabase/client.ts`, `lib/supabase/server.ts` — browser + server clients, fail loudly if env missing (client) / return null session (server)
- `middleware.ts` — refreshes Supabase session on every route; skips when env missing so preview builds pass
- `supabase/migrations/0001_profiles.sql` — `app_role` enum, `profiles` table (card_number unique, reg/faculty/dept/phone), auto-create trigger, RLS (own read/update + staff read)
- `app/login/page.tsx`, `app/signup/page.tsx` — email+password, 48px inputs, plain copy
- `app/profile/page.tsx` + `components/ProfileForm.tsx` — shows card number + role pill, edits name/phone/reg/faculty/dept, auto-fill promise for booking
- `.env.example` — URL + anon key template
- Header adds Log in link; emergency stays sticky

## Verify
- `npm run lint` — pass
- `npm run build` — pass, 11 routes. Note: Next 16 warns `middleware` → `proxy` rename. Still works; migrate with `npx @next/codemod@canary middleware-to-proxy` in hardening phase.

## To go live (you do this once in Supabase Dashboard)
1. Create project at supabase.com → copy URL + anon key into `.env.local` (copy from `.env.example`)
2. SQL Editor → run `supabase/migrations/0001_profiles.sql`
3. Authentication → enable Email provider. For pilot, disable email confirmations or add Resend later.
4. Create first admin: sign up, then SQL `update profiles set role='admin' where ...`
5. Test: signup → /profile shows `To be issued at clinic` + patient pill → save reg/faculty → re-login persists.

## Next — Phase 2 Booking
Doctors table + availability slots, service→doctor→slot→confirm, slot lock (no double-book), statuses Pending/Confirmed/Completed/Cancelled/Rescheduled, patient upcoming list, doctor queue view.
