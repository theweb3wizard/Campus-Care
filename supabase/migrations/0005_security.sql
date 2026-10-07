-- ============================================================
-- Campus Care v2 — 0005 security hardening
--
-- Run AFTER:
--   0001_core.sql
--   0002_clinical.sql
--   0003_special.sql
--   0004_rpc.sql
--
-- Fresh DBs only.
--
-- This migration:
--   - hardens SECURITY DEFINER functions
--   - closes claim/account takeover paths
--   - stops audit-log forgery
--   - stops profile tampering
--   - stops appointment tampering
--   - removes sensitive doctor-profile exposure
--   - hardens anonymous emergency submission
--   - makes queue/check-in authoritative
--   - fixes clinic timezone handling
--   - prevents pharmacy from rewriting prescriptions
--   - ensures dispensing is atomic and happens once
--   - tightens notification creation
--   - adds several cross-row integrity checks
-- ============================================================


-- ============================================================
-- 0. DEFAULT FUNCTION PRIVILEGES
--
-- New public functions should NOT automatically be callable
-- by every Supabase role.
--
-- Individual functions below explicitly receive the grants
-- they need.
-- ============================================================

alter default privileges in schema public
revoke execute on functions from public;

alter default privileges in schema public
revoke execute on functions from anon, authenticated;


-- ============================================================
-- 1. RETIRE SUPERSEDED FUNCTION SIGNATURES
-- ============================================================

drop function if exists public.booked_slots(uuid, date);

drop function if exists public.claim_staff(text);

drop function if exists public.claim_student(text);


-- ============================================================
-- 2. STAFF INVITES: EMAIL
-- ============================================================

alter table public.staff_invites
add column if not exists email text not null default '';


-- Existing/future invite emails cannot be blank.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.staff_invites'::regclass
      and conname = 'staff_invites_email_nonempty'
  ) then

    alter table public.staff_invites
    add constraint staff_invites_email_nonempty
    check (length(trim(email)) > 0);

  end if;
end
$$;


-- ============================================================
-- 3. VERIFY STUDENT
--
-- Publicly callable because this is the anonymous registration
-- lookup.
--
-- Only these fields leave the database:
--   reg_number
--   full_name
--   is_claimed
--
-- No email / faculty / department / phone / profile_id.
-- ============================================================

create or replace function public.verify_student(
  p_reg text
)
returns table (
  reg_number text,
  full_name text,
  is_claimed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.reg_number,
    s.full_name,
    s.is_claimed
  from public.students s
  where public.norm_id(s.reg_number)
        = public.norm_id(p_reg);
$$;


revoke all
on function public.verify_student(text)
from public, anon, authenticated;

grant execute
on function public.verify_student(text)
to anon, authenticated;


-- ============================================================
-- 4. ID-FIRST LOGIN EMAIL LOOKUP
--
-- Security-definer because auth.users is protected.
--
-- This remains intentionally callable before login.
-- The application invariant must remain:
-- auth.users.email contains ONLY synthetic emails.
-- ============================================================

create or replace function public.email_for_login(
  p_login_id text
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from auth.users u
  join public.profiles p
    on p.id = u.id
  where public.norm_id(p.login_id)
        = public.norm_id(p_login_id);
$$;


revoke all
on function public.email_for_login(text)
from public, anon, authenticated;

grant execute
on function public.email_for_login(text)
to anon, authenticated;


-- ============================================================
-- 5. STUDENT CLAIM
--
-- Security requirements:
--   - authenticated account required
--   - target row locked
--   - account profile locked
--   - account must be a patient
--   - account login_id must match registration number
--   - email must match registry when present
--   - supplied email must be non-empty
--   - profile name must match registry name
--   - second student claim is blocked
--   - concurrent claims from the same account are serialized
-- ============================================================

create or replace function public.claim_student(
  p_reg text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_row public.students%rowtype;

  v_name text;
  v_role public.app_role;
  v_login_id text;

  v_email text;
  v_registry_email text;
begin

  v_uid := auth.uid();

  if v_uid is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required.'
    );
  end if;


  v_email := nullif(
    lower(trim(coalesce(p_email, ''))),
    ''
  );

  if v_email is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Email is required.'
    );
  end if;


  -- Lock the profile first.
  --
  -- This prevents two simultaneous requests from the SAME
  -- account claiming two different student records.
  select
    p.full_name,
    p.role,
    p.login_id
  into
    v_name,
    v_role,
    v_login_id
  from public.profiles p
  where p.id = v_uid
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'Account not ready. Log out and log in again.'
    );
  end if;


  -- A patient account can only have one student registry row.
  if exists (
    select 1
    from public.students s
    where s.profile_id = v_uid
  ) then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account already claimed a record. Log in instead.'
    );
  end if;


  if v_role <> 'patient'::public.app_role then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account cannot be used for a student claim.'
    );
  end if;


  -- The login ID is the first identity binding.
  if public.norm_id(v_login_id)
     <> public.norm_id(p_reg)
  then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account is not registered with that ID.'
    );
  end if;


  -- Lock the specific registry row.
  select *
  into v_row
  from public.students s
  where public.norm_id(s.reg_number)
        = public.norm_id(p_reg)
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'Reg number not found. Check it or see reception.'
    );
  end if;


  if v_row.is_claimed
     or v_row.profile_id is not null
  then
    return jsonb_build_object(
      'success', false,
      'error',
      'This reg number is already claimed. See reception if this is you.'
    );
  end if;


  v_registry_email := nullif(
    lower(trim(v_row.institutional_email)),
    ''
  );


  if v_registry_email is not null
     and v_registry_email <> v_email
  then
    return jsonb_build_object(
      'success', false,
      'error',
      'Email does not match our record for this reg number. See reception.'
    );
  end if;


  if public.norm_id(v_name)
     <> public.norm_id(v_row.full_name)
  then
    return jsonb_build_object(
      'success', false,
      'error',
      'Name does not match our record for this reg number. See reception.'
    );
  end if;


  perform set_config(
    'app.claim_ctx',
    'on',
    true
  );


  update public.students
  set
    is_claimed = true,
    profile_id = v_uid,
    institutional_email =
      coalesce(
        nullif(trim(institutional_email), ''),
        v_email
      )
  where id = v_row.id;


  update public.profiles
  set
    role = 'patient'::public.app_role,
    verified = (v_registry_email is not null),
    updated_at = now()
  where id = v_uid;


  perform public.log_audit(
    'student.claim',
    'students',
    v_row.id::text
  );


  return jsonb_build_object(
    'success', true
  );

