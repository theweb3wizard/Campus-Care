# Database v2 — why it looks like this

Redesigned after studying the old Campus-Care build (kept its claim model, atomic RPCs, and
safety-net constraints; dropped its email-first auth, dual sources, and app-layer half-writes).

## Identity: nobody logs in with email
- Students type **Reg No**, staff type **Staff ID** + password. The app maps IDs to synthetic
  emails (`lib/identity.ts`, domain `clinic.local`); Supabase Auth never sees a real address.
- **Registry + claim** (one pattern for everyone):
  - Registrar/admin imports reg numbers (`students` table) → student signs up → `claim_student()`
    locks the row, checks the name matches, links the account. No fake accounts.
  - Admin creates staff invites (`staff_invites` with role) → staff signs up → `claim_staff()`
    assigns the invite role. No open staff signup, no service key needed.
  - Unknown reg numbers can self-register only while `clinic_settings.allow_open_signup` is true
    (default on for pilot). They are marked `verified=false` until reception sees a physical ID.
- Password reset has no email to send to: reception/admin handle it face to face (documented on login).

## Simplicity: one clinic, few tables, one core flow
- Single clinic now (no tenant column). Selling to school #2 = new deployment, zero rework risk today.
- The day runs on **visits + queue_entries**, not appointments. Booking is a thin reservation that
  converts to a queue number at check-in. One screen (`/reception`) does find → check-in → book → run queue.
- Clinic file numbers (`CC-YYYY-NNNN`) come from a sequence, issued once at first check-in — never typed by hand.

## Robustness: the DB says no even if the app lies
- Partial uniques: one active visit/patient/day, one upcoming appointment/patient, one queue number/day,
  one slot/doctor/time, one report/appointment, `stock_qty >= 0`.
- `prevent_role_escalation` trigger: only admin changes roles; claim RPCs pass a session flag.
- Every two-row change is one RPC: `check_in_patient` (advisory lock + retry), `queue_transition`
  (queue + visit move together), `dispense_prescription` (status + guarded stock + alert + audit).
- `audit_logs` is function-only: no insert policy, so the app cannot write or forge rows.

## Connections (how tables link)
- `auth.users 1—1 profiles 1—0/1 students` (registry) and `profiles 1—0/1 clinic_files`
- `profiles 1—0/1 doctors` (bookable staff), staff invites link at claim time
- `profiles 1—N appointments/visits/test_orders/prescriptions/reports/pregnancy/questionnaire`
- `visits 1—1 queue_entries`; `appointments N—1 visits` (booking converts, never duplicates)
- `prescriptions → medicines` matched by name at dispense (stock decrements, floored at 0)

## Scalability notes (honest limits)
- Queue numbers use MAX+1 under an advisory lock: correct past thousands/day, no UUID gaps to explain.
- `booked_slots()` is SECURITY DEFINER with minimal output (timestamps only, no patient data).
- If a second school ever needs one platform: add `clinics` + `clinic_id` to profiles/students/appointments/visits. Nothing else changes shape.
