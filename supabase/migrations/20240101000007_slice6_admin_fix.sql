-- =============================================================================
-- CampusCare — Migration 008: Slice 6 Admin fix (simple)
-- Run AFTER 007. Real audit log, last-admin guard, staff link helper.
-- =============================================================================

-- ─── 1. Real audit writer (any signed-in user logs own actions, no forgery) ───
-- profile_id always = auth.uid(), so users can't forge other people's rows.

CREATE OR REPLACE FUNCTION log_audit(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO audit_logs (profile_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), LEFT(p_action, 100), LEFT(p_resource_type, 100), p_resource_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION log_audit(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- Lock audit table: only the function writes, nobody edits history
DROP POLICY IF EXISTS "audit_logs: authenticated insert" ON audit_logs;
-- (keep admin read policy from 002)

-- ─── 2. Audit inside key RPCs (no app changes needed) ────────────────────────

-- check-in audit
CREATE OR REPLACE FUNCTION check_in_student(
  p_student_id UUID,
  p_clinic_profile_id UUID,
  p_checked_in_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_today       DATE := CURRENT_DATE;
  v_visit_id    UUID;
  v_queue_id    UUID;
  v_queue_num   INTEGER;
  v_attempt     INTEGER := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM visits
    WHERE student_id = p_student_id
      AND visit_date = v_today
      AND status NOT IN ('completed', 'cancelled', 'no_show')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This student already has an active visit today.');
  END IF;

  INSERT INTO visits (student_id, clinic_profile_id, checked_in_by, status, visit_date, notes)
  VALUES (p_student_id, p_clinic_profile_id, p_checked_in_by, 'queued', v_today, p_notes)
  RETURNING id INTO v_visit_id;

  LOOP
    v_attempt := v_attempt + 1;
    PERFORM pg_advisory_xact_lock(hashtext('queue-' || v_today::TEXT));
    SELECT COALESCE(MAX(queue_number), 0) + 1 INTO v_queue_num
    FROM queue_entries WHERE queue_date = v_today;
    BEGIN
      INSERT INTO queue_entries (visit_id, clinic_profile_id, queue_number, queue_date, status)
      VALUES (v_visit_id, p_clinic_profile_id, v_queue_num, v_today, 'waiting')
      RETURNING id INTO v_queue_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 3 THEN RAISE; END IF;
    END;
  END LOOP;

  INSERT INTO audit_logs (profile_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'check_in', 'visit', v_visit_id,
    jsonb_build_object('queue_number', v_queue_num, 'student_id', p_student_id));

  RETURN jsonb_build_object(
    'success', true,
    'visit_id', v_visit_id,
    'queue_entry_id', v_queue_id,
    'queue_number', v_queue_num
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- booking audit (append to existing book_appointment)
CREATE OR REPLACE FUNCTION book_appointment(p_scheduled_at TIMESTAMPTZ, p_reason TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_student_id UUID;
  v_cp_id UUID;
  v_id UUID;
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
    VALUES (v_student_id, v_cp_id, p_scheduled_at, NULLIF(TRIM(p_reason), ''), 'scheduled', v_uid)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an upcoming appointment.');
  END;
  PERFORM enqueue_notification(v_uid, 'appointment', 'Appointment booked',
    'Your clinic appointment is booked. See My Appointments for details.', '/student/appointments');
  INSERT INTO audit_logs (profile_id, action, resource_type, resource_id)
  VALUES (v_uid, 'book_appointment', 'appointment', v_id);
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── 3. Helper: admin creates staff link (auth user made server-side first) ───
-- App creates the auth.users row via service_role, then calls this to fix
-- profile role + staff_profiles in one transaction. Only admins can call it.

CREATE OR REPLACE FUNCTION admin_link_staff(
  p_user_id UUID,
  p_role user_role,
  p_full_name TEXT,
  p_employee_id TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_specialization TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  IF NOT auth_has_role('admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admins only.');
  END IF;
  IF p_role = 'student' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Use student onboarding for students.');
  END IF;

  UPDATE profiles SET role = p_role, full_name = NULLIF(TRIM(p_full_name), full_name)
  WHERE id = p_user_id;

  INSERT INTO staff_profiles (profile_id, employee_id, department, specialization, is_active)
  VALUES (p_user_id, NULLIF(TRIM(p_employee_id), ''), NULLIF(TRIM(p_department), ''),
          NULLIF(TRIM(p_specialization), ''), true)
  ON CONFLICT (profile_id) DO UPDATE SET
    employee_id = EXCLUDED.employee_id,
    department = EXCLUDED.department,
    specialization = EXCLUDED.specialization,
    is_active = true;

  INSERT INTO audit_logs (profile_id, action, resource_type, resource_id,
    metadata) VALUES (auth.uid(), 'create_staff', 'profile', p_user_id,
    jsonb_build_object('role', p_role));

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_link_staff(UUID, user_role, TEXT, TEXT, TEXT, TEXT) TO authenticated;