end
$$;


revoke all
on function public.claim_student(text, text)
from public, anon, authenticated;

grant execute
on function public.claim_student(text, text)
to authenticated;


-- ============================================================
-- 6. OPEN STUDENT SIGNUP
-- ============================================================

create or replace function public.register_student(
  p_reg text,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;

  v_open text;

  v_reg text;
  v_name text;

  v_role public.app_role;
  v_login_id text;
begin

  v_uid := auth.uid();

  if v_uid is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required.'
    );
  end if;


  v_reg := public.norm_id(p_reg);
  v_name := trim(coalesce(p_name, ''));


  if v_reg = '' then
    return jsonb_build_object(
      'success', false,
      'error', 'Registration number is required.'
    );
  end if;


  if v_name = '' then
    return jsonb_build_object(
      'success', false,
      'error', 'Full name is required.'
    );
  end if;


  select cs.value
  into v_open
  from public.clinic_settings cs
  where cs.key = 'allow_open_signup';


  if coalesce(lower(trim(v_open)), 'true') <> 'true' then
    return jsonb_build_object(
      'success', false,
      'error',
      'New signups need reception. Come to the clinic with your ID card.'
    );
  end if;


  -- Lock the profile so one account cannot race two registrations.
  select
    p.role,
    p.login_id
  into
    v_role,
    v_login_id
  from public.profiles p
  where p.id = v_uid
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'Account not ready. Log out and log in again.'
    );
  end if;


  if v_role <> 'patient'::public.app_role then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account cannot be used for student registration.'
    );
  end if;


  if public.norm_id(v_login_id) <> v_reg then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account is not registered with that ID.'
    );
  end if;


  -- Serialize registrations for the same normalized reg number.
  perform pg_advisory_xact_lock(
    hashtextextended(
      'student-register-' || v_reg,
      0
    )
  );


  if exists (
    select 1
    from public.students s
    where public.norm_id(s.reg_number) = v_reg
  ) then
    return jsonb_build_object(
      'success', false,
      'error',
      'This reg number is in our records. Claim it instead of registering.'
    );
  end if;


  if exists (
    select 1
    from public.students s
    where s.profile_id = v_uid
  ) then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account already has a student record.'
    );
  end if;


  perform set_config(
    'app.claim_ctx',
    'on',
    true
  );


  insert into public.students (
    reg_number,
    full_name,
    is_claimed,
    auto_created,
    profile_id
  )
  values (
    v_reg,
    v_name,
    true,
    true,
    v_uid
  );


  update public.profiles
  set
    role = 'patient'::public.app_role,
    full_name = v_name,
    verified = false,
    updated_at = now()
  where id = v_uid;


  perform public.log_audit(
    'student.register',
    'students',
    v_reg
  );


  return jsonb_build_object(
    'success', true,
    'verified', false
  );

end
$$;


revoke all
on function public.register_student(text, text)
from public, anon, authenticated;

grant execute
on function public.register_student(text, text)
to authenticated;


-- ============================================================
-- 7. STAFF CLAIM
--
-- IMPORTANT FIX:
-- The original 0005 code claimed to compare name + email,
-- but never compared v_name with the invite's full_name.
--
-- We now require:
--   - authenticated account
--   - patient account
--   - profile.login_id = staff_id
--   - profile.full_name = invite.full_name
--   - supplied email = invite.email
--   - invite not already claimed
--   - account not already a student
-- ============================================================

create or replace function public.claim_staff(
  p_staff_id text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;

  v_row public.staff_invites%rowtype;

  v_name text;
  v_role public.app_role;
  v_login_id text;

  v_email text;
  v_invite_email text;
begin

  v_uid := auth.uid();

  if v_uid is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required.'
    );
  end if;


  v_email := nullif(
    lower(trim(coalesce(p_email, ''))),
    ''
  );


  if v_email is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Email is required.'
    );
  end if;


  -- Lock account profile.
  select
    p.full_name,
    p.role,
    p.login_id
  into
    v_name,
    v_role,
    v_login_id
  from public.profiles p
  where p.id = v_uid
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'Account not ready. Log out and log in again.'
    );
  end if;


  if v_role <> 'patient'::public.app_role then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account cannot claim another staff role.'
    );
  end if;


  if public.norm_id(v_login_id)
     <> public.norm_id(p_staff_id)
  then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account is not registered with that staff ID.'
    );
  end if;


  select *
  into v_row
  from public.staff_invites si
  where public.norm_id(si.staff_id)
        = public.norm_id(p_staff_id)
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'Staff ID not found. Ask admin to add you first.'
    );
  end if;


  if v_row.is_claimed
     or v_row.profile_id is not null
  then
    return jsonb_build_object(
      'success', false,
      'error',
      'This staff ID is already claimed. See admin.'
    );
  end if;


  v_invite_email := nullif(
    lower(trim(v_row.email)),
    ''
  );


  if v_invite_email is null
     or v_invite_email <> v_email
  then
    return jsonb_build_object(
      'success', false,
      'error',
      'Email does not match our record for this staff ID. See admin.'
    );
  end if;


  -- THIS was missing from the original 0005.
  if public.norm_id(v_name)
     <> public.norm_id(v_row.full_name)
  then
    return jsonb_build_object(
      'success', false,
      'error',
      'Name does not match our record for this staff ID. See admin.'
    );
  end if;


  perform set_config(
    'app.claim_ctx',
    'on',
    true
  );


  update public.staff_invites
  set
    is_claimed = true,
    profile_id = v_uid
  where id = v_row.id;


  update public.profiles
  set
    role = v_row.role,
    verified = true,
    full_name = v_row.full_name,
    updated_at = now()
  where id = v_uid;


  perform public.log_audit(
    'staff.claim',
    'staff_invites',
    v_row.id::text
  );


  return jsonb_build_object(
    'success', true,
    'role', v_row.role::text
  );

