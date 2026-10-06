-- =============================================================================
-- CampusCare — Migration 009: Slice 8b Pregnancy + Questionnaire (simple)
-- Pregnancy: student opts in privately, staff sees banner in consultation.
-- Questionnaire: 7 fixed questions, JSON answers, doctor reads latest.
-- =============================================================================

-- ─── Pregnancy records ────────────────────────────────────────────────────────

CREATE TYPE pregnancy_status AS ENUM ('active', 'completed');

CREATE TABLE pregnancy_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_profile_id UUID NOT NULL REFERENCES clinic_profiles(id) ON DELETE RESTRICT,
  edd               DATE NOT NULL,
  notes             TEXT,
  status            pregnancy_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pregnancy_clinic_profile ON pregnancy_records(clinic_profile_id);
CREATE INDEX idx_pregnancy_status ON pregnancy_records(status);

CREATE TRIGGER trg_pregnancy_updated_at
  BEFORE UPDATE ON pregnancy_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE pregnancy_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pregnancy: read own (student)"
  ON pregnancy_records FOR SELECT
  USING (
    clinic_profile_id IN (
      SELECT cp.id FROM clinic_profiles cp
      JOIN students s ON s.id = cp.student_id
      WHERE s.profile_id = auth.uid()
    )
  );

CREATE POLICY "pregnancy: student insert own"
  ON pregnancy_records FOR INSERT
  WITH CHECK (
    clinic_profile_id IN (
      SELECT cp.id FROM clinic_profiles cp
      JOIN students s ON s.id = cp.student_id
      WHERE s.profile_id = auth.uid()
    )
    AND status = 'active'
  );

CREATE POLICY "pregnancy: staff read"
  ON pregnancy_records FOR SELECT
  USING (auth_has_role('receptionist', 'doctor', 'admin'));

CREATE POLICY "pregnancy: staff update"
  ON pregnancy_records FOR UPDATE
  USING (auth_has_role('doctor', 'admin'));

CREATE OR REPLACE FUNCTION register_pregnancy(p_edd DATE, p_notes TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cp_id UUID;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;
  IF p_edd IS NULL OR p_edd < CURRENT_DATE OR p_edd > CURRENT_DATE + INTERVAL '10 months' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enter a valid expected delivery date.');
  END IF;

  SELECT cp.id INTO v_cp_id FROM clinic_profiles cp
  JOIN students s ON s.id = cp.student_id
  WHERE s.profile_id = v_uid LIMIT 1;

  IF v_cp_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Complete clinic registration at reception first.');
  END IF;

  IF EXISTS (SELECT 1 FROM pregnancy_records WHERE clinic_profile_id = v_cp_id AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have an active record.');
  END IF;

  INSERT INTO pregnancy_records (clinic_profile_id, edd, notes, status)
  VALUES (v_cp_id, p_edd, NULLIF(TRIM(p_notes), ''), 'active')
  RETURNING id INTO v_id;

  INSERT INTO audit_logs (profile_id, action, resource_type, resource_id)
  VALUES (v_uid, 'register_pregnancy', 'pregnancy_record', v_id);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION register_pregnancy(DATE, TEXT) TO authenticated;

-- ─── Questionnaire responses (one row per visit, JSON answers) ────────────────

CREATE TABLE questionnaire_responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_profile_id UUID NOT NULL REFERENCES clinic_profiles(id) ON DELETE RESTRICT,
  visit_id          UUID REFERENCES visits(id) ON DELETE SET NULL,
  answers           JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questionnaire_clinic_profile ON questionnaire_responses(clinic_profile_id);
CREATE INDEX idx_questionnaire_visit ON questionnaire_responses(visit_id);

ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questionnaire: read own (student)"
  ON questionnaire_responses FOR SELECT
  USING (
    clinic_profile_id IN (
      SELECT cp.id FROM clinic_profiles cp
      JOIN students s ON s.id = cp.student_id
      WHERE s.profile_id = auth.uid()
    )
  );

CREATE POLICY "questionnaire: student insert own"
  ON questionnaire_responses FOR INSERT
  WITH CHECK (
    clinic_profile_id IN (
      SELECT cp.id FROM clinic_profiles cp
      JOIN students s ON s.id = cp.student_id
      WHERE s.profile_id = auth.uid()
    )
  );

CREATE POLICY "questionnaire: staff read"
  ON questionnaire_responses FOR SELECT
  USING (auth_has_role('receptionist', 'doctor', 'admin'));

CREATE OR REPLACE FUNCTION submit_questionnaire(p_answers JSONB, p_visit_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cp_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;
  IF p_answers IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Answer at least one question.');
  END IF;

  SELECT cp.id INTO v_cp_id FROM clinic_profiles cp
  JOIN students s ON s.id = cp.student_id
  WHERE s.profile_id = v_uid LIMIT 1;

  IF v_cp_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Complete clinic registration at reception first.');
  END IF;

  INSERT INTO questionnaire_responses (clinic_profile_id, visit_id, answers)
  VALUES (v_cp_id, p_visit_id, p_answers);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION submit_questionnaire(JSONB, UUID) TO authenticated;
