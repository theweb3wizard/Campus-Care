-- ============================================================
-- Campus Care v2 — 0002 clinical
--
-- Lab orders + gated results
-- Pharmacy + guarded inventory
-- Clinical reports
--
-- REQUIRES:
--   0001_core.sql to have completed successfully.
--
-- In particular, 0001 creates:
--   private.current_app_role()
-- ============================================================


-- ============================================================
-- 1. TEST ORDERS
--
-- Patients must NOT be able to read the result until:
--   status = 'Ready'
--   AND
--   is_released = true
--
-- Staff can manage orders according to their role.
-- ============================================================

create table if not exists public.test_orders (
  id uuid primary key default gen_random_uuid(),

  appointment_id uuid
    references public.appointments(id)
    on delete set null,

  patient_id uuid not null
    references public.profiles(id)
    on delete cascade,

  ordered_by uuid
    references public.profiles(id)
    on delete set null,

  test_name text not null,

  status text not null default 'Ordered',

  result_text text not null default '',

  is_released boolean not null default false,

  release_note text not null default '',

  created_at timestamptz not null default now(),

  constraint test_orders_status_check
    check (
      status in (
        'Ordered',
        'Sampled',
        'Ready',
        'Cancelled'
      )
    ),

  -- A result cannot be released unless the test is Ready.
  constraint test_orders_release_check
    check (
      not is_released
      or status = 'Ready'
    )
);

create index if not exists test_orders_patient_idx
  on public.test_orders (patient_id, created_at desc);

create index if not exists test_orders_status_idx
  on public.test_orders (status);


-- ============================================================
-- 2. MEDICINES
--
-- One row per medicine.
-- stock_qty can never be negative.
-- ============================================================

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),

  name text unique not null,

  stock_qty integer not null default 0,

  unit text not null default 'tabs',

  constraint medicines_stock_nonnegative
    check (stock_qty >= 0)
);


-- Helpful for case-insensitive medicine lookup during dispensing.
create index if not exists medicines_name_lower_idx
  on public.medicines (lower(name));


-- ============================================================
-- 3. PRESCRIPTIONS
-- ============================================================

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),

  appointment_id uuid
    references public.appointments(id)
    on delete set null,

  visit_id uuid
    references public.visits(id)
    on delete set null,

  patient_id uuid not null
    references public.profiles(id)
    on delete cascade,

  prescribed_by uuid
    references public.profiles(id)
    on delete set null,

  medicine_name text not null,

  dosage text not null default '',

  quantity integer not null default 1,

  instructions text not null default '',

  status text not null default 'Prescribed',

  dispensed_by uuid
    references public.profiles(id)
    on delete set null,

  dispensed_at timestamptz,

  created_at timestamptz not null default now(),

  constraint prescriptions_quantity_check
    check (quantity > 0),

  constraint prescriptions_status_check
    check (
      status in (
        'Prescribed',
        'Dispensed',
        'Cancelled'
      )
    ),

  -- A prescription marked Dispensed must have proof of dispensing.
  constraint prescriptions_dispensed_metadata_check
    check (
      (
        status = 'Dispensed'
        and dispensed_by is not null
        and dispensed_at is not null
      )
      or
      (
        status <> 'Dispensed'
      )
    )
);

create index if not exists prescriptions_patient_idx
  on public.prescriptions (patient_id, created_at desc);

create index if not exists prescriptions_status_idx
  on public.prescriptions (status);


-- ============================================================
-- 4. REPORTS
--
-- One report per appointment.
--
-- doctor_id points to public.doctors rather than an arbitrary
-- profile, guaranteeing that the referenced person is actually
-- registered as a doctor.
-- ============================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),

  appointment_id uuid unique not null
    references public.appointments(id)
    on delete cascade,

  patient_id uuid not null
    references public.profiles(id)
    on delete cascade,

  doctor_id uuid
    references public.doctors(id)
    on delete set null,

  diagnosis text not null default '',

  treatment text not null default '',

  follow_up_date date,

  created_at timestamptz not null default now()
);

create index if not exists reports_patient_idx
  on public.reports (patient_id, created_at desc);


-- ============================================================
-- 5. PRESCRIPTION / PATIENT INTEGRITY
--
-- appointment_id and visit_id are optional, so we enforce the
-- patient relationship through a trigger rather than a composite
-- foreign key that would complicate the 0001 schema.
--
-- This prevents:
--
-- appointment belongs to Patient A
-- prescription says Patient B
--
-- or:
--
-- visit belongs to Patient A
-- prescription says Patient B
-- ============================================================

