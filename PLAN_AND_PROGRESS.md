# CampusCare — Full Plan & Progress (Detailed)

> Updated after every completed task. This is the source of truth.
> Stack: free only — Next.js + Supabase (free tier) + Vercel (free). No SMS, no paid services.
> Rule: grandma-usable in max 3 clicks. Simple, easy to debug.

## 1. What This Product Is

FUD university clinic on a phone. Replaces paper cards + morning queue chaos.

- **Student:** verify identity → create account → get clinic file number (CC-YYYY-NNNN) → walk in or book → get queue number → see doctor → get drugs → see results.
- **Receptionist:** find student by reg-number/name → check-in → run queue (call/next/skip).
- **Doctor:** see queue → open visit → write complaint/diagnosis/vitals → add prescription.
- **Pharmacist:** see pending prescriptions → dispense → stock goes down.
- **Admin:** create staff, settings, audit log.
- **Side flows (later):** emergency jump-the-queue button, pregnancy private page, short questionnaire, lab test → result ready notice, no-phone students served by reception, in-app bell + email (no SMS).

## 2. Build Method (Agreed)

Thin slices. Each slice = UI + backend + DB + test together. No UI-only phase.
I (agent) do all testing (`typecheck` + `build`). User runs one final test at end.
User runs no SQL until the end — agent delivers one full `full_setup.sql` at the end that creates everything from scratch (old DB was deleted).

## 3. Slices

| # | Slice | Scope | Status |
|---|-------|-------|--------|
| 0 | Setup | env, scripts, tracker files | DONE |
| 1 | Auth + Registration | signup (verify → setup → done), login/logout, forgot/reset password, force student role, block self-promote, verify_student + claim_student RPCs | DONE (code + migration written, build passes) |
| 2 | Reception Queue | search student, check-in, queue list, call/next/skip/cancel, duplicate guard, atomic queue number | DONE (code + migration written, build passes) |
| 3 | Doctor Consult | queue → consult form → prescription create, atomic start/complete/finalize | DONE (code + migration written, build passes) |
| 4 | Pharmacy | pending list → atomic dispense + stock down → inventory search + real stats | DONE (code + migration written, build passes) |
| 5 | Booking + Notifications | student book/cancel, bell fixed, live updates | DONE (code + migration written, build passes) |
| 6 | Admin | staff create fixed, audit writes, real dashboard | DONE (code + migration written, build passes) |
| 7 | Final | `full_setup.sql` one-file setup + seed + final checklist | DONE (rebuilt for Slices 1-8, build passes) |

Parked / simplified: lab (basic result ready only), pregnancy (private basic page), questionnaire (max 7 questions), emergency (one button + jump queue), expert finder (static list only if needed).

## 4. Slice 1 Detail — Auth + Registration [DONE]

**Kept:**
- `profiles`, `students`, `clinic_profiles` tables + `CC-YYYY-NNNN` trigger (`20240101000000_initial_schema.sql:116-206`)
- Login UI `src/features/auth/components/login-form.tsx`
- Onboarding 3-step UI `src/features/auth/components/onboarding-flow.tsx`
- Role routing `src/proxy.ts`, `requireRole()` in `src/features/auth/actions.ts`
- Zod schemas `src/lib/validations/auth.ts`

**Built / fixed this slice:**
- `supabase/migrations/20240101000002_slice1_auth_fix.sql`:
  - `handle_new_user()` → always `student`, ignores client role
  - `prevent_profile_privilege_escalation()` trigger → blocks self role/status change
  - `verify_student(p_reg, p_email)` SECURITY DEFINER → anon verify, returns only name + claimed flag
  - `claim_student(p_reg, p_email)` SECURITY DEFINER → locks student row, links profile_id, sets is_claimed, forces student role, single transaction
- `VerifyStep` now calls `verify_student` RPC instead of direct SELECT (fixes anon RLS fail)
- New forgot/reset: `forgot-password-form.tsx`, `reset-password-form.tsx`, pages `/forgot-password`, `/reset-password`, schemas `forgotPasswordSchema` / `resetPasswordSchema`
- `PUBLIC_ROUTES` += forgot/reset, `ROUTES` += forgot/reset, login links added, onboarding complete text simplified
- `.env.example` + `typecheck` script

**Verified by agent:**
- `npm run typecheck` → clean
- `npm run build` → 21/21 routes, includes `/forgot-password`, `/reset-password`
- `npm run lint` → no new errors in slice 1 files (30 pre-existing errors elsewhere, parked)

**Left for final SQL:** migration 003 will be merged into `full_setup.sql` in Slice 7. Do not run anything now.

## 5. Slice 2 Detail — Reception Queue [DONE]

