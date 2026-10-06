-- =============================================================================
-- CampusCare — Migration 008: Slice 8a Lab (simple, text-only, no new roles)
-- Doctor orders → marks sampled → enters result text → student bell + views it.
-- =============================================================================

CREATE TYPE test_order_status AS ENUM ('ordered', 'sampled', 'ready', 'cancelled');

CREATE TABLE test_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id          UUID NOT NULL REFERENCES visits(id) ON DELETE RESTRICT,
  clinic_profile_id UUID NOT NULL REFERENCES clinic_profiles(id) ON DELETE RESTRICT,
  ordered_by        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  test_type         TEXT NOT NULL,
  notes             TEXT,
  status            test_order_status NOT NULL DEFAULT 'ordered',
  result_text       TEXT,
  resulted_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resulted_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_orders_visit_id ON test_orders(visit_id);
CREATE INDEX idx_test_orders_clinic_profile_id ON test_orders(clinic_profile_id);
CREATE INDEX idx_test_orders_status ON test_orders(status);

CREATE TRIGGER trg_test_orders_updated_at
  BEFORE UPDATE ON test_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE test_orders ENABLE ROW LEVEL SECURITY;

-- Students read only their own orders (result visible only when ready)
CREATE POLICY "test_orders: read own (student)"
  ON test_orders FOR SELECT
  USING (
    clinic_profile_id IN (
      SELECT cp.id FROM clinic_profiles cp
      JOIN students s ON s.id = cp.student_id
      WHERE s.profile_id = auth.uid()
    )
  );

-- Doctors + receptionists + admins read all (clinic ops)
CREATE POLICY "test_orders: staff read"
  ON test_orders FOR SELECT
  USING (auth_has_role('receptionist', 'doctor', 'admin'));

-- Doctors order tests
CREATE POLICY "test_orders: doctor insert"
  ON test_orders FOR INSERT
  WITH CHECK (auth_has_role('doctor', 'admin'));

-- Doctors + receptionists move status (sampled), doctors enter results
CREATE POLICY "test_orders: staff update"
  ON test_orders FOR UPDATE
  USING (auth_has_role('receptionist', 'doctor', 'admin'));

-- ─── Order a test ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION order_test(
  p_visit_id UUID,
  p_clinic_profile_id UUID,
  p_test_type TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id  UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;
  IF p_test_type IS NULL OR LENGTH(TRIM(p_test_type)) < 2 OR LENGTH(p_test_type) > 120 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Name the test (2-120 characters).');
  END IF;

  INSERT INTO test_orders (visit_id, clinic_profile_id, ordered_by, test_type, notes, status)
  VALUES (p_visit_id, p_clinic_profile_id, v_uid, TRIM(p_test_type), NULLIF(TRIM(p_notes), ''), 'ordered')
  RETURNING id INTO v_id;

  INSERT INTO audit_logs (profile_id, action, resource_type, resource_id)
  VALUES (v_uid, 'order_test', 'test_order', v_id);

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION order_test(UUID, UUID, TEXT, TEXT) TO authenticated;

-- ─── Mark sample collected ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION mark_test_sampled(p_order_id UUID)
RETURNS JSONB AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;

  UPDATE test_orders SET status = 'sampled'
  WHERE id = p_order_id AND status = 'ordered';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found or already moved.');
  END IF;

  INSERT INTO audit_logs (profile_id, action, resource_type, resource_id)
  VALUES (auth.uid(), 'test_sampled', 'test_order', p_order_id);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION mark_test_sampled(UUID) TO authenticated;

-- ─── Save result → ready + notify student ─────────────────────────────────────

CREATE OR REPLACE FUNCTION save_test_result(p_order_id UUID, p_result_text TEXT)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order test_orders%ROWTYPE;
  v_profile_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;
  IF p_result_text IS NULL OR LENGTH(TRIM(p_result_text)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Write the result first.');
  END IF;

  SELECT * INTO v_order FROM test_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found.');
  END IF;
  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This order was cancelled.');
  END IF;

  UPDATE test_orders
  SET result_text = TRIM(p_result_text), status = 'ready',
      resulted_by = v_uid, resulted_at = NOW()
  WHERE id = p_order_id;

  SELECT s.profile_id INTO v_profile_id
  FROM clinic_profiles cp JOIN students s ON s.id = cp.student_id
  WHERE cp.id = v_order.clinic_profile_id;

  IF v_profile_id IS NOT NULL THEN
    PERFORM enqueue_notification(v_profile_id, 'follow_up', 'Test result ready',
      'Your test result (' || v_order.test_type || ') is ready. Open Test Results to view it.', '/student/tests');
  END IF;

  INSERT INTO audit_logs (profile_id, action, resource_type, resource_id)
  VALUES (v_uid, 'test_result_ready', 'test_order', p_order_id);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION save_test_result(UUID, TEXT) TO authenticated;
