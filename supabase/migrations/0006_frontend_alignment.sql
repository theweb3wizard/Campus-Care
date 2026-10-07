-- Campus Care v2 — 0006 frontend alignment (ChatGPT frontend review)
-- Run after 0005 on the live DB. Small, additive, safe to run on a fresh database.

-- ---------- 1. active_doctors(): narrow RPC for booking display ----------
-- Patients never touch profiles rows for this; they get exactly id/name/specialty/room.
create or replace function public.active_doctors()
returns table(id uuid, full_name text, specialty text, room text)
language sql security definer set search_path = public as $$
  select d.id, p.full_name, d.specialty, d.room
  from public.doctors d
  join public.profiles p on p.id = d.id
  where d.is_active = true
  order by p.full_name;
$$;
revoke all on function public.active_doctors() from public;
grant execute on function public.active_doctors() to authenticated;

-- ---------- 2. reschedule_appointment(): backend owns the transition ----------
-- Upcoming appointment -> pick new slot -> old becomes Rescheduled, new becomes Pending.
-- One transaction, so the one-upcoming rule never strands the patient with zero or two.
create or replace function public.reschedule_appointment(
  p_appointment uuid, p_starts timestamptz, p_ends timestamptz
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old public.appointments%rowtype; v_ref text;
begin
  select * into v_old from public.appointments where id = p_appointment for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Appointment not found.');
  end if;
  if v_old.patient_id <> auth.uid() then
    return jsonb_build_object('success', false, 'error', 'That is not your appointment.');
  end if;
  if v_old.status not in ('Pending','Confirmed') then
    return jsonb_build_object('success', false, 'error', 'Only upcoming visits can move.');
  end if;
  if p_starts <= now() or p_ends <= p_starts then
    return jsonb_build_object('success', false, 'error', 'Pick a future time.');
  end if;
  if exists (select 1 from public.appointments
    where doctor_id = v_old.doctor_id and status in ('Pending','Confirmed')
      and starts_at = p_starts and id <> v_old.id) then
    return jsonb_build_object('success', false, 'error', 'That time is now taken. Pick another time to keep your place.');
  end if;
  v_ref := 'CC-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  update public.appointments set status = 'Rescheduled' where id = p_appointment;
  insert into public.appointments (patient_id, doctor_id, service, starts_at, ends_at, status, reference, notes)
  values (v_old.patient_id, v_old.doctor_id, v_old.service, p_starts, p_ends, 'Pending', v_ref, v_old.notes);
  perform public.log_audit('appointment.reschedule', 'appointments', p_appointment::text);
  return jsonb_build_object('success', true, 'reference', v_ref);
exception when unique_violation then
  return jsonb_build_object('success', false, 'error', 'That time is now taken. Pick another time to keep your place.');
end $$;
revoke all on function public.reschedule_appointment(uuid, timestamptz, timestamptz) from public;
grant execute on function public.reschedule_appointment(uuid, timestamptz, timestamptz) to authenticated;