create or replace function public.validate_prescription_patient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid;
begin

  -- Appointment, when supplied, must belong to the same patient.
  if new.appointment_id is not null then

    select a.patient_id
      into v_patient_id
    from public.appointments a
    where a.id = new.appointment_id;

    if v_patient_id is null then
      raise exception 'Appointment does not exist.';
    end if;

    if v_patient_id <> new.patient_id then
      raise exception
        'Prescription patient does not match appointment patient.';
    end if;

  end if;


  -- Visit, when supplied, must belong to the same patient.
  if new.visit_id is not null then

    select v.patient_id
      into v_patient_id
    from public.visits v
    where v.id = new.visit_id;

    if v_patient_id is null then
      raise exception 'Visit does not exist.';
    end if;

    if v_patient_id <> new.patient_id then
      raise exception
        'Prescription patient does not match visit patient.';
    end if;

  end if;

  return new;
end
$$;


drop trigger if exists prescriptions_patient_integrity
on public.prescriptions;

create trigger prescriptions_patient_integrity
before insert or update
on public.prescriptions
for each row
execute function public.validate_prescription_patient();


revoke all on function public.validate_prescription_patient()
from public, anon, authenticated;


-- ============================================================
-- 6. TEST ORDER / PATIENT INTEGRITY
--
-- If a test order is attached to an appointment, it must belong
-- to that appointment's patient.
-- ============================================================

create or replace function public.validate_test_order_patient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid;
begin

  if new.appointment_id is not null then

    select a.patient_id
      into v_patient_id
    from public.appointments a
    where a.id = new.appointment_id;

    if v_patient_id is null then
      raise exception 'Appointment does not exist.';
    end if;

    if v_patient_id <> new.patient_id then
      raise exception
        'Test order patient does not match appointment patient.';
    end if;

  end if;

  return new;
end
$$;


drop trigger if exists test_orders_patient_integrity
on public.test_orders;

create trigger test_orders_patient_integrity
before insert or update
on public.test_orders
for each row
execute function public.validate_test_order_patient();


revoke all on function public.validate_test_order_patient()
from public, anon, authenticated;


-- ============================================================
-- 7. GUARDED PHARMACY DISPENSING
--
-- This is the important inventory protection.
--
-- When a prescription changes to "Dispensed":
--
-- 1. The medicine must exist.
-- 2. The medicine row is locked.
-- 3. Stock must be >= requested quantity.
-- 4. Stock is decremented atomically.
-- 5. dispensed_by is automatically the authenticated user.
-- 6. dispensed_at is automatically set.
--
-- Therefore two simultaneous pharmacy requests cannot both
-- consume stock that does not exist.
-- ============================================================

create or replace function public.guard_prescription_dispense()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_medicine_id uuid;
  v_stock integer;
  v_actor_role public.app_role;
begin

  -- Only do inventory work when transitioning INTO Dispensed.
  if new.status = 'Dispensed'
     and (
       tg_op = 'INSERT'
       or old.status <> 'Dispensed'
     )
  then

    -- Identify caller.
    select private.current_app_role()
      into v_actor_role;

    -- Only pharmacy/admin may dispense.
    if v_actor_role not in (
      'pharmacy'::public.app_role,
      'admin'::public.app_role
    ) then
      raise exception
        'Only pharmacy staff or admin can dispense medication.';
    end if;


    -- Locate and lock medicine row.
    select m.id, m.stock_qty
      into v_medicine_id, v_stock
    from public.medicines m
    where lower(m.name) = lower(new.medicine_name)
    for update;


    -- Medicine must exist in the catalog.
    if v_medicine_id is null then
      raise exception
        'Medicine "%" does not exist in the medicine catalog.',
        new.medicine_name;
    end if;


    -- Never allow stock to go below zero.
    if v_stock < new.quantity then
      raise exception
        'Insufficient stock for "%". Available: %, requested: %.',
        new.medicine_name,
        v_stock,
        new.quantity;
    end if;


    -- Deduct stock while the medicine row remains locked.
    update public.medicines
    set stock_qty = stock_qty - new.quantity
    where id = v_medicine_id;


    -- Normalize medicine name to catalog spelling.
    select m.name
      into new.medicine_name
    from public.medicines m
    where m.id = v_medicine_id;


    -- Record the actual dispensing actor/time.
    new.dispensed_by := (select auth.uid());
    new.dispensed_at := now();

  end if;


  -- Once dispensed, do not silently change the prescription
  -- back to Prescribed/Cancelled without implementing stock
  -- reversal.
  if tg_op = 'UPDATE'
     and old.status = 'Dispensed'
     and new.status <> 'Dispensed'
  then
    raise exception
      'A dispensed prescription cannot be changed to another status.';
  end if;


  -- Once dispensed, quantity/medicine cannot be changed because
  -- inventory has already been consumed.
  if tg_op = 'UPDATE'
     and old.status = 'Dispensed'
     and (
       old.quantity <> new.quantity
       or old.medicine_name <> new.medicine_name
     )
  then
    raise exception
      'A dispensed prescription cannot change medicine or quantity.';
  end if;


  return new;