end
$$;


revoke all
on function public.claim_staff(text, text)
from public, anon, authenticated;

grant execute
on function public.claim_staff(text, text)
to authenticated;


-- ============================================================
-- 8. REGISTRY / INVITE RLS
--
-- Registry:
--   - user may read their own row
--   - reception/admin may manage/read registry
--
-- We intentionally removed broad doctor/nurse registry access.
-- ============================================================

drop policy if exists "registry readable"
on public.students;

create policy "registry readable"
on public.students
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or
  (select private.current_app_role())
    in (
      'receptionist'::public.app_role,
      'admin'::public.app_role
    )
);


drop policy if exists "staff registry write"
on public.students;

create policy "staff registry write"
on public.students
for all
to authenticated
using (
  (select private.current_app_role())
    in (
      'receptionist'::public.app_role,
      'admin'::public.app_role
    )
)
with check (
  (select private.current_app_role())
    in (
      'receptionist'::public.app_role,
      'admin'::public.app_role
    )
);


drop policy if exists "invites readable"
on public.staff_invites;

create policy "invites readable"
on public.staff_invites
for select
to authenticated
using (
  (select private.current_app_role())
    = 'admin'::public.app_role
);


drop policy if exists "admin invites write"
on public.staff_invites;

create policy "admin invites write"
on public.staff_invites
for all
to authenticated
using (
  (select private.current_app_role())
    = 'admin'::public.app_role
)
with check (
  (select private.current_app_role())
    = 'admin'::public.app_role
);


-- ============================================================
-- 9. SAFE ACTIVE-DOCTOR LOOKUP
--
-- DO NOT give patients SELECT access to profiles just to retrieve
-- doctor names. That would expose every column on the profile.
--
-- Instead, expose a deliberately narrow RPC.
-- ============================================================

drop policy if exists "patients read active doctor names"
on public.profiles;


create or replace function public.active_doctors()
returns table (
  id uuid,
  full_name text,
  specialty text,
  room text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    p.full_name,
    d.specialty,
    d.room
  from public.doctors d
  join public.profiles p
    on p.id = d.id
  where d.is_active = true
    and p.role = 'doctor'::public.app_role
  order by p.full_name;
$$;


revoke all
on function public.active_doctors()
from public, anon, authenticated;

grant execute
on function public.active_doctors()
to authenticated;


-- ============================================================
-- 10. PROFILE TAMPER PROTECTION
--
-- Patient/staff self-service:
--   full_name
--   phone
--
-- Reception/admin:
--   may update operational profile fields
--
-- Only admin:
--   may change role
--
-- Reception/admin:
--   may verify / issue cards
--
-- Login ID:
--   admin only
--
-- id and created_at:
--   immutable
--
-- updated_at:
--   database controls it
-- ============================================================

create or replace function public.prevent_profile_tamper()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.app_role;
  claim_on boolean;
begin

  claim_on :=
    coalesce(
      pg_catalog.current_setting(
        'app.claim_ctx',
        true
      ),
      ''
    ) = 'on';


  if new.id is distinct from old.id then
    raise exception 'Profile ID cannot be changed.';
  end if;


  if new.created_at is distinct from old.created_at then
    raise exception 'Profile creation time cannot be changed.';
  end if;


  select p.role
    into actor_role
  from public.profiles p
  where p.id = (select auth.uid());


  -- Claim RPCs are explicitly allowed to assign their new role.
  if new.role is distinct from old.role
     and not claim_on
     and actor_role is distinct from 'admin'::public.app_role
  then
    raise exception 'Only admin can change roles.';
  end if;


  -- Verification/card changes.
  if (
      new.verified is distinct from old.verified
      or new.card_number is distinct from old.card_number
     )
     and not claim_on
     and actor_role not in (
       'receptionist'::public.app_role,
       'admin'::public.app_role
     )
  then
    raise exception
      'Only reception or admin can verify patients or issue cards.';
  end if;


  -- Login ID is a credential identifier.
  -- Only admin or dedicated claim logic may change it.
  if new.login_id is distinct from old.login_id
     and not claim_on
     and actor_role is distinct from 'admin'::public.app_role
  then
    raise exception
      'Only admin can change login IDs.';
  end if;


  -- Ordinary non-admin users may change ONLY:
  --   full_name
  --   phone
  --   updated_at
  if actor_role is distinct from 'admin'::public.app_role
     and actor_role is distinct from 'receptionist'::public.app_role
     and not claim_on
  then

    if new.full_name is distinct from old.full_name
       or new.phone is distinct from old.phone
    then
      null;
    end if;


    -- All other protected columns are blocked.
    if new.role is distinct from old.role
       or new.card_number is distinct from old.card_number
       or new.verified is distinct from old.verified
       or new.login_id is distinct from old.login_id
       or new.created_at is distinct from old.created_at
    then
      raise exception
        'You may only update your name and phone number.';
    end if;

  end if;


  -- Reception is not allowed to silently rewrite the credential
  -- or ownership identity of another profile.
  if actor_role = 'receptionist'::public.app_role
     and not claim_on
  then

    if new.login_id is distinct from old.login_id then
      raise exception
        'Reception cannot change login IDs.';
    end if;

  end if;


  new.updated_at := now();

  return new;
end
$$;


drop trigger if exists profiles_no_role_escalation
on public.profiles;

drop trigger if exists profiles_no_self_promotion
on public.profiles;

create trigger profiles_no_self_promotion
before update on public.profiles
for each row
execute function public.prevent_profile_tamper();


revoke all
on function public.prevent_profile_tamper()
from public, anon, authenticated;


-- ============================================================
-- 11. APPOINTMENT INSERT POLICY
--
-- Patients may create only:
--   Pending
--   future appointments
--   for themselves
-- ============================================================

drop policy if exists "own appointments insert"
on public.appointments;

create policy "own appointments insert"
on public.appointments
for insert
to authenticated
with check (
  (select auth.uid()) = patient_id
  and status = 'Pending'::public.appt_status
  and starts_at > now()
);


-- ============================================================
-- 12. APPOINTMENT INSERT INTEGRITY
--
-- Patient-created bookings must use active doctors.
-- ============================================================

create or replace function public.validate_patient_appointment_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.app_role;
  doctor_active boolean;
begin

  actor_role := private.current_app_role();


  if actor_role = 'patient'::public.app_role then

    if new.patient_id <> (select auth.uid()) then
      raise exception
        'Patients can only create appointments for themselves.';
    end if;


    select d.is_active
      into doctor_active
    from public.doctors d
    where d.id = new.doctor_id;


    if doctor_active is distinct from true then
      raise exception
        'The selected doctor is not currently available.';
    end if;


    if new.status <> 'Pending'::public.appt_status then
      raise exception
        'Patient-created appointments must start as Pending.';
    end if;


    if new.starts_at <= now() then
      raise exception
        'Appointment must be in the future.';
    end if;

  end if;


  return new;
end
$$;


drop trigger if exists appointments_patient_insert_guard
on public.appointments;

create trigger appointments_patient_insert_guard
before insert on public.appointments
for each row
execute function public.validate_patient_appointment_insert();


revoke all
on function public.validate_patient_appointment_insert()
from public, anon, authenticated;


-- ============================================================
-- 13. APPOINTMENT UPDATE PROTECTION
--
-- A patient can ONLY change status.
--
-- Patient flow:
--   Pending/Confirmed -> Cancelled
--   Pending/Confirmed -> Rescheduled
--
-- Actual rescheduling should create a new appointment and then
-- mark the old appointment Rescheduled.
-- ============================================================

create or replace function public.prevent_appointment_tamper()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.app_role;
begin

  actor_role := private.current_app_role();


  -- Staff/admin are governed by staff RLS.
  if actor_role in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'lab'::public.app_role,
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  ) then
    return new;
  end if;


  -- A normal patient may only act on their own appointment.
  if new.patient_id is distinct from old.patient_id
     or old.patient_id <> (select auth.uid())
  then
    raise exception
      'You can only change your own appointment.';
  end if;


  -- Everything except status must remain identical.
  if new.id is distinct from old.id
     or new.doctor_id is distinct from old.doctor_id
     or new.starts_at is distinct from old.starts_at
     or new.ends_at is distinct from old.ends_at
     or new.service is distinct from old.service
     or new.reference is distinct from old.reference
     or new.notes is distinct from old.notes
     or new.created_at is distinct from old.created_at
  then
    raise exception
      'Patients may only cancel or mark an appointment as rescheduled.';
  end if;


  if old.status not in (
      'Pending'::public.appt_status,
      'Confirmed'::public.appt_status
     )
  then
    raise exception
      'This appointment can no longer be changed.';
  end if;


  if new.status not in (
      'Cancelled'::public.appt_status,
      'Rescheduled'::public.appt_status
     )
  then
    raise exception
      'Patients may only cancel or reschedule an appointment.';
  end if;


  return new;
