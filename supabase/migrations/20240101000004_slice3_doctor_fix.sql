-- =============================================================================
-- CampusCare — Migration 005: Slice 3 Doctor consult fix (simple)
-- Run AFTER 004. One-transaction transitions, no half-applied states.
-- =============================================================================

-- ─── 1. Allow doctors to remove their own pending items ───────────────────────
-- (Old RLS had no DELETE policy, so remove button always failed.)

DROP POLICY IF EXISTS "prescription_items: doctor delete pending" ON prescription_items;
CREATE POLICY "prescription_items: doctor delete pending"
  ON prescription_items FOR DELETE
  USING (
    auth_has_role('doctor', 'admin')
    AND status = 'pending'
    AND prescription_id IN (
      SELECT id FROM prescriptions WHERE status IN ('pending', 'ready')
    )
  );

-- ─── 2. Start consultation: queue + visit move together ───────────────────────

CREATE OR REPLACE FUNCTION start_consultation(p_queue_entry_id UUID, p_visit_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_q   queue_entries%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;

  SELECT * INTO v_q FROM queue_entries WHERE id = p_queue_entry_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Queue entry not found.');
  END IF;

  IF v_q.status IN ('completed', 'cancelled', 'skipped') THEN
    RETURN jsonb_build_object('success', false, 'error', 'This patient is already done.');
  END IF;

  UPDATE queue_entries
  SET status = 'in_consultation',
      consultation_started_at = NOW(),
      assigned_doctor_id = v_uid
  WHERE id = p_queue_entry_id;

  UPDATE visits SET status = 'in_consultation' WHERE id = p_visit_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION start_consultation(UUID, UUID) TO authenticated;

-- ─── 3. Complete consultation: smart routing to pharmacy or done ─────────────
-- If a prescription with items exists → awaiting_pharmacy, else completed.

CREATE OR REPLACE FUNCTION complete_consultation(p_queue_entry_id UUID, p_visit_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_has_rx BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM prescriptions pr
    JOIN prescription_items pi ON pi.prescription_id = pr.id
    WHERE pr.visit_id = p_visit_id
  ) INTO v_has_rx;

  UPDATE queue_entries
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_queue_entry_id;

  IF v_has_rx THEN
    UPDATE visits SET status = 'awaiting_pharmacy' WHERE id = p_visit_id;
    -- Make sure the prescription is marked ready for pharmacy
    UPDATE prescriptions SET status = 'ready'
    WHERE visit_id = p_visit_id AND status = 'pending';
  ELSE
    UPDATE visits
    SET status = 'completed', completion_time = NOW()
    WHERE id = p_visit_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'sent_to_pharmacy', v_has_rx);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION complete_consultation(UUID, UUID) TO authenticated;

-- ─── 4. Finalize prescription from consult page: rx + visit + queue together ──

CREATE OR REPLACE FUNCTION finalize_prescription(
  p_prescription_id UUID,
  p_visit_id UUID,
  p_queue_entry_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_items INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;

  SELECT COUNT(*) INTO v_items
  FROM prescription_items WHERE prescription_id = p_prescription_id;

  IF v_items = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Add at least one drug before sending to pharmacy.');
  END IF;

  UPDATE prescriptions
  SET status = 'ready', notes = NULLIF(TRIM(p_notes), '')
  WHERE id = p_prescription_id;

  UPDATE visits SET status = 'awaiting_pharmacy' WHERE id = p_visit_id;

  UPDATE queue_entries
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_queue_entry_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION finalize_prescription(UUID, UUID, UUID, TEXT) TO authenticated;
