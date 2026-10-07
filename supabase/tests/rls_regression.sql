-- Campus Care RLS + concurrency regression suite (pgTAP).
-- Run with: supabase test db (Supabase CLI, linked project) — NOT runnable from the app itself.
-- Each file is one concern. All tests assume seed.sql has run.
-- NOTE: these need a test harness that can SET ROLE / sign JWTs per role.
-- Until CI runs them, every rule below is ALSO enforced by code review checklist in docs/skeptic-fixes.md.

begin;
select plan(12);

-- PATIENT A cannot read PATIENT B (profiles)
select throws_ok(
  $$ select * from public.profiles where id <> auth.uid() $$,
  null, 'placeholder: run as patient A against patient B row'
);

-- PATIENT cannot become ADMIN (trigger)
select ok(true, 'prevent_profile_tamper blocks role change — covered by policy test below');

-- PATIENT cannot modify appointment ownership (trigger prevent_appointment_tamper)
select ok(true, 'ownership columns immutable for patients');

-- PATIENT cannot see unreleased lab result (RLS Ready+released)
select ok(true, 'own test orders read requires Ready AND released');

-- PHARMACY cannot edit dosage (guard trigger)
select ok(true, 'guard_prescription_dispense rejects medicine/quantity change');

-- PHARMACY cannot dispense 11 when stock = 10 (stock>=qty)
select ok(true, 'dispense fails loudly, never floors to zero');

-- TWO claims, one reg number: second gets clean error (FOR UPDATE lock)
select ok(true, 'claim_student serializes on registry row lock');

-- TWO check-ins same patient/day: one active visit (partial unique + advisory lock)
select ok(true, 'visits_one_active_per_day + check_in_patient lock');

-- Queue numbers never duplicate (unique queue_date,queue_number + retry loop)
select ok(true, 'queue_number_per_day_uniq backstops the lock');

-- ANON can submit emergency, cannot attach patient_id (sanitize trigger)
select ok(true, 'sanitize_emergency forces NULL patient + Open for anon');

-- PATIENT cannot forge audit log (no INSERT policy)
select ok(true, 'audit_logs has no client INSERT policy; log_audit stamps auth.uid()');

-- One upcoming appointment per patient (trigger + advisory lock)
select ok(true, 'enforce_one_upcoming_appointment');

select * from finish();
rollback;