end
$$;


drop trigger if exists appointments_no_tamper
on public.appointments;

create trigger appointments_no_tamper
before update on public.appointments
for each row
execute function public.prevent_appointment_tamper();


revoke all
on function public.prevent_appointment_tamper()
from public, anon, authenticated;


-- ============================================================
-- 14. CLINIC FILE ISSUANCE
-- Reception/admin only.
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
begin

  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;


  if private.current_app_role() not in (
    'receptionist'::public.app_role,
    'admin'::public.app_role
  ) then
    raise exception 'Staff only.';
  end if;


  if not exists (
    select 1
    from public.profiles p
    where p.id = p_profile
  ) then
    raise exception 'Patient profile not found.';
  end if;


  select
    'CC-' ||
    to_char(now(), 'YYYY') ||
    '-' ||
    lpad(
      nextval('public.clinic_file_seq')::text,
      4,
      '0'
    )
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


  select cf.file_number
  into v_num
  from public.clinic_files cf
  where cf.profile_id = p_profile;


  return v_num;

end
$$;


revoke all
on function public.issue_clinic_file(uuid)
from public, anon, authenticated;

grant execute
on function public.issue_clinic_file(uuid)
to authenticated;


-- ============================================================
-- 15. AUDIT LOG
--
-- CRITICAL:
-- Clients must NOT be able to execute log_audit().
--
-- Internal SECURITY DEFINER functions can still invoke it as
-- the function owner.
-- ============================================================

revoke all
on function public.log_audit(text, text, text)
from public, anon, authenticated;


-- ============================================================
-- 16. EMERGENCY SANITIZATION
--
-- Anonymous:
--   patient_id = NULL
--   status = Open
--   priority = Urgent
--
-- Ordinary authenticated users:
--   patient_id = their own account
--   status = Open
--
-- Staff:
--   may manage records normally through staff RLS.
--
-- Fields are trimmed and minimum input is enforced.
-- ============================================================

create or replace function public.sanitize_emergency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_role public.app_role;
begin

  v_uid := auth.uid();


  new.reporter_name :=
    trim(coalesce(new.reporter_name, ''));

  new.location :=
    trim(coalesce(new.location, ''));

  new.phone :=
    trim(coalesce(new.phone, ''));

  new.description :=
    trim(coalesce(new.description, ''));


  if char_length(new.description) < 10
     or char_length(new.location) < 3
     or char_length(new.phone) < 7
  then
    raise exception
      'Describe the emergency, location, and a reachable phone number.';
  end if;


  if v_uid is null then

    new.patient_id := null;
    new.status := 'Open';
    new.priority := 'Urgent';

  else

    v_role := private.current_app_role();


    if v_role = 'patient'::public.app_role then
      new.patient_id := v_uid;
      new.status := 'Open';
    end if;

  end if;


  return new;
end
$$;


drop trigger if exists emergency_sanitize
on public.emergency_requests;

create trigger emergency_sanitize
before insert on public.emergency_requests
for each row
execute function public.sanitize_emergency();