end
$$;


drop trigger if exists prescription_dispense_guard
on public.prescriptions;

create trigger prescription_dispense_guard
before insert or update
on public.prescriptions
for each row
execute function public.guard_prescription_dispense();


revoke all on function public.guard_prescription_dispense()
from public, anon, authenticated;


-- ============================================================
-- 8. TEST RESULT RELEASE GUARD
--
-- "is_released = true" is only valid when status = "Ready".
--
-- Also prevent a caller from releasing a result without
-- actually having a result.
-- ============================================================

create or replace function public.validate_test_release()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role public.app_role;
begin

  if new.is_released then

    select private.current_app_role()
      into v_actor_role;

    if v_actor_role not in (
      'doctor'::public.app_role,
      'nurse'::public.app_role,
      'lab'::public.app_role,
      'admin'::public.app_role
    ) then
      raise exception
        'Only clinical staff can release test results.';
    end if;

    if new.status <> 'Ready' then
      raise exception
        'A test result can only be released when status is Ready.';
    end if;

    if btrim(new.result_text) = '' then
      raise exception
        'A test result cannot be released without result text.';
    end if;

  end if;


  return new;
end
$$;


drop trigger if exists test_result_release_guard
on public.test_orders;

create trigger test_result_release_guard
before insert or update
on public.test_orders
for each row
execute function public.validate_test_release();


revoke all on function public.validate_test_release()
from public, anon, authenticated;


-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

alter table public.test_orders
enable row level security;

alter table public.medicines
enable row level security;

alter table public.prescriptions
enable row level security;

alter table public.reports
enable row level security;


-- ============================================================
-- 10. TEST ORDER POLICIES
-- ============================================================

drop policy if exists "own test orders read"
on public.test_orders;

create policy "own test orders read"
on public.test_orders
for select
to authenticated
using (
  (select auth.uid()) = patient_id
  and status = 'Ready'
  and is_released = true
);


drop policy if exists "staff test orders full"
on public.test_orders;

create policy "staff test orders full"
on public.test_orders
for all
to authenticated
using (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'lab'::public.app_role,
    'admin'::public.app_role
  )
)
with check (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'lab'::public.app_role,
    'admin'::public.app_role
  )
);


-- ============================================================
-- 11. MEDICINE POLICIES
-- ============================================================

drop policy if exists "medicines readable"
on public.medicines;

create policy "medicines readable"
on public.medicines
for select
to authenticated
using (true);


drop policy if exists "medicines managed"
on public.medicines;

create policy "medicines managed"
on public.medicines
for all
to authenticated
using (
  (select private.current_app_role()) in (
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  )
)
with check (
  (select private.current_app_role()) in (
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  )
);


-- ============================================================
-- 12. PRESCRIPTION POLICIES
-- ============================================================

drop policy if exists "own prescriptions read"
on public.prescriptions;

create policy "own prescriptions read"
on public.prescriptions
for select
to authenticated
using (
  (select auth.uid()) = patient_id
);


drop policy if exists "staff prescriptions full"
on public.prescriptions;

create policy "staff prescriptions full"
on public.prescriptions
for all
to authenticated
using (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  )
)
with check (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  )
);


-- ============================================================
-- 13. REPORT POLICIES
-- ============================================================

drop policy if exists "own reports read"
on public.reports;

create policy "own reports read"
on public.reports
for select
to authenticated
using (
  (select auth.uid()) = patient_id
);


drop policy if exists "staff reports full"
on public.reports;

create policy "staff reports full"
on public.reports
for all
to authenticated
using (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'admin'::public.app_role
  )
)
with check (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'admin'::public.app_role
  )
);