**Kept:**
- Reception dashboard + queue pages, `PatientSearch`, `CheckInPanel`, `QueueTable`, `QueueSubscriber` realtime
- `upsertClinicProfile`, `getStudentByRegNumber`, `getStudentActiveVisit`

**Built / fixed this slice:**
- `supabase/migrations/20240101000003_slice2_queue_fix.sql`:
  - Added missing `queue_entries.queue_date` column + backfill + `uniq_queue_number_per_day` + index on `(queue_date, status, queue_number)`
  - `uniq_active_visit_per_day` partial unique index → DB blocks double check-in even on double-click
  - Fixed `get_next_queue_number()` to use `queue_date`
  - New `check_in_student()` SECURITY DEFINER → visit + queue in one transaction, advisory lock per day + 3x retry, no orphans, no duplicate numbers
- `walkInCheckIn()` now calls single RPC instead of 3-step insert + manual rollback
- `searchStudents()` sanitized (strips `,()"%;\`), selects only needed columns, name + reg-number only (no email leak), cap 10
- `updateQueueStatus()` allowlist only + syncs `visits.status` for in_consultation/completed/cancelled so queue and visit never diverge
- `getTodaysQueue()` capped at 100, uses `queue_date`
- Fixed search → check-in link (was passing UUID id, page expects reg-number) — now passes `registration_number`
- Fixed dead `onReset={()=>{}}` — new `CheckInPreloaded` client wrapper resets via `router.push('/reception/check-in')`
- `QueueTable` added Skip + Cancel buttons (was call-only)

**Verified by agent:**
- `npm run typecheck` → clean
- `npm run build` → 21/21 routes pass

**Left for final SQL:** migration 004 merged into `full_setup.sql` in Slice 7. Do not run anything now.

## 6. Slice 4 Detail — Pharmacy [DONE]

**Kept:**
- Pharmacy dashboard, pending list, dispense panel UI, restock modal, inventory table

**Built / fixed this slice:**
- `supabase/migrations/20240101000005_slice4_pharmacy_fix.sql`:
  - `dispense_item()` → locks item + stock, validates qty, updates stock + ledger + item + prescription + visit in one transaction, no oversell, correct `unavailable` vs `dispensed` status
  - `restock_item()` → validates 1-10000, stock + ledger together
- `dispenseItem()` / `restockMedication()` now call single RPCs with qty checks
- `markItemUnavailable()` fixed: all-unavailable now marks `unavailable`, not `dispensed`
- Dashboard 4th card now real `Dispensed today` count (was hardcoded 0)
- Inventory page added `?q` search box, shows filtered count

**Verified by agent:**
- `npm run typecheck` → clean
- `npm run build` → 21/21 routes pass

## 7. Slice 5 Detail — Booking + Notifications [DONE]

**Kept:**
- Student appointments list, notifications list + bell, student dashboard cards

**Built / fixed this slice:**
- `supabase/migrations/20240101000006_slice5_booking_notify_fix.sql`:
  - `appointments: student insert/cancel own` policies + `uniq_active_appointment_per_student` (one upcoming at a time)
  - `enqueue_notification()` SECURITY DEFINER → staff/system can notify students (fixes silent RLS drop)
  - `book_appointment()` → future-only, 30-day max, needs clinic profile, one active, auto bell
  - `cancel_appointment()` → own scheduled only
- `createNotification()` now calls RPC (was direct insert that always failed for staff)
- New student booking: `BookAppointmentForm` (14 days, skip Sunday, 7 fixed slots, reason) + `CancelAppointmentButton`
- Appointments page now has Book + Cancel (was read-only list)
- Notifications page: removed fire-and-forget auto-read race, added explicit `MarkAllReadButton` + live subscriber
- Student dashboard added live `QueueSubscriber` (was static, needed manual refresh)

**Verified by agent:**
- `npm run typecheck` → clean
- `npm run build` → 21/21 routes pass

## 8. Slice 6 Detail — Admin [DONE]

**Kept:**
- Staff table UI, settings form, audit table UI

**Built / fixed this slice:**
- `supabase/migrations/20240101000007_slice6_admin_fix.sql`:
  - `log_audit()` secure writer (profile_id always = self, no forgery) + locked audit table to function-only
  - check-in + booking now write audit inside RPCs automatically
  - `admin_link_staff()` → fixes role + staff row in one transaction, admins only
- New `src/lib/supabase/admin.ts` service-role client (server only, free)
- `createStaffAccount()` server action: validates, creates auth user confirmed, links role, rolls back on fail, returns one-time password
- `CreateStaffButton` now calls server action, shows Email + Password once with Copy (no email needed, no broken signUp)
- `toggleStaffStatus` / `updateStaffRole` now block last-admin lockout + write audit
- Admin dashboard: replaced fake Active/Online + Phase 6 placeholder with real Visits today + Pending Rx + quick links
- `.env.example` += `SUPABASE_SERVICE_ROLE_KEY`

**Verified by agent:**
- `npm run typecheck` → clean
- `npm run build` → 21/21 routes pass

## 9. Slice 7 Detail — Final [DONE]

**Delivered:**
- `supabase/full_setup.sql` — ONE file, run once on a fresh DB. Contains migrations 001→007 in order + final fixes + seed (8 students, 12 drugs + stock, settings). ~100KB.
- Final fixes inside it: `auth_uid()` typo patched, `student_medical_record_summary` view created (limited fields, no clinical notes), realtime publication for queue/visits/notifications/prescriptions.
- This file replaces running 8 separate migrations. Migration files kept as history.

**How to deploy (your one final test):**
1. Supabase Dashboard > SQL > paste `supabase/full_setup.sql` > Run. Expect success, no errors.
2. `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` (all in Dashboard > Project Settings > API). See `.env.example`.
3. `npm install`, `npm run dev`, open `/onboarding` → verify `CSC/2021/001` + `ada.okafor@university.edu.ng` → create password → `/login` → student home.
4. Admin: create staff at `/admin/staff` (copy one-time password), test reception check-in → doctor consult (+ lab order → result) → pharmacy dispense → student bell + test results page.
5. Supabase Auth > Email: turn OFF `Confirm email` for easy testing (turn ON before real students).
6. Try `/emergency` logged out, pregnancy + questionnaire as student, doctors directory, analytics CSV export.

## 10. Slice 8 Detail — Plan Modules, Simple Versions [DONE]

No SMS, no new roles, no paid services. Same atomic-RPC + audit + bell pattern.

**8a Lab:** `test_orders` table + RLS + `order_test` / `mark_test_sampled` / `save_test_result` RPCs. Doctor card on consultation page (order → sampled → result + auto bell). Student `/student/tests` page + sidebar link. Text results only, no storage buckets.

**8b Pregnancy + Questionnaire:** `pregnancy_records` (private opt-in, EDD + notes, `register_pregnancy` RPC) → student `/student/pregnancy` + pink banner in consultation + doctor can close. `questionnaire_responses` (7 fixed skippable questions, JSON, `submit_questionnaire` RPC) → student `/student/questionnaire` + answers card in consultation.

**8c Emergency + Reports + Directory:** `emergency_requests` (public report, no login, `report_emergency` open to anon) → `/emergency` page + links on landing banner + student SOS button → red banner on reception dashboard with Acknowledge/Resolve + audit. `doctor_directory` view → student `/student/doctors` searchable finder. Analytics CSV export button (in-browser download, no service).

**Verified by agent:**
- `npm run typecheck` → clean
- `npm run build` → 26/26 routes pass (5 new: `/emergency`, `/student/tests`, `/student/doctors`, `/student/pregnancy`, `/student/questionnaire`)
- `supabase/full_setup.sql` rebuilt: 11 migrations + history view + realtime (incl. new tables) + seed

**Known simplifications (by your request):**
- No SMS, no lab module, no pregnancy/questionnaire/emergency pages yet — core flow first.
- No automated tests/CI — `typecheck` + `build` were the gates each slice.

**Verified by agent:**
- `npm run typecheck` → clean
- `npm run build` → 21/21 routes pass

## 7. Slice 3 Detail — Doctor Consult [DONE]

**Kept:**
- Doctor dashboard + queue list UI, consultation 3-column layout, `ConsultationForm`, `PrescriptionComposer`, `PatientSummary`, history list

**Built / fixed this slice:**
- `supabase/migrations/20240101000004_slice3_doctor_fix.sql`:
  - `prescription_items: doctor delete pending` policy → remove button works again
  - `start_consultation()` → queue + visit move together, blocks already-done, assigns doctor
  - `complete_consultation()` → smart: if drugs exist → `awaiting_pharmacy` + rx `ready`, else `completed`
  - `finalize_prescription()` → rx + visit + queue in one transaction, blocks empty prescriptions
- `startConsultation` / `completeConsultation` / `finalizePrescription` now call single RPCs (no more half-applied `Promise.all`)
- `saveMedicalRecord()` requires complaint or diagnosis, caps at 2000 chars
- `addPrescriptionItem()` requires dosage + frequency, qty 1-1000
- `getDoctorQueue()` capped at 100

**Verified by agent:**
- `npm run typecheck` → clean
- `npm run build` → 21/21 routes pass