revoke all
on function public.sanitize_emergency()
from public, anon, authenticated;


-- ============================================================
-- 17. EMERGENCY INSERT POLICY
-- ============================================================

drop policy if exists "anyone can file emergency"
on public.emergency_requests;

create policy "anyone can file emergency"
on public.emergency_requests
for insert
to anon, authenticated
with check (true);


-- ============================================================
-- 18. SAFE BOOKED-SLOTS RPC
--
-- Client supplies an explicit UTC window.
--
-- Example:
--   p_start = 2026-10-07 00:00:00+00
--   p_end   = 2026-10-08 00:00:00+00
--
-- No implicit date/timezone conversion is performed here.
-- ============================================================

create or replace function public.booked_slots(
  p_doctor uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns setof timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
begin

  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;


  if p_start is null
     or p_end is null
     or p_end <= p_start
  then
    raise exception 'Invalid availability window.';
  end if;


  return query
  select a.starts_at
  from public.appointments a
  where a.doctor_id = p_doctor
    and a.status in (
      'Pending'::public.appt_status,
      'Confirmed'::public.appt_status
    )
    and a.starts_at >= p_start
    and a.starts_at < p_end
  order by a.starts_at;

end
$$;


revoke all
on function public.booked_slots(uuid, timestamptz, timestamptz)
from public, anon, authenticated;

grant execute
on function public.booked_slots(uuid, timestamptz, timestamptz)
to authenticated;


-- ============================================================
-- 19. CLINIC TIMEZONE
--
-- FUD / Nigeria = Africa/Lagos.
--
-- The queue day should be the clinic's local day, not an
-- accidental UTC/session day.
-- ============================================================

insert into public.clinic_settings (
  key,
  value
)
values (
  'clinic_timezone',
  'Africa/Lagos'
)
on conflict (key) do nothing;


-- ============================================================
-- 20. ATOMIC CHECK-IN
--
-- Enhancements over 0004:
--
--   - hardened SECURITY DEFINER
--   - uses current_app_role()
--   - uses clinic local date
--   - validates patient profile exists
--   - validates patient role
--   - validates appointment ownership
--   - validates appointment is TODAY at the clinic
--   - validates doctor is active
--   - enforces max queue
--   - creates visit + queue atomically
--
-- Queue/visit rows are protected from direct staff writes later
-- in this migration.
-- ============================================================

create or replace function public.check_in_patient(
  p_patient uuid,
  p_appointment uuid default null,
  p_doctor uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_actor_role public.app_role;

  v_timezone text;
  v_day date;

  v_patient_role public.app_role;

  v_visit uuid;
  v_num integer := 0;

  v_queue_count integer;
  v_max_queue integer;

  v_tries integer := 0;

  v_appt_patient uuid;
  v_appt_doctor uuid;
  v_appt_status public.appt_status;
  v_appt_starts_at timestamptz;

  v_doctor_id uuid;
  v_doctor_active boolean;
begin

  v_uid := auth.uid();

  if v_uid is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required.'
    );
  end if;


  v_actor_role := private.current_app_role();


  if v_actor_role not in (
    'receptionist'::public.app_role,
    'admin'::public.app_role,
    'doctor'::public.app_role,
    'nurse'::public.app_role
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Staff only.'
    );
  end if;


  select coalesce(
    nullif(trim(cs.value), ''),
    'Africa/Lagos'
  )
  into v_timezone
  from public.clinic_settings cs
  where cs.key = 'clinic_timezone';


  v_timezone := coalesce(
    v_timezone,
    'Africa/Lagos'
  );


  v_day :=
    pg_catalog.timezone(
      v_timezone,
      now()
    )::date;


  -- Serialize today's queue allocation.
  perform pg_advisory_xact_lock(
    hashtextextended(
      'queue-' || v_day::text,
      0
    )
  );


  -- ----------------------------------------------------------
  -- Validate patient.
  -- ----------------------------------------------------------

  select p.role
  into v_patient_role
  from public.profiles p
  where p.id = p_patient;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Patient profile not found.'
    );
  end if;


  if v_patient_role <> 'patient'::public.app_role then
    return jsonb_build_object(
      'success', false,
      'error',
      'The selected profile is not a patient account.'
    );
  end if;


  -- ----------------------------------------------------------
  -- Validate appointment if one exists.
  -- ----------------------------------------------------------

  if p_appointment is not null then

    select
      a.patient_id,
      a.doctor_id,
      a.status,
      a.starts_at
    into
      v_appt_patient,
      v_appt_doctor,
      v_appt_status,
      v_appt_starts_at
    from public.appointments a
    where a.id = p_appointment
    for update;


    if not found then
      return jsonb_build_object(
        'success', false,
        'error', 'Appointment not found.'
      );
    end if;


    if v_appt_patient <> p_patient then
      return jsonb_build_object(
        'success', false,
        'error',
        'Appointment does not belong to this patient.'
      );
    end if;


    if v_appt_status not in (
      'Pending'::public.appt_status,
      'Confirmed'::public.appt_status
    ) then
      return jsonb_build_object(
        'success', false,
        'error',
        'This appointment cannot be checked in.'
      );
    end if;


    if pg_catalog.timezone(
         v_timezone,
         v_appt_starts_at
       )::date <> v_day
    then
      return jsonb_build_object(
        'success', false,
        'error',
        'This appointment is not scheduled for today.'
      );
    end if;


    if p_doctor is not null
       and p_doctor <> v_appt_doctor
    then
      return jsonb_build_object(
        'success', false,
        'error',
        'Selected doctor does not match the appointment.'
      );
    end if;


    v_doctor_id := coalesce(
      p_doctor,
      v_appt_doctor
    );

  else

    v_doctor_id := p_doctor;

  end if;


  -- ----------------------------------------------------------
  -- Validate doctor.
  -- ----------------------------------------------------------

  if v_doctor_id is not null then

    select d.is_active
    into v_doctor_active
    from public.doctors d
    where d.id = v_doctor_id
      and exists (
        select 1
        from public.profiles p
        where p.id = d.id
          and p.role = 'doctor'::public.app_role
      );


    if not found then
      return jsonb_build_object(
        'success', false,
        'error', 'Doctor not found.'
      );
    end if;


    if not v_doctor_active then
      return jsonb_build_object(
        'success', false,
        'error', 'Selected doctor is not active.'
      );
    end if;

  end if;


  -- ----------------------------------------------------------
  -- One active visit per patient/day.
  -- Unique index is final backstop.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.visits v
    where v.patient_id = p_patient
      and v.visit_date = v_day
      and v.status in (
        'checked_in'::public.visit_status,
        'in_consultation'::public.visit_status,
        'awaiting_pharmacy'::public.visit_status
      )
  ) then
    return jsonb_build_object(
      'success', false,
      'error',
      'Patient already has an active visit today.'
    );
  end if;


  -- ----------------------------------------------------------
  -- Queue capacity.
  -- ----------------------------------------------------------

  select
    nullif(trim(cs.value), '')::integer
  into v_max_queue
  from public.clinic_settings cs
  where cs.key = 'max_daily_queue';


  v_max_queue := coalesce(
    v_max_queue,
    200
  );


  select count(*)
  into v_queue_count
  from public.queue_entries q
  where q.queue_date = v_day;


  if v_queue_count >= v_max_queue then
    return jsonb_build_object(
      'success', false,
      'error',
      'The clinic has reached today''s queue capacity.'
    );
  end if;


  -- ----------------------------------------------------------
  -- Create visit.
  -- ----------------------------------------------------------

  begin

    insert into public.visits (
      patient_id,
      appointment_id,
      checked_in_by,
      status,
      visit_date
    )
    values (
      p_patient,
      p_appointment,
      v_uid,
      'checked_in'::public.visit_status,
      v_day
    )
    returning id
    into v_visit;

  exception
    when unique_violation then

      return jsonb_build_object(
        'success', false,
        'error',
        'Patient already has an active visit today.'
      );

  end;


  -- ----------------------------------------------------------
  -- Atomic queue numbering.
  -- ----------------------------------------------------------

  loop

    begin

      select
        coalesce(max(q.queue_number), 0) + 1
      into v_num
      from public.queue_entries q
      where q.queue_date = v_day;


      insert into public.queue_entries (
        visit_id,
        queue_number,
        queue_date,
        status,
        assigned_doctor_id
      )
      values (
        v_visit,
        v_num,
        v_day,
        'waiting'::public.queue_status,
        v_doctor_id
      );


      exit;

    exception
      when unique_violation then

        v_tries := v_tries + 1;

        if v_tries >= 3 then
          raise;
        end if;

    end;

  end loop;


  if p_appointment is not null then

    update public.appointments
    set status = 'Confirmed'::public.appt_status
    where id = p_appointment
      and status = 'Pending'::public.appt_status;

  end if;


  perform public.log_audit(
    'visit.check_in',
    'visits',
    v_visit::text
  );


  return jsonb_build_object(
    'success', true,
    'visit_id', v_visit,
    'queue_number', v_num
  );

