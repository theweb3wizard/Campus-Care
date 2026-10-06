-- =============================================================================
-- CampusCare — Migration 010: Slice 8c Emergency + Doctor Directory (simple)
-- Emergency: public report → reception banner → acknowledge/resolve.
-- Directory: view of active doctors for the student finder page.
-- =============================================================================

-- ─── Emergency requests ───────────────────────────────────────────────────────

CREATE TYPE emergency_status AS ENUM ('pending', 'acknowledged', 'resolved', 'cancelled');

CREATE TABLE emergency_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_name TEXT NOT NULL,
  phone       TEXT NOT NULL,
  location    TEXT NOT NULL,
  description TEXT NOT NULL,
  status      emergency_status NOT NULL DEFAULT 'pending',
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  handled_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emergency_status ON emergency_requests(status, created_at DESC);

CREATE TRIGGER trg_emergency_updated_at
  BEFORE UPDATE ON emergency_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (even logged out) can report — it's an emergency
CREATE POLICY "emergency: anyone can report"
  ON emergency_requests FOR INSERT
  WITH CHECK (true);

-- Reporters can read their own (logged-in); staff read all open
CREATE POLICY "emergency: staff read"
  ON emergency_requests FOR SELECT
  USING (auth_has_role('receptionist', 'doctor', 'admin'));

CREATE POLICY "emergency: staff update"
  ON emergency_requests FOR UPDATE
  USING (auth_has_role('receptionist', 'doctor', 'admin'));

CREATE OR REPLACE FUNCTION report_emergency(
  p_name TEXT,
  p_phone TEXT,
  p_location TEXT,
  p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 2 OR LENGTH(p_name) > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tell us your name.');
  END IF;
  IF p_phone IS NULL OR LENGTH(TRIM(p_phone)) < 7 OR LENGTH(p_phone) > 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Give a phone number we can call back.');
  END IF;
  IF p_location IS NULL OR LENGTH(TRIM(p_location)) < 3 OR LENGTH(p_location) > 200 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Say where you are (hostel, gate, faculty…).');
  END IF;
  IF p_description IS NULL OR LENGTH(TRIM(p_description)) < 5 OR LENGTH(p_description) > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Briefly describe what happened.');
  END IF;

  INSERT INTO emergency_requests (reporter_name, phone, location, description, status, created_by)
  VALUES (TRIM(p_name), TRIM(p_phone), TRIM(p_location), TRIM(p_description), 'pending', auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION report_emergency(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION set_emergency_status(p_id UUID, p_status emergency_status)
RETURNS JSONB AS $$
BEGIN
  IF NOT auth_has_role('receptionist', 'doctor', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff only.');
  END IF;

  UPDATE emergency_requests
  SET status = p_status, handled_by = auth.uid()
  WHERE id = p_id AND status IN ('pending', 'acknowledged');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already handled.');
  END IF;

  INSERT INTO audit_logs (profile_id, action, resource_type, resource_id,
    metadata) VALUES (auth.uid(), 'emergency_' || p_status::TEXT, 'emergency_request', p_id);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION set_emergency_status(UUID, emergency_status) TO authenticated;

-- ─── Doctor directory view (expert finder, simple) ────────────────────────────

CREATE OR REPLACE VIEW doctor_directory AS
SELECT p.full_name, sp.specialization, sp.department
FROM staff_profiles sp
JOIN profiles p ON p.id = sp.profile_id
WHERE p.role = 'doctor' AND p.status = 'active' AND sp.is_active = true
ORDER BY p.full_name;

GRANT SELECT ON doctor_directory TO authenticated;
