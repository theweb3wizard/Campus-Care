-- =============================================================================
-- CampusCare — Migration 003: Slice 1 Auth + Registration fix
-- Simple, free, easy to debug. No extra extensions or paid services.
-- Run AFTER 001 + 002.
-- =============================================================================

-- ─── 1. Lock signup: everyone starts as student, no client role ──────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_meta      JSONB;
BEGIN
  v_meta := NEW.raw_user_meta_data;

  v_full_name := COALESCE(
    v_meta->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Always student. Staff are created later by an admin, never via signup.
  INSERT INTO public.profiles (id, role, full_name, email, status)
  VALUES (NEW.id, 'student', v_full_name, NEW.email, 'active')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── 2. Block self-promotion: students cannot change their own role/status ────

CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Admins (via admin UI / RPC) can change anything. Everyone else cannot
  -- touch role or status on their own row.
  IF NEW.role <> OLD.role OR NEW.status <> OLD.status THEN
    IF NOT auth_has_role('admin') THEN
      RAISE EXCEPTION 'You cannot change your own role or status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_profiles_no_self_promote ON profiles;
CREATE TRIGGER trg_profiles_no_self_promote
  BEFORE UPDATE OF role, status ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_profile_privilege_escalation();

-- ─── 3. Verify step for anonymous users (no RLS hole) ────────────────────────
-- Frontend calls this instead of SELECT on students.
-- Only returns name + claimed flag, nothing sensitive.

CREATE OR REPLACE FUNCTION verify_student(p_reg TEXT, p_email TEXT)
RETURNS TABLE(full_name TEXT, is_claimed BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT s.full_name, s.is_claimed
  FROM students s
  WHERE s.registration_number = UPPER(TRIM(p_reg))
    AND s.institutional_email = LOWER(TRIM(p_email))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION verify_student(TEXT, TEXT) TO anon, authenticated;

-- ─── 4. Claim step: link auth user to pre-provisioned student row ─────────────
-- Called right after signUp + signIn, so auth.uid() is the new user.
-- Single transaction: lock row, check, link, force student role.

CREATE OR REPLACE FUNCTION claim_student(
  p_registration_number TEXT,
  p_institutional_email TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_student  students%ROWTYPE;
  v_reg      TEXT := UPPER(TRIM(p_registration_number));
  v_email    TEXT := LOWER(TRIM(p_institutional_email));
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;

  SELECT * INTO v_student
  FROM students
  WHERE registration_number = v_reg
    AND institutional_email = v_email
  FOR UPDATE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student record not found.');
  END IF;

  IF v_student.is_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'This account has already been set up.');
  END IF;

  IF v_student.profile_id IS NOT NULL AND v_student.profile_id <> v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'This record is linked to another account.');
  END IF;

  UPDATE students
  SET profile_id = v_uid,
      is_claimed = true,
      updated_at = NOW()
  WHERE id = v_student.id;

  -- Safety: make sure this profile stays a student
  UPDATE profiles
  SET role = 'student'
  WHERE id = v_uid AND role <> 'student';

  RETURN jsonb_build_object('success', true, 'student_id', v_student.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION claim_student(TEXT, TEXT) TO authenticated;
