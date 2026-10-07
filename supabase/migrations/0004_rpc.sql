-- ============================================================
-- Campus Care v2 — 0004 RPC
--
-- Identity claim
-- Atomic check-in / queue
-- Queue transitions
-- Guarded medication dispensing
--
-- REQUIRES:
--   0001_core.sql
--   0002_clinical.sql
--   0003_special.sql
--
-- IMPORTANT:
--   0002 already installs a BEFORE trigger named:
--     prescription_dispense_guard
--
--   Therefore dispense_prescription() below DOES NOT modify
--   medicine stock directly.
--
--   The trigger is the single source of truth for:
--     - stock validation
--     - stock deduction
--     - dispensed_by
--     - dispensed_at
--
--   This prevents double-deduction.
-- ============================================================


-- ============================================================
-- 1. NORMALIZE HUMAN IDS
-- ============================================================

create or replace function public.norm_id(p text)
returns text
language sql
immutable
as $$
  select upper(
    regexp_replace(
      trim(coalesce(p, '')),
      '\s+',
      ' ',
      'g'
    )
  );
$$;


-- ============================================================
-- 2. NORMALIZED UNIQUENESS
--
-- The original UNIQUE constraints are case-sensitive.
-- These indexes make identifiers unique according to the
-- same normalization used by the RPCs.
-- ============================================================

create unique index if not exists profiles_login_id_norm_uniq
  on public.profiles (public.norm_id(login_id));

create unique index if not exists students_reg_number_norm_uniq
  on public.students (public.norm_id(reg_number));

create unique index if not exists staff_invites_staff_id_norm_uniq
  on public.staff_invites (public.norm_id(staff_id));

-- Medicine lookup in 0002 is case-insensitive.
-- Therefore the catalog must also be case-insensitively unique.
create unique index if not exists medicines_name_ci_uniq
  on public.medicines (lower(name));


-- ============================================================
-- 3. VERIFY STUDENT
--
-- Anonymous-safe lookup.
--
-- Deliberately exposes only:
--   reg_number
--   full_name
--   is_claimed
--
-- It does NOT expose:
--   email
--   faculty
--   department
--   phone
--   profile_id
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
-- 4. EMAIL LOOKUP FOR ID-FIRST LOGIN
--
-- The application uses a synthetic Auth email derived from
-- the human login ID.
--
-- This function is intentionally callable before login.
--
-- IMPORTANT:
-- Keep the "no real emails" invariant in the application.
-- This RPC should only ever expose whatever email exists in
-- auth.users.
-- ============================================================

create or replace function public.email_for_login(
  p_login_id text
)
returns text
language sql
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
-- Registry row -> currently authenticated account.
--
-- Security rules:
--   - must be authenticated
--   - login_id must match the reg number
--   - registry row must exist
--   - registry row cannot already be claimed
--   - institutional email must match when present
--   - profile name must match registry name
--   - account must currently be a patient account
--   - row is locked during the claim
--
-- The claim context allows this RPC to change profile role
-- without allowing ordinary users to perform role escalation.
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
  v_row public.students%rowtype;

  v_name text;
  v_role public.app_role;
  v_login_id text;
  v_uid uuid;

  v_email text;
