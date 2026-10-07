-- Campus Care v2 — 0001 core: identity, registry + claim, clinic files, queue, audit
--
-- Single clinic (FUD).
-- Run order: 0001 → 0002 → 0003 → 0004, then seed.sql.
--
-- Auth model:
-- NOBODY logs in with email.
-- Login ID = Reg No (students) or Staff ID (staff),
-- mapped to a synthetic email only inside the app (see lib/identity.ts).
-- Supabase Auth never sees real emails.


-- ============================================================
-- 1. ROLES
-- ============================================================

do $$
begin
  create type public.app_role as enum (
    'patient',
    'doctor',
    'nurse',
    'receptionist',
    'lab',
    'pharmacy',
    'admin'
  );
exception
  when duplicate_object then null;
end
$$;


-- ============================================================
-- 2. PROFILES
-- One row per auth user.
-- login_id is the human credential (uppercased by the app).
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  login_id text unique not null,
  role public.app_role not null default 'patient',
  full_name text not null default '',
  card_number text unique,
  phone text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx
  on public.profiles (role);

create index if not exists profiles_card_idx
  on public.profiles (card_number);


-- ============================================================
-- 3. AUTH USER -> PROFILE TRIGGER
-- New auth users become patients by default.
-- login_id comes from signup metadata.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    login_id,
    full_name,
    role
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'login_id', ''),
      'PENDING-' || substr(new.id::text, 1, 8)
    ),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'patient'::public.app_role
  )
  on conflict (id) do nothing;

  return new;
end
$$;


drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- ============================================================
-- 4. STUDENT REGISTRY
-- Registrar imports rows; students claim them.
-- Open signup can also add rows later through 0004.
-- ============================================================

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  reg_number text unique not null,
  full_name text not null,
  institutional_email text,
  faculty text,
  department text,
  phone text,
  is_claimed boolean not null default false,
  auto_created boolean not null default false,
  profile_id uuid unique references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists students_reg_idx
  on public.students (reg_number);


-- ============================================================
-- 5. STAFF INVITES
-- Admin creates these; staff claim them at signup.
-- No open staff signup.
-- ============================================================

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  staff_id text unique not null,
  full_name text not null,
  role public.app_role not null,
  is_claimed boolean not null default false,
  profile_id uuid unique references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint staff_invite_role_check
    check (role <> 'patient'::public.app_role)
);


-- ============================================================
-- 6. CLINIC FILES
-- One file per patient.
-- Number format: CC-YYYY-NNNN
-- ============================================================

create sequence if not exists public.clinic_file_seq;

