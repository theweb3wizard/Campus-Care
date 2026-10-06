-- =============================================================================
-- CampusCare — Migration 007: Slice 5 Booking + Notifications (simple)
-- Run AFTER 006. Students can book/cancel own appointments. Notifications work.
-- =============================================================================

-- ─── 1. Students book their own appointments ────────────────────────────────

DROP POLICY IF EXISTS "appointments: student insert own" ON appointments;
CREATE POLICY "appointments: student insert own"
  ON appointments FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
    AND created_by = auth.uid()
    AND status = 'scheduled'
  );

DROP POLICY IF EXISTS "appointments: student cancel own" ON appointments;
CREATE POLICY "appointments: student cancel own"
  ON appointments FOR UPDATE
  USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  )
  WITH CHECK (status = 'cancelled');

-- One active appointment per student (DB guard against double-tap)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_appointment_per_student
  ON appointments (student_id)
  WHERE status = 'scheduled';

-- ─── 2. Notifications that actually deliver (bypasses RLS safely) ────────────

CREATE OR REPLACE FUNCTION enqueue_notification(
  p_profile_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (profile_id, type, title, message, action_url, is_read)
  VALUES (p_profile_id, p_type, LEFT(p_title, 120), LEFT(p_message, 500), p_action_url, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION enqueue_notification(UUID, notification_type, TEXT, TEXT, TEXT) TO authenticated;

-- ─── 3. Book appointment: one active at a time, no past dates ─────────────────

CREATE OR REPLACE FUNCTION book_appointment(p_scheduled_at TIMESTAMPTZ, p_reason TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_student_id UUID;
  v_cp_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;

  IF p_scheduled_at IS NULL OR p_scheduled_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pick a future date and time.');
  END IF;

  IF p_scheduled_at > NOW() + INTERVAL '30 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only book up to 30 days ahead.');
  END IF;

  SELECT id INTO v_student_id FROM students WHERE profile_id = v_uid LIMIT 1;
  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student record not found.');
  END IF;

  SELECT id INTO v_cp_id FROM clinic_profiles WHERE student_id = v_student_id LIMIT 1;
  IF v_cp_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Complete clinic registration at reception first.');
  END IF;

  IF EXISTS (SELECT 1 FROM appointments WHERE student_id = v_student_id AND status = 'scheduled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an upcoming appointment. Cancel it first to book a new one.');
  END IF;

  BEGIN
    INSERT INTO appointments (student_id, clinic_profile_id, scheduled_at, reason, status, created_by)
    VALUES (v_student_id, v_cp_id, p_scheduled_at, NULLIF(TRIM(p_reason), ''), 'scheduled', v_uid);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an upcoming appointment.');
  END;

  -- Confirm via bell
  PERFORM enqueue_notification(v_uid, 'appointment', 'Appointment booked',
    'Your clinic appointment is booked. See My Appointments for details.', '/student/appointments');

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION book_appointment(TIMESTAMPTZ, TEXT) TO authenticated;

-- ─── 4. Cancel own appointment ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cancel_appointment(p_appointment_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;

  UPDATE appointments SET status = 'cancelled'
  WHERE id = p_appointment_id
    AND student_id IN (SELECT id FROM students WHERE profile_id = v_uid)
    AND status = 'scheduled';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appointment not found or already changed.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION cancel_appointment(UUID) TO authenticated;