begin

  v_uid := auth.uid();

  if v_uid is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required.'
    );
  end if;


  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');


  -- Lock the registry row so two accounts cannot claim it
  -- simultaneously.
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


  if v_row.is_claimed then
    return jsonb_build_object(
      'success', false,
      'error',
      'This reg number is already claimed. See reception if this is you.'
    );
  end if;


  -- Read current profile.
  select
    p.full_name,
    p.role,
    p.login_id
    into
    v_name,
    v_role,
    v_login_id
  from public.profiles p
  where p.id = v_uid;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'Account not ready. Log out and log in again.'
    );
  end if;


  -- A student claim must originate from the account whose
  -- login identifier is that student's registration number.
  if public.norm_id(v_login_id)
     <> public.norm_id(p_reg)
  then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account is not registered with that ID.'
    );
  end if;


  -- Prevent a staff account from silently being downgraded
  -- through the student claim RPC.
  if v_role <> 'patient'::public.app_role then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account cannot be used for a student claim.'
    );
  end if;


  -- If the registry contains an institutional email,
  -- the submitted email must match it.
  if v_row.institutional_email is not null
     and lower(trim(v_row.institutional_email))
         <> coalesce(v_email, '')
  then
    return jsonb_build_object(
      'success', false,
      'error',
      'Email does not match our record for this reg number. See reception.'
    );
  end if;


  -- Name comparison after whitespace normalization.
  if public.norm_id(v_name)
     <> public.norm_id(v_row.full_name)
  then
    return jsonb_build_object(
      'success', false,
      'error',
      'Name does not match our record for this reg number. See reception.'
    );
  end if;


  -- Allow the dedicated claim transaction to change role.
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
      coalesce(institutional_email, v_email)
  where id = v_row.id;


  update public.profiles
  set
    role = 'patient'::public.app_role,
    verified = true,
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
  v_open text;

  v_uid uuid;
  v_role public.app_role;
  v_login_id text;

  v_reg text;
  v_name text;
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


  select value
    into v_open
  from public.clinic_settings
  where key = 'allow_open_signup';


  if coalesce(lower(trim(v_open)), 'true') <> 'true' then
    return jsonb_build_object(
      'success', false,
      'error',
      'New signups need reception. Come to the clinic with your ID card.'
    );
  end if;


  select
    p.role,
    p.login_id
    into
    v_role,
    v_login_id
  from public.profiles p
  where p.id = v_uid;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'Account not ready. Log out and log in again.'
    );
  end if;


  if public.norm_id(v_login_id) <> v_reg then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account is not registered with that ID.'
    );
  end if;


  if v_role <> 'patient'::public.app_role then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account cannot be used for student registration.'
    );
  end if;


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
-- Staff ID -> authenticated account.
--
-- The account's login_id must match the invite's staff_id.
-- Only a patient account can be upgraded through this RPC.
-- This prevents an existing staff account from claiming a
-- second invite and changing its role unexpectedly.
-- ============================================================