end
$$;


revoke all
on function public.check_in_patient(uuid, uuid, uuid)
from public, anon, authenticated;

grant execute
on function public.check_in_patient(uuid, uuid, uuid)
to authenticated;


-- ============================================================
-- 21. QUEUE TRANSITION RPC
--
-- Uses private.current_app_role().
-- Locks BOTH queue + visit rows.
-- Completes visit only after pharmacy work is done.
-- ============================================================

create or replace function public.queue_transition(
  p_queue uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q public.queue_entries%rowtype;
  v_visit public.visits%rowtype;

  v_actor_role public.app_role;
  v_actor_doctor uuid;

  v_action text;

  v_has_pending_meds boolean := false;
begin

  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required.'
    );
  end if;


  v_actor_role := private.current_app_role();
  v_action := lower(trim(coalesce(p_action, '')));


  if v_actor_role not in (
    'receptionist'::public.app_role,
    'admin'::public.app_role,
    'doctor'::public.app_role,
    'nurse'::public.app_role
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Staff only.'
    );
  end if;


  select *
  into v_q
  from public.queue_entries q
  where q.id = p_queue
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Queue entry not found.'
    );
  end if;


  select *
  into v_visit
  from public.visits v
  where v.id = v_q.visit_id
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'Visit associated with queue entry was not found.'
    );
  end if;


  -- ----------------------------------------------------------
  -- CALL
  -- ----------------------------------------------------------

  if v_action = 'call'
     and v_q.status = 'waiting'::public.queue_status
  then

    if v_visit.status <> 'checked_in'::public.visit_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Queue and visit state are inconsistent.'
      );
    end if;


    update public.queue_entries
    set status = 'called'::public.queue_status
    where id = p_queue;


  -- ----------------------------------------------------------
  -- SKIP
  -- ----------------------------------------------------------

  elsif v_action = 'skip'
        and v_q.status in (
          'waiting'::public.queue_status,
          'called'::public.queue_status
        )
  then

    if v_visit.status <> 'checked_in'::public.visit_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Queue and visit state are inconsistent.'
      );
    end if;


    update public.queue_entries
    set status = 'skipped'::public.queue_status
    where id = p_queue;


  -- ----------------------------------------------------------
  -- RECALL
  -- ----------------------------------------------------------

  elsif v_action = 'recall'
        and v_q.status = 'skipped'::public.queue_status
  then

    if v_visit.status <> 'checked_in'::public.visit_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Queue and visit state are inconsistent.'
      );
    end if;


    update public.queue_entries
    set status = 'waiting'::public.queue_status
    where id = p_queue;


  -- ----------------------------------------------------------
  -- START
  -- ----------------------------------------------------------

  elsif v_action = 'start'
        and v_q.status in (
          'waiting'::public.queue_status,
          'called'::public.queue_status
        )
  then

    if v_visit.status <> 'checked_in'::public.visit_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Visit is not ready to enter consultation.'
      );
    end if;


    if v_actor_role = 'doctor'::public.app_role then

      select d.id
      into v_actor_doctor
      from public.doctors d
      where d.id = auth.uid()
        and d.is_active = true;


      if v_actor_doctor is null then
        return jsonb_build_object(
          'success', false,
          'error',
          'Your account is not registered as an active doctor.'
        );
      end if;


      if v_q.assigned_doctor_id is not null
         and v_q.assigned_doctor_id <> v_actor_doctor
      then
        return jsonb_build_object(
          'success', false,
          'error',
          'This patient is assigned to another doctor.'
        );
      end if;

    end if;


    update public.queue_entries
    set
      status = 'in_consultation'::public.queue_status,
      assigned_doctor_id =
        coalesce(
          assigned_doctor_id,
          v_actor_doctor
        )
    where id = p_queue;


    update public.visits
    set status = 'in_consultation'::public.visit_status
    where id = v_q.visit_id;


  -- ----------------------------------------------------------
  -- COMPLETE
  -- ----------------------------------------------------------

  elsif v_action = 'complete'
        and v_q.status = 'in_consultation'::public.queue_status
  then

    if v_visit.status <> 'in_consultation'::public.visit_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Visit is not currently in consultation.'
      );
    end if;


    select exists (
      select 1
      from public.prescriptions p
      where (
        p.visit_id = v_visit.id
        or (
          v_visit.appointment_id is not null
          and p.appointment_id = v_visit.appointment_id
        )
      )
      and p.status = 'Prescribed'
    )
    into v_has_pending_meds;


    update public.queue_entries
    set status = 'completed'::public.queue_status
    where id = p_queue;


    update public.visits
    set status =
      case
        when v_has_pending_meds
          then 'awaiting_pharmacy'::public.visit_status
        else
          'completed'::public.visit_status
      end
    where id = v_visit.id;


  -- ----------------------------------------------------------
  -- CANCEL
  -- ----------------------------------------------------------

  elsif v_action = 'cancel'
        and v_q.status in (
          'waiting'::public.queue_status,
          'called'::public.queue_status,
          'skipped'::public.queue_status
        )
  then

    if v_visit.status <> 'checked_in'::public.visit_status then
      return jsonb_build_object(
        'success', false,
        'error',
        'Visit is no longer in the cancellable state.'
      );
    end if;


    update public.queue_entries
    set status = 'cancelled'::public.queue_status
    where id = p_queue;


    update public.visits
    set status = 'cancelled'::public.visit_status
    where id = v_q.visit_id;


  else

    return jsonb_build_object(
      'success', false,
      'error',
      'That move is not allowed from ' ||
      v_q.status::text ||
      '.'
    );

  end if;


  perform public.log_audit(
    'queue.' || v_action,
    'queue_entries',
    p_queue::text
  );


  return jsonb_build_object(
    'success', true,
    'action', v_action
  );