create table if not exists public.clinic_files (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique not null
    references public.profiles(id)
    on delete cascade,
  file_number text unique not null,
  blood_group text,
  genotype text,
  allergies text,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 7. ISSUE CLINIC FILE
-- Reception/admin can issue for a patient.
-- A patient can also issue their own file if needed.
-- ============================================================

create or replace function public.issue_clinic_file(
  p_profile uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_num text;
  v_actor_role public.app_role;
begin

  -- Must be authenticated.
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  -- Determine caller role without triggering profiles RLS recursion.
  select p.role
    into v_actor_role
  from public.profiles p
  where p.id = (select auth.uid());

  -- Patients may issue their own file.
  -- Receptionists/admins may issue files for anyone.
  if p_profile <> (select auth.uid())
     and v_actor_role not in (
       'receptionist'::public.app_role,
       'admin'::public.app_role
     )
  then
    raise exception 'Not authorized to issue this clinic file.';
  end if;

  select
    'CC-' ||
    to_char(now(), 'YYYY') ||
    '-' ||
    lpad(nextval('public.clinic_file_seq')::text, 4, '0')
  into v_num;

  insert into public.clinic_files (
    profile_id,
    file_number
  )
  values (
    p_profile,
    v_num
  )
  on conflict (profile_id) do nothing;

  select file_number
    into v_num
  from public.clinic_files
  where profile_id = p_profile;

  return v_num;
end
$$;


-- This function is intended to be called through the app.
revoke all on function public.issue_clinic_file(uuid)
from public, anon;

grant execute on function public.issue_clinic_file(uuid)
to authenticated;


-- ============================================================
-- 8. DOCTORS
-- Extended profile for bookable staff.
-- ============================================================

create table if not exists public.doctors (
  id uuid primary key
    references public.profiles(id)
    on delete cascade,
  specialty text not null default 'General',
  room text not null default 'Clinic 1',
  bio text not null default '',
  is_active boolean not null default true
);


-- ============================================================
-- 9. APPOINTMENT STATUS
-- ============================================================

do $$
begin
  create type public.appt_status as enum (
    'Pending',
    'Confirmed',
    'Completed',
    'Cancelled',
    'Rescheduled'
  );
exception
  when duplicate_object then null;
end
$$;


-- ============================================================
-- 10. APPOINTMENTS
-- ============================================================

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),

  patient_id uuid not null
    references public.profiles(id)
    on delete cascade,

  doctor_id uuid not null
    references public.doctors(id)
    on delete restrict,

  service text not null default 'General',

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  status public.appt_status not null default 'Pending',

  reference text unique not null,

  notes text not null default '',

  created_at timestamptz not null default now(),

  constraint appointments_time_check
    check (ends_at > starts_at)
);

create index if not exists appointments_patient_idx
  on public.appointments (patient_id, starts_at desc);

create index if not exists appointments_doctor_idx
  on public.appointments (doctor_id, starts_at);


-- ============================================================
-- 11. NO DOUBLE-BOOKING PER DOCTOR / START TIME
--
-- This one CAN be a partial unique index because its predicate
-- depends only on row values and uses no current-time function.
-- ============================================================

do $$
begin
  create unique index appointments_doctor_slot_uniq
    on public.appointments (doctor_id, starts_at)
    where status in (
      'Pending'::public.appt_status,
      'Confirmed'::public.appt_status
    );
exception
  when duplicate_object then null;
end
$$;


-- ============================================================
-- 12. ONE UPCOMING APPOINTMENT PER PATIENT
--
-- IMPORTANT:
-- We CANNOT use:
--
--   starts_at > now()
--
-- inside a partial index predicate.
--
-- PostgreSQL requires index predicates to use IMMUTABLE
-- expressions. now() is STABLE because it depends on the
-- current transaction time.
--
-- Therefore we enforce this business rule using a trigger.
-- A transaction-level advisory lock prevents two concurrent
-- requests from creating two upcoming appointments for the
-- same patient.
-- ============================================================

drop index if exists public.appointments_one_upcoming_per_patient;


create or replace function public.enforce_one_upcoming_appointment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conflict_id uuid;
begin

  -- Only relevant for active/upcoming appointments.
  if new.status in (
       'Pending'::public.appt_status,
       'Confirmed'::public.appt_status
     )
     and new.starts_at > now()
  then

    -- Serialize appointment creation/update for this patient.
    -- hashtextextended gives us a bigint suitable for
    -- pg_advisory_xact_lock().
    perform pg_advisory_xact_lock(
      hashtextextended(new.patient_id::text, 0)
    );

    -- Look for another active upcoming appointment.
    select a.id
      into v_conflict_id
    from public.appointments a
    where a.patient_id = new.patient_id
      and a.status in (
        'Pending'::public.appt_status,
        'Confirmed'::public.appt_status
      )
      and a.starts_at > now()
      and (
        tg_op = 'INSERT'
        or a.id <> new.id
      )
    limit 1;

    if v_conflict_id is not null then
      raise exception
        'Patient already has an upcoming appointment (%).',
        v_conflict_id
        using errcode = '23505';
    end if;

  end if;

  return new;
end
$$;


drop trigger if exists appointments_one_upcoming_guard
on public.appointments;