create or replace function public.claim_staff(
  p_staff_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.staff_invites%rowtype;

  v_uid uuid;
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


  select *
    into v_row
  from public.staff_invites s
  where public.norm_id(s.staff_id)
        = public.norm_id(p_staff_id)
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'Staff ID not found. Ask admin to add you first.'
    );
  end if;


  if v_row.is_claimed then
    return jsonb_build_object(
      'success', false,
      'error',
      'This staff ID is already claimed. See admin.'
    );
  end if;


  select
    p.role,
    p.login_id
    into
    v_role,
    v_login_id
  from public.profiles p
  where p.id = v_uid;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error',
      'Account not ready. Log out and log in again.'
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


  if v_role <> 'patient'::public.app_role then
    return jsonb_build_object(
      'success', false,
      'error',
      'This account cannot claim another staff role.'
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
on function public.claim_staff(text)
from public, anon, authenticated;

grant execute
on function public.claim_staff(text)
to authenticated;


-- ============================================================
-- 8. BOOKED SLOTS
--
-- Returns only appointment start times.
-- No patient information is exposed.
-- ============================================================

create or replace function public.booked_slots(
  p_doctor uuid,
  p_day date
)
returns setof timestamptz
language sql
security definer
set search_path = ''
as $$
  select a.starts_at
  from public.appointments a
  where a.doctor_id = p_doctor
    and a.status in (
      'Pending'::public.appt_status,
      'Confirmed'::public.appt_status
    )
    and a.starts_at >= p_day::timestamptz
    and a.starts_at < (p_day + 1)::timestamptz
  order by a.starts_at;
$$;


revoke all
on function public.booked_slots(uuid, date)
from public, anon, authenticated;

grant execute
on function public.booked_slots(uuid, date)
to authenticated;


-- ============================================================
-- 9. ATOMIC PATIENT CHECK-IN
--
-- Creates:
--   visits
--   queue_entries
--   appointment confirmation
--
-- under ONE transaction.
--
-- The day-specific advisory lock serializes queue-number
-- allocation.
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

  v_day date := now()::date;

  v_visit uuid;
  v_num integer := 0;

  v_queue_count integer;
  v_max_queue integer;

  v_tries integer := 0;

  v_appt_patient uuid;
  v_appt_doctor uuid;
  v_appt_status public.appt_status;

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


  -- One lock for all queue-number generation today.
  perform pg_advisory_xact_lock(
    hashtextextended(
      'queue-' || v_day::text,
      0
    )
  );


  -- ----------------------------------------------------------
  -- Validate appointment, when supplied.
  -- ----------------------------------------------------------

  if p_appointment is not null then

    select
      a.patient_id,
      a.doctor_id,
      a.status
      into
      v_appt_patient,
      v_appt_doctor,
      v_appt_status
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
  -- Validate doctor, when supplied.
  -- ----------------------------------------------------------

  if v_doctor_id is not null then

    select d.is_active
      into v_doctor_active
    from public.doctors d
    where d.id = v_doctor_id;


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
  -- One active visit per patient per day.
  -- The unique index in 0001 is also a final DB-level backstop.
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
  -- Daily queue cap.
  -- ----------------------------------------------------------

  select
    nullif(trim(cs.value), '')::integer
    into v_max_queue
  from public.clinic_settings cs
  where cs.key = 'max_daily_queue';


  v_max_queue := coalesce(v_max_queue, 200);


  if v_max_queue <= 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'Daily queue limit is not configured correctly.'
    );
  end if;


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
  -- Atomic queue number allocation.
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


  -- ----------------------------------------------------------
  -- Confirm the appointment after successful check-in.
  -- ----------------------------------------------------------

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
-- 10. QUEUE TRANSITIONS
--
-- Allowed:
--
--   waiting -> called
--   waiting -> skipped
--   called  -> skipped
--   skipped -> waiting (recall)
--   waiting/called -> in_consultation
--   in_consultation -> completed
--   waiting/called/skipped -> cancelled
--
-- Queue and visit states are updated together where the visit
-- lifecycle changes.
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

  v_visit_next_status public.visit_status;
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


  -- Lock the queue row.
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


  -- Lock its visit too.
  select *
    into v_visit
  from public.visits v
  where v.id = v_q.visit_id
  for update;


  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Visit associated with queue entry was not found.'
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
  -- START CONSULTATION
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


    -- Doctors may only take a queue assigned to themselves.
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


      v_actor_doctor := coalesce(
        v_q.assigned_doctor_id,
        v_actor_doctor
      );

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
  -- COMPLETE CONSULTATION
  --
  -- If there are undispensed prescriptions, the clinical visit
  -- moves to awaiting_pharmacy.
  --
  -- Otherwise the visit is fully completed.
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


    if v_has_pending_meds then
      v_visit_next_status :=
        'awaiting_pharmacy'::public.visit_status;
    else
      v_visit_next_status :=
        'completed'::public.visit_status;
    end if;


    update public.queue_entries
    set status = 'completed'::public.queue_status
    where id = p_queue;


    update public.visits
    set status = v_visit_next_status
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
-- 11. GUARDED DISPENSING
--
-- IMPORTANT:
-- The actual stock transaction is handled by the trigger from
-- 0002:
--
--   public.guard_prescription_dispense()
--
-- This RPC ONLY:
--   - authorizes pharmacy/admin
--   - locks the prescription
--   - moves it to Dispensed
--   - creates the notification
--   - writes the audit entry
--
-- The BEFORE UPDATE trigger automatically:
--   - finds the medicine
--   - locks the medicine row
--   - validates available stock
--   - subtracts quantity atomically
--   - records dispensed_by
--   - records dispensed_at
--
-- Therefore stock is deducted EXACTLY ONCE.
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


  -- Lock prescription so two pharmacy workers cannot dispense
  -- the same prescription simultaneously.
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
  -- DO NOT manually deduct stock here.
  --
  -- The 0002 BEFORE trigger performs the inventory operation
  -- while the medicine row is locked.
  -- ----------------------------------------------------------

  begin

    update public.prescriptions
    set status = 'Dispensed'::text
    where id = p_prescription;


  exception
    -- guard_prescription_dispense() in 0002 raises ordinary
    -- PL/pgSQL exceptions for:
    --   - missing medicine
    --   - insufficient stock
    --   - unauthorized dispensing
    when sqlstate 'P0001' then

      return jsonb_build_object(
        'success', false,
        'error', sqlerrm
      );

  end;


  -- If notification creation fails, the entire transaction
  -- rolls back, including the prescription + stock change.
  insert into public.notifications (
    user_id,
    title,
    body,
    link
  )
  values (
    v_rx.patient_id,
    'Medicines ready',
    v_rx.medicine_name || ' is ready for pickup.',
    '/visits'
  );


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