end
$$;


revoke all
on function public.queue_transition(uuid, text)
from public, anon, authenticated;

grant execute
on function public.queue_transition(uuid, text)
to authenticated;


-- ============================================================
-- 22. PRESCRIPTION PHARMACY GUARD
--
-- Pharmacy may READ prescriptions and perform the single
-- "Prescribed -> Dispensed" action.
--
-- Pharmacy cannot:
--   - change patient
--   - change medicine
--   - change quantity
--   - change dosage
--   - rewrite instructions
--   - cancel
--   - create prescriptions
-- ============================================================

create or replace function public.prevent_pharmacy_prescription_tamper()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.app_role;
begin

  actor_role := private.current_app_role();


  if actor_role = 'pharmacy'::public.app_role then

    if tg_op = 'INSERT' then
      raise exception
        'Pharmacy cannot create prescriptions.';
    end if;


    if new.patient_id is distinct from old.patient_id
       or new.appointment_id is distinct from old.appointment_id
       or new.visit_id is distinct from old.visit_id
       or new.prescribed_by is distinct from old.prescribed_by
       or new.medicine_name is distinct from old.medicine_name
       or new.dosage is distinct from old.dosage
       or new.quantity is distinct from old.quantity
       or new.instructions is distinct from old.instructions
       or new.created_at is distinct from old.created_at
    then
      raise exception
        'Pharmacy may only dispense an existing prescription.';
    end if;


    if old.status <> 'Prescribed'
       or new.status <> 'Dispensed'
    then
      raise exception
        'Pharmacy may only move a prescription from Prescribed to Dispensed.';
    end if;

  end if;


  return new;
end
$$;


drop trigger if exists prescriptions_pharmacy_guard
on public.prescriptions;

create trigger prescriptions_pharmacy_guard
before insert or update
on public.prescriptions
for each row
execute function public.prevent_pharmacy_prescription_tamper();


revoke all
on function public.prevent_pharmacy_prescription_tamper()
from public, anon, authenticated;


-- ============================================================
-- 23. PRESCRIPTION RLS
-- ============================================================

drop policy if exists "staff prescriptions full"
on public.prescriptions;


-- Clinical staff/admin manage prescriptions.
create policy "clinical staff prescriptions full"
on public.prescriptions
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


-- Pharmacy can read.
drop policy if exists "pharmacy prescriptions read"
on public.prescriptions;

create policy "pharmacy prescriptions read"
on public.prescriptions
for select
to authenticated
using (
  (select private.current_app_role())
    = 'pharmacy'::public.app_role
);


-- Pharmacy can update an existing prescription.
-- Trigger above restricts the actual change.
drop policy if exists "pharmacy prescriptions dispense"
on public.prescriptions;

create policy "pharmacy prescriptions dispense"
on public.prescriptions
for update
to authenticated
using (
  (select private.current_app_role())
    = 'pharmacy'::public.app_role
)
with check (
  (select private.current_app_role())
    = 'pharmacy'::public.app_role
);


-- ============================================================
-- 24. REPORT INTEGRITY
--
-- Enforces:
--   - report patient = appointment patient
--   - report doctor must actually be a doctor
--   - report doctor matches appointment doctor when present
-- ============================================================

create or replace function public.validate_report_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appt_patient uuid;
  v_appt_doctor uuid;
  v_doctor_role public.app_role;