create trigger appointments_one_upcoming_guard
before insert or update of patient_id, starts_at, status
on public.appointments
for each row
execute function public.enforce_one_upcoming_appointment();


-- This function exists for trigger execution only.
revoke all on function public.enforce_one_upcoming_appointment()
from public, anon, authenticated;


-- ============================================================
-- 13. VISIT STATUS
-- ============================================================

do $$
begin
  create type public.visit_status as enum (
    'checked_in',
    'in_consultation',
    'awaiting_pharmacy',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end
$$;


-- ============================================================
-- 14. VISITS
-- ============================================================

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),

  patient_id uuid not null
    references public.profiles(id)
    on delete cascade,

  appointment_id uuid
    references public.appointments(id)
    on delete set null,

  checked_in_by uuid
    references public.profiles(id)
    on delete set null,

  status public.visit_status not null default 'checked_in',

  visit_date date not null default (now()::date),

  created_at timestamptz not null default now()
);

create index if not exists visits_patient_date_idx
  on public.visits (patient_id, visit_date desc);


-- ============================================================
-- 15. ONE ACTIVE VISIT PER PATIENT PER DAY
--
-- This predicate is valid because it uses only row values.
-- There is no now() here.
-- ============================================================

do $$
begin
  create unique index visits_one_active_per_day
    on public.visits (patient_id, visit_date)
    where status in (
      'checked_in'::public.visit_status,
      'in_consultation'::public.visit_status,
      'awaiting_pharmacy'::public.visit_status
    );
exception
  when duplicate_object then null;
end
$$;


-- ============================================================
-- 16. QUEUE STATUS
-- ============================================================

do $$
begin
  create type public.queue_status as enum (
    'waiting',
    'called',
    'in_consultation',
    'skipped',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end
$$;


-- ============================================================
-- 17. QUEUE ENTRIES
-- ============================================================

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),

  visit_id uuid unique not null
    references public.visits(id)
    on delete cascade,

  queue_number integer not null,

  queue_date date not null default (now()::date),

  status public.queue_status not null default 'waiting',

  assigned_doctor_id uuid
    references public.doctors(id)
    on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists queue_day_idx
  on public.queue_entries (queue_date, status, queue_number);


-- ============================================================
-- 18. QUEUE NUMBER UNIQUENESS
-- ============================================================

do $$
begin
  create unique index queue_number_per_day_uniq
    on public.queue_entries (queue_date, queue_number);
exception
  when duplicate_object then null;
end
$$;


-- ============================================================
-- 19. AUDIT LOG
-- ============================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid
    references public.profiles(id)
    on delete set null,

  action text not null,

  resource_type text not null default '',

  resource_id text not null default '',

  created_at timestamptz not null default now()
);

create index if not exists audit_time_idx
  on public.audit_logs (created_at desc);


-- ============================================================
-- 20. AUDIT FUNCTION
-- ============================================================

