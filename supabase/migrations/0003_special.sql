-- ============================================================
-- Campus Care v2 — 0003 special
--
-- Pregnancy
-- Emergency requests
-- Questionnaire
-- Notifications
--
-- REQUIRES:
--   0001_core.sql
--   0002_clinical.sql
--
-- 0001 must provide:
--   private.current_app_role()
-- ============================================================


-- ============================================================
-- 1. PREGNANCY RECORDS
-- ============================================================

create table if not exists public.pregnancy_records (
  id uuid primary key default gen_random_uuid(),

  patient_id uuid not null
    references public.profiles(id)
    on delete cascade,

  appointment_id uuid
    references public.appointments(id)
    on delete set null,

  edd date,

  gestational_weeks integer,

  risk_level text not null default 'Low',

  next_visit date,

  notes text not null default '',

  created_at timestamptz not null default now(),

  constraint pregnancy_gestational_weeks_check
    check (
      gestational_weeks is null
      or (
        gestational_weeks >= 0
        and gestational_weeks <= 45
      )
    ),

  constraint pregnancy_risk_level_check
    check (
      risk_level in ('Low', 'High')
    )
);

create index if not exists pregnancy_patient_idx
  on public.pregnancy_records (
    patient_id,
    created_at desc
  );


-- ============================================================
-- 2. EMERGENCY REQUESTS
--
-- Anonymous users may submit emergencies.
--
-- Anonymous request:
--   patient_id should be NULL
--
-- Authenticated patient:
--   may identify themselves with patient_id = auth.uid()
--
-- Staff:
--   may file an emergency on behalf of a patient.
-- ============================================================

create table if not exists public.emergency_requests (
  id uuid primary key default gen_random_uuid(),

  patient_id uuid
    references public.profiles(id)
    on delete set null,

  reporter_name text not null default '',

  location text not null default '',

  phone text not null default '',

  description text not null default '',

  priority text not null default 'Urgent',

  status text not null default 'Open',

  created_at timestamptz not null default now(),

  constraint emergency_priority_check
    check (
      priority in ('Critical', 'Urgent', 'Normal')
    ),

  constraint emergency_status_check
    check (
      status in ('Open', 'Acknowledged', 'Resolved')
    )
);

create index if not exists emergency_status_idx
  on public.emergency_requests (
    status,
    created_at desc
  );


-- ============================================================
-- 3. QUESTIONNAIRE RESPONSES
-- ============================================================

create table if not exists public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),

  patient_id uuid not null
    references public.profiles(id)
    on delete cascade,

  appointment_id uuid
    references public.appointments(id)
    on delete set null,

  answers jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists questionnaire_patient_idx
  on public.questionnaire_responses (
    patient_id,
    created_at desc
  );


-- ============================================================
-- 4. NOTIFICATIONS
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  title text not null,

  body text not null default '',

  link text not null default '',

  is_read boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (
    user_id,
    created_at desc
  );


-- ============================================================
-- 5. PREGNANCY APPOINTMENT INTEGRITY
--
-- If appointment_id is supplied, the appointment must belong
-- to the same patient.
-- ============================================================

create or replace function public.validate_pregnancy_patient()
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
        'Pregnancy record patient does not match appointment patient.';
    end if;

  end if;

  return new;
end
$$;


drop trigger if exists pregnancy_patient_integrity
on public.pregnancy_records;

create trigger pregnancy_patient_integrity
before insert or update
on public.pregnancy_records
for each row
execute function public.validate_pregnancy_patient();


revoke all on function public.validate_pregnancy_patient()
from public, anon, authenticated;


-- ============================================================
-- 6. QUESTIONNAIRE APPOINTMENT INTEGRITY
--
-- Prevents a patient from attaching their questionnaire to
-- another patient's appointment.
-- ============================================================

create or replace function public.validate_questionnaire_patient()
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
        'Questionnaire patient does not match appointment patient.';
    end if;

  end if;

  return new;
end
$$;


drop trigger if exists questionnaire_patient_integrity
on public.questionnaire_responses;

create trigger questionnaire_patient_integrity
before insert or update
on public.questionnaire_responses
for each row
execute function public.validate_questionnaire_patient();


revoke all on function public.validate_questionnaire_patient()
from public, anon, authenticated;


-- ============================================================
-- 7. EMERGENCY PATIENT INTEGRITY
--
-- Allows:
--
--   Anonymous:
--     patient_id = NULL
--
--   Normal authenticated user:
--     patient_id = NULL
--     OR patient_id = own profile
--
--   Staff/admin:
--     may identify any patient.
--
-- This prevents a random authenticated patient from submitting
-- an emergency and attaching it to another patient's profile.
-- ============================================================

create or replace function public.validate_emergency_patient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_actor_role public.app_role;
begin

  v_actor := auth.uid();

  -- Anonymous submission.
  if v_actor is null then

    if new.patient_id is not null then
      raise exception
        'Anonymous emergency requests cannot specify patient_id.';
    end if;

    return new;
  end if;


  -- Authenticated submission.
  v_actor_role := private.current_app_role();


  -- Staff/admin may file on behalf of any patient.
  if v_actor_role in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'admin'::public.app_role
  ) then
    return new;
  end if;


  -- Ordinary users may only identify themselves.
  if new.patient_id is not null
     and new.patient_id <> v_actor
  then
    raise exception
      'You may only associate an emergency request with yourself.';
  end if;

  return new;