begin

  select
    a.patient_id,
    a.doctor_id
  into
    v_appt_patient,
    v_appt_doctor
  from public.appointments a
  where a.id = new.appointment_id;


  if v_appt_patient is null then
    raise exception 'Appointment does not exist.';
  end if;


  if v_appt_patient <> new.patient_id then
    raise exception
      'Report patient does not match appointment patient.';
  end if;


  if new.doctor_id is not null then

    select p.role
    into v_doctor_role
    from public.profiles p
    where p.id = new.doctor_id;


    if v_doctor_role <> 'doctor'::public.app_role then
      raise exception
        'Report doctor must be a doctor profile.';
    end if;


    if v_appt_doctor <> new.doctor_id then
      raise exception
        'Report doctor does not match appointment doctor.';
    end if;

  end if;


  return new;
end
$$;


drop trigger if exists reports_integrity_guard
on public.reports;

create trigger reports_integrity_guard
before insert or update
on public.reports
for each row
execute function public.validate_report_integrity();


revoke all
on function public.validate_report_integrity()
from public, anon, authenticated;


-- ============================================================
-- 25. QUEUE/VISIT DIRECT-WRITE LOCKDOWN
--
-- check_in_patient() and queue_transition() are now the
-- authoritative write paths for these tables.
--
-- Patients retain read access through the existing policies.
-- Staff retain read access.
-- Staff no longer get direct INSERT/UPDATE/DELETE.
--
-- SECURITY DEFINER RPCs bypass these RLS restrictions because
-- they run with their owner's privileges.
-- ============================================================

drop policy if exists "staff visits full"
on public.visits;

drop policy if exists "staff visits read"
on public.visits;

create policy "staff visits read"
on public.visits
for select
to authenticated
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


drop policy if exists "staff queue full"
on public.queue_entries;

drop policy if exists "staff queue read"
on public.queue_entries;

create policy "staff queue read"
on public.queue_entries
for select
to authenticated
using (
  (select private.current_app_role()) in (
    'doctor'::public.app_role,
    'nurse'::public.app_role,
    'receptionist'::public.app_role,
    'admin'::public.app_role
  )
);


-- ============================================================
-- 26. DISPENSE PRESCRIPTION
--
-- CRITICAL:
--
-- DO NOT deduct stock here.
--
-- 0002 already has:
--   public.guard_prescription_dispense()
--
-- That trigger is the single inventory authority.
--
-- It:
--   - locks medicine
--   - validates catalog presence
--   - validates stock
--   - deducts stock exactly once
--   - records dispensed_by
--   - records dispensed_at
--
-- This RPC only coordinates the workflow around that trigger.
-- ============================================================

create or replace function public.dispense_prescription(
  p_prescription uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rx public.prescriptions%rowtype;

  v_actor_role public.app_role;

  v_visit_id uuid;
  v_remaining_prescriptions boolean;
begin

  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required.'
    );
  end if;


  v_actor_role := private.current_app_role();


  if v_actor_role not in (
    'pharmacy'::public.app_role,
    'admin'::public.app_role
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Pharmacy only.'
    );
  end if;


  -- Lock the prescription.
  select *
  into v_rx
  from public.prescriptions p
  where p.id = p_prescription
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Prescription not found.'
    );
  end if;


  if v_rx.status <> 'Prescribed' then
    return jsonb_build_object(
      'success', false,
      'error',
      'Already ' || v_rx.status || '.'
    );
  end if;


  -- ----------------------------------------------------------
  -- THIS UPDATE invokes the 0002 stock trigger.
  -- ----------------------------------------------------------

  begin

    update public.prescriptions
    set status = 'Dispensed'
    where id = p_prescription;

  exception
    when sqlstate 'P0001' then

      return jsonb_build_object(
        'success', false,
        'error', sqlerrm
      );

  end;


  -- ----------------------------------------------------------
  -- Notify patient.
  -- SECURITY DEFINER allows this insert even though patients
  -- cannot directly create notifications for themselves.
  -- ----------------------------------------------------------

  insert into public.notifications (
    user_id,
    title,
    body,
    link
  )
  values (
    v_rx.patient_id,
    'Medicines ready',
    v_rx.medicine_name ||
      ' is ready for pickup.',
    '/visits'
  );


  -- ----------------------------------------------------------
  -- If this prescription belongs to a visit, determine whether
  -- any prescriptions remain undispensed.
  -- ----------------------------------------------------------

  v_visit_id := v_rx.visit_id;


  if v_visit_id is null
     and v_rx.appointment_id is not null
  then

    select v.id
    into v_visit_id
    from public.visits v
    where v.appointment_id = v_rx.appointment_id
      and v.status = 'awaiting_pharmacy'::public.visit_status
    order by v.created_at desc
    limit 1;

  end if;


  if v_visit_id is not null then

    select exists (
      select 1
      from public.prescriptions p
      where (
        p.visit_id = v_visit_id
        or (
          v_rx.appointment_id is not null
          and p.appointment_id = v_rx.appointment_id
        )
      )
      and p.status = 'Prescribed'
    )
    into v_remaining_prescriptions;


    if not v_remaining_prescriptions then

      update public.visits
      set status = 'completed'::public.visit_status
      where id = v_visit_id
        and status = 'awaiting_pharmacy'::public.visit_status;

    end if;

  end if;


  perform public.log_audit(
    'prescription.dispense',
    'prescriptions',
    p_prescription::text
  );


  return jsonb_build_object(
    'success', true
  );

end
$$;


revoke all
on function public.dispense_prescription(uuid)
from public, anon, authenticated;

grant execute
on function public.dispense_prescription(uuid)
to authenticated;


-- ============================================================
-- 27. NOTIFICATIONS
--
-- Patients should NOT manufacture arbitrary notifications.
--
-- System/staff functions create notifications.
-- Patients only:
--   SELECT their own
--   UPDATE read state
-- ============================================================

drop policy if exists "notifications insert"
on public.notifications;


drop policy if exists "notifications staff insert"
on public.notifications;

create policy "notifications staff insert"
on public.notifications
for insert
to authenticated
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


-- Existing own update policy + 0003 notification trigger remain
-- responsible for restricting patient updates to is_read.