create or replace function public.log_audit(
  p_action text,
  p_resource text,
  p_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  insert into public.audit_logs (
    profile_id,
    action,
    resource_type,
    resource_id
  )
  values (
    (select auth.uid()),
    p_action,
    p_resource,
    coalesce(p_id, '')
  );

end
$$;


revoke all on function public.log_audit(text, text, text)
from public, anon;

grant execute on function public.log_audit(text, text, text)
to authenticated;


-- ============================================================
-- 21. CLINIC SETTINGS
-- ============================================================

create table if not exists public.clinic_settings (
  key text primary key,
  value text not null default ''
);

insert into public.clinic_settings (key, value)
values
  ('clinic_name', 'FUD Clinic'),
  ('clinic_phone', ''),
  ('allow_open_signup', 'true'),
  ('working_hours', 'Mon to Sat · 08:00 to 16:00'),
  ('max_daily_queue', '200')
on conflict (key) do nothing;


-- ============================================================
-- 22. PRIVATE RLS ROLE HELPER
--
-- IMPORTANT:
-- DO NOT query public.profiles directly from policies on
-- public.profiles.
--
-- Supabase recommends a SECURITY DEFINER helper for this pattern.
-- The helper reads profiles as its owner, avoiding recursive RLS
-- evaluation.
-- ============================================================

create schema if not exists private;


create or replace function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
$$;


revoke all on function private.current_app_role()
from public, anon, authenticated;

grant usage on schema private
to authenticated;

grant execute on function private.current_app_role()
to authenticated;


-- ============================================================
-- 23. ROLE ESCALATION GUARD
-- Only admin can change roles.
-- Claim RPCs may temporarily set app.claim_ctx = 'on'.
-- ============================================================

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.app_role;
begin

  -- No change in role = nothing to guard.
  if new.role = old.role then
    return new;
  end if;

  -- Claim RPCs are allowed to assign the claimed role.
  if pg_catalog.current_setting('app.claim_ctx', true) = 'on' then
    return new;
  end if;

  -- Look up the caller's role.
  select p.role
    into actor_role
  from public.profiles p
  where p.id = (select auth.uid());

  -- Only an admin can change another user's role.
  if actor_role is distinct from 'admin'::public.app_role then
    raise exception 'Only admin can change roles.';
  end if;

  return new;
end
$$;


drop trigger if exists profiles_no_role_escalation
on public.profiles;

create trigger profiles_no_role_escalation
before update on public.profiles
for each row
execute function public.prevent_role_escalation();


revoke all on function public.prevent_role_escalation()
from public, anon, authenticated;


-- ============================================================
-- 24. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.staff_invites enable row level security;
alter table public.clinic_files enable row level security;
alter table public.doctors enable row level security;
alter table public.appointments enable row level security;
alter table public.visits enable row level security;
alter table public.queue_entries enable row level security;
alter table public.audit_logs enable row level security;
alter table public.clinic_settings enable row level security;


-- ============================================================
-- 25. PROFILES POLICIES
-- ============================================================

drop policy if exists "own profile read"
on public.profiles;

create policy "own profile read"
on public.profiles
for select
using (
  (select auth.uid()) = id
);


drop policy if exists "own profile update"
on public.profiles;

create policy "own profile update"
on public.profiles
for update
using (
  (select auth.uid()) = id
)
with check (
  (select auth.uid()) = id
);


drop policy if exists "staff profile read"
on public.profiles;

create policy "staff profile read"
on public.profiles
for select
using (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'lab'::public.app_role,
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  )
);


drop policy if exists "staff profile update"
on public.profiles;

create policy "staff profile update"
on public.profiles
for update
using (
  (select private.current_app_role()) in (
    'receptionist'::public.app_role,
    'admin'::public.app_role
  )
)
with check (
  (select private.current_app_role()) in (
    'receptionist'::public.app_role,
    'admin'::public.app_role
  )
);


-- ============================================================
-- 26. STUDENT REGISTRY POLICIES
-- ============================================================

drop policy if exists "registry readable"
on public.students;

create policy "registry readable"
on public.students
for select
to authenticated
using (true);


drop policy if exists "staff registry write"
on public.students;

create policy "staff registry write"
on public.students
for all
using (
  (select private.current_app_role()) in (
    'receptionist'::public.app_role,
    'admin'::public.app_role
  )
)
with check (
  (select private.current_app_role()) in (
    'receptionist'::public.app_role,
    'admin'::public.app_role
  )
);


-- ============================================================
-- 27. STAFF INVITE POLICIES
-- ============================================================

drop policy if exists "invites readable"
on public.staff_invites;

create policy "invites readable"
on public.staff_invites
for select
to authenticated
using (true);


drop policy if exists "admin invites write"
on public.staff_invites;

create policy "admin invites write"
on public.staff_invites
for all
using (
  (select private.current_app_role())
    = 'admin'::public.app_role
)
with check (
  (select private.current_app_role())
    = 'admin'::public.app_role
);


-- ============================================================
-- 28. CLINIC FILE POLICIES
-- ============================================================

drop policy if exists "own file read"
on public.clinic_files;

create policy "own file read"
on public.clinic_files
for select
using (
  (select auth.uid()) = profile_id

  or

  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'lab'::public.app_role,
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  )
);


drop policy if exists "staff file write"
on public.clinic_files;

create policy "staff file write"
on public.clinic_files
for all
using (
  (select private.current_app_role()) in (
    'receptionist'::public.app_role,
    'admin'::public.app_role
  )
)
with check (
  (select private.current_app_role()) in (
    'receptionist'::public.app_role,
    'admin'::public.app_role
  )
);


-- ============================================================
-- 29. DOCTORS POLICIES
-- ============================================================

drop policy if exists "doctors readable"
on public.doctors;

create policy "doctors readable"
on public.doctors
for select
to authenticated
using (
  is_active = true
);


drop policy if exists "admin doctors write"
on public.doctors;

create policy "admin doctors write"
on public.doctors
for all
using (
  (select private.current_app_role())
    = 'admin'::public.app_role
)
with check (
  (select private.current_app_role())
    = 'admin'::public.app_role
);


-- ============================================================
-- 30. APPOINTMENT POLICIES
-- ============================================================

drop policy if exists "own appointments read"
on public.appointments;

create policy "own appointments read"
on public.appointments
for select
using (
  (select auth.uid()) = patient_id
);


drop policy if exists "own appointments insert"
on public.appointments;

create policy "own appointments insert"
on public.appointments
for insert
with check (
  (select auth.uid()) = patient_id
);


drop policy if exists "own appointments cancel"
on public.appointments;

create policy "own appointments cancel"
on public.appointments
for update
using (
  (select auth.uid()) = patient_id
)
with check (
  (select auth.uid()) = patient_id
);


drop policy if exists "staff appointments full"
on public.appointments;

create policy "staff appointments full"
on public.appointments
for all
using (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'lab'::public.app_role,
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  )
)
with check (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'lab'::public.app_role,
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  )
);


-- ============================================================
-- 31. VISIT POLICIES
-- ============================================================

drop policy if exists "own visits read"
on public.visits;

create policy "own visits read"
on public.visits
for select
using (
  (select auth.uid()) = patient_id
);


drop policy if exists "staff visits full"
on public.visits;

create policy "staff visits full"
on public.visits
for all
using (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'lab'::public.app_role,
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  )
)
with check (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'lab'::public.app_role,
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  )
);


-- ============================================================
-- 32. QUEUE POLICIES
-- ============================================================

drop policy if exists "own queue read"
on public.queue_entries;

create policy "own queue read"
on public.queue_entries
for select
using (
  exists (
    select 1
    from public.visits v
    where v.id = queue_entries.visit_id
      and v.patient_id = (select auth.uid())
  )
);


drop policy if exists "staff queue full"
on public.queue_entries;

create policy "staff queue full"
on public.queue_entries
for all
using (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'admin'::public.app_role
  )
)
with check (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'admin'::public.app_role
  )
);


-- ============================================================
-- 33. AUDIT POLICIES
-- Only admins can read.
-- No direct INSERT policy exists.
-- ============================================================

drop policy if exists "admin audit read"
on public.audit_logs;

create policy "admin audit read"
on public.audit_logs
for select
using (
  (select private.current_app_role())
    = 'admin'::public.app_role
);


-- ============================================================
-- 34. SETTINGS POLICIES
-- ============================================================

drop policy if exists "settings readable"
on public.clinic_settings;

create policy "settings readable"
on public.clinic_settings
for select
using (true);


drop policy if exists "admin settings write"
on public.clinic_settings;

create policy "admin settings write"
on public.clinic_settings
for all
using (
  (select private.current_app_role())
    = 'admin'::public.app_role
)
with check (
  (select private.current_app_role())
    = 'admin'::public.app_role
);