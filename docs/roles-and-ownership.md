# Roles and ownership — who does what

7 roles (`app_role` enum, migration 0001). Nobody is hardcoded: everyone signs up as patient, then an admin assigns roles in `/admin`.

| Role | Home | Can do |
|---|---|---|
| Patient | `/book`, `/visits`, `/tests`, `/reports`, `/pregnancy`, `/experts`, `/questionnaire`, `/notifications` | Book with Date → Time picker (taken times disabled), cancel with confirm, view gated results, read reports, answer questionnaire |
| Doctor | `/doctor` | Confirm/complete queue, order tests, prescribe, write reports |
| Nurse | `/doctor`, `/lab` | Same queue views, supports triage |
| Receptionist | `/reception` | Search by card/reg/name, issue card numbers, quick-book as Confirmed, print ticket, see today queue |
| Lab | `/lab` | Enter results, mark sampled/ready, release to patient (triggers alert) |
| Pharmacy | `/pharmacy` | Dispense queue (triggers alert) |
| Admin | `/admin` | Set any role, add/edit doctors (specialty, room, visible for booking) |

## Rules that keep it safe
- Only admin can change roles (migration 0005 trigger `prevent_role_escalation`, even receptionists issuing cards cannot promote anyone).
- Staff can update patient details/cards but never roles.
- Booking double-book is blocked twice: taken times disabled in the picker (RPC `booked_slots`) plus a DB unique index as backstop.
- Emergency requests can be filed logged-out; only staff triage them.

## Bootstrap (once)
1. Run migrations `0001 → 0005` then `seed.sql` on a fresh database.
2. Sign up with your Reg No + school email, then in Supabase SQL Editor:
   `update public.profiles set role = 'admin', verified = true where login_id = 'YOUR-REG-NO';`
3. Open `/admin`: import the student registry CSV, create staff invites (Staff ID + name + school email),
   set doctors (specialty + room + visible), flip open-signup off when the registry is complete.
4. Reception issues card numbers and verifies walk-ins from `/reception`.
5. Before real students: Supabase Auth → turn ON `Confirm email` (blocks spoofed-email squatting).