end
$$;


drop trigger if exists emergency_patient_integrity
on public.emergency_requests;

create trigger emergency_patient_integrity
before insert or update
on public.emergency_requests
for each row
execute function public.validate_emergency_patient();


revoke all on function public.validate_emergency_patient()
from public, anon, authenticated;


-- ============================================================
-- 8. NOTIFICATION UPDATE GUARD
--
-- A user may mark their notification as read/unread.
--
-- A normal user must NOT be able to rewrite:
--   user_id
--   title
--   body
--   link
--   created_at
--
-- Staff/system code can still manage notifications through
-- appropriate server-side paths.
-- ============================================================

create or replace function public.guard_notification_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role public.app_role;
begin

  v_actor_role := private.current_app_role();

  -- Staff/admin are allowed through this trigger.
  if v_actor_role in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'lab'::public.app_role,
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  ) then
    return new;
  end if;


  -- Normal user: notification contents are immutable.
  if new.user_id <> old.user_id
     or new.title <> old.title
     or new.body <> old.body
     or new.link <> old.link
     or new.created_at <> old.created_at
  then
    raise exception
      'Users may only change notification read state.';
  end if;


  return new;
end
$$;


drop trigger if exists notification_update_guard
on public.notifications;

create trigger notification_update_guard
before update
on public.notifications
for each row
execute function public.guard_notification_update();


revoke all on function public.guard_notification_update()
from public, anon, authenticated;


-- ============================================================
-- 9. RLS
-- ============================================================

alter table public.pregnancy_records
enable row level security;

alter table public.emergency_requests
enable row level security;

alter table public.questionnaire_responses
enable row level security;

alter table public.notifications
enable row level security;


-- ============================================================
-- 10. PREGNANCY POLICIES
-- ============================================================

drop policy if exists "own pregnancy read"
on public.pregnancy_records;

create policy "own pregnancy read"
on public.pregnancy_records
for select
to authenticated
using (
  (select auth.uid()) = patient_id
);


drop policy if exists "staff pregnancy full"
on public.pregnancy_records;

create policy "staff pregnancy full"
on public.pregnancy_records
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


-- ============================================================
-- 11. EMERGENCY POLICIES
-- ============================================================

-- Anyone may submit an emergency.
-- This deliberately includes anon.
drop policy if exists "anyone can file emergency"
on public.emergency_requests;

create policy "anyone can file emergency"
on public.emergency_requests
for insert
to anon, authenticated
with check (true);


drop policy if exists "own emergency read"
on public.emergency_requests;

create policy "own emergency read"
on public.emergency_requests
for select
to authenticated
using (
  (select auth.uid()) = patient_id
);


drop policy if exists "staff emergency full"
on public.emergency_requests;

create policy "staff emergency full"
on public.emergency_requests
for all
to authenticated
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
-- 12. QUESTIONNAIRE POLICIES
-- ============================================================

drop policy if exists "own questionnaire insert"
on public.questionnaire_responses;

create policy "own questionnaire insert"
on public.questionnaire_responses
for insert
to authenticated
with check (
  (select auth.uid()) = patient_id
);


drop policy if exists "own questionnaire read"
on public.questionnaire_responses;

create policy "own questionnaire read"
on public.questionnaire_responses
for select
to authenticated
using (
  (select auth.uid()) = patient_id
);


-- Clinical staff only.
-- Pharmacy does not need unrestricted access to questionnaire
-- responses merely to dispense medication.
drop policy if exists "staff questionnaire read"
on public.questionnaire_responses;

create policy "staff questionnaire read"
on public.questionnaire_responses
for select
to authenticated
using (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'lab'::public.app_role,
    'admin'::public.app_role
  )
);


-- ============================================================
-- 13. NOTIFICATION READ POLICY
-- ============================================================

drop policy if exists "own notifications read"
on public.notifications;

create policy "own notifications read"
on public.notifications
for select
to authenticated
using (
  (select auth.uid()) = user_id
);


-- ============================================================
-- 14. NOTIFICATION UPDATE POLICY
--
-- Patients can change read state on their own notifications.
-- The trigger above prevents changing the contents.
-- ============================================================

drop policy if exists "own notifications update"
on public.notifications;

create policy "own notifications update"
on public.notifications
for update
to authenticated
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
);


-- ============================================================
-- 15. NOTIFICATION INSERT POLICY
--
-- Preserve the original behavior:
--
--   - A user may create a notification for themselves.
--   - Staff may create one for anyone.
--
-- The trigger/policy combination prevents a normal user from
-- creating notifications for somebody else.
-- ============================================================

drop policy if exists "notifications insert"
on public.notifications;

create policy "notifications insert"
on public.notifications
for insert
to authenticated
with check (
  (select auth.uid()) = user_id

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