# Skeptic audit fixes (0005 + app)

Three auditors reviewed everything. Fixed, verified with lint + build (26 routes).

## Security (migration 0005_security.sql + app)
- Staff takeover closed: `claim_staff` now matches Staff ID + school email (invite carries both).
- Roster dumps closed: registry readable by owner + clinical staff only; invites admin-only.
  Pre-signup checks go through `verify_student()` RPC (name + claimed flag only).
- Self-verify/self-card closed: `prevent_profile_tamper` trigger — owners touch name/phone only;
  verified/card changes need receptionist/admin; role changes need admin (claim RPCs pass a flag).
- Open redirect closed: callback only allows single-slash relative `next`.
- Squatting hardened: claim RPCs reject second claims cleanly; signup signs out on claim failure;
  production must turn ON Supabase `Confirm email` (documented in roles doc).
- Functions locked: `issue_clinic_file` (staff-only) + `log_audit` revoked from public.
- Emergency anon hardened: trigger forces Open/null-patient, validates lengths.
- Patients: insert Pending/future only; updates limited to cancel/reschedule via trigger.

## Data
- Explicit FK hints on lab/pharmacy/pregnancy/doctor joins (no more PGRST201).
- Patients can read active doctors' display names (new policy) — visits/booking show real names.
- Pharmacy dispenses through `dispense_prescription()` RPC (stock + alert + audit together).
- Phone search works; search term sanitized.
- Doctor Complete also closes linked visits (except when drugs await pharmacy).
- 23505 disambiguated: upcoming-rule vs slot-taken vs reference retry.
- `booked_slots(p_doctor, p_start, p_end)` — explicit UTC range, no timezone drift.
- Lab buttons gated by state; queue filters on `queue_date`.

## UX
- No fake PDF button, labeled inputs, contextual aria-labels, bottom nav aria-current,
  44px queue buttons, emergency works with no phone number set, PKCE-safe callback,
  Reveal visible pre-hydration, Pressable reduced-motion safe, StateBlock empties,
  notification link whitelist, 44px links, registry labels.

## Known accepted tradeoffs
- ID→email lookup is enumerable (school IDs are semi-public; needed for ID login + reset).
- `verify_student` is an anon name oracle (needed for pre-signup claim check; add CAPTCHA later).
- No rate limiting yet (forgot/reset/queue) — add before public launch.

## Frontend alignment (ChatGPT review, implemented)
- `active_doctors()` RPC (new, 0006) feeds book/experts/reception — no profile-row reads.
- Reschedule is a real flow: pick new slot → `reschedule_appointment()` swaps atomically.
- Pharmacy shows Available vs Prescribed; dispense only via RPC (single notification source).
- Lab cards show Released/Not released; patient rows are DB-excluded until released.
- Lagos day windows (`lagosDayRange`) feed `booked_slots(start,end)` — no date guessing.
- `friendlyError()` maps every form failure to safe copy (no SQL internals in UI).
- pgTAP scaffold in `supabase/tests/` — specs written, runs under `supabase test db` in CI.
