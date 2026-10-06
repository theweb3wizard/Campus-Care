-- =============================================================================
-- CampusCare — Migration 006: Slice 4 Pharmacy fix (simple, atomic)
-- Run AFTER 005. No new extensions. One-transaction dispense + restock.
-- =============================================================================

-- ─── 1. Atomic dispense: stock + item + prescription + visit together ─────────
-- Prevents oversell when two pharmacists dispense the last units at once.

CREATE OR REPLACE FUNCTION dispense_item(
  p_item_id UUID,
  p_prescription_id UUID,
  p_qty INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_item       prescription_items%ROWTYPE;
  v_inv        inventory_items%ROWTYPE;
  v_remaining  INTEGER;
  v_to_dispense INTEGER;
  v_new_stock  INTEGER;
  v_new_disp   INTEGER;
  v_item_status prescription_item_status;
  v_rx_status  prescription_status;
  v_visit_id   UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;

  IF p_qty IS NULL OR p_qty <= 0 OR p_qty > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be between 1 and 1000.');
  END IF;

  -- Lock item first
  SELECT * INTO v_item FROM prescription_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prescription item not found.');
  END IF;

  IF v_item.status IN ('dispensed', 'unavailable', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item is already done.');
  END IF;

  v_remaining := v_item.quantity_prescribed - v_item.quantity_dispensed;
  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item already fully dispensed.');
  END IF;

  v_to_dispense := LEAST(p_qty, v_remaining);

  -- Lock inventory row
  SELECT * INTO v_inv FROM inventory_items
  WHERE medication_id = v_item.medication_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Medication not found in inventory.');
  END IF;

  IF v_inv.quantity_in_stock < v_to_dispense THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Insufficient stock. Only ' || v_inv.quantity_in_stock || ' units available.');
  END IF;

  v_new_stock := v_inv.quantity_in_stock - v_to_dispense;
  v_new_disp := v_item.quantity_dispensed + v_to_dispense;
  v_item_status := CASE WHEN v_new_disp >= v_item.quantity_prescribed THEN 'dispensed' ELSE 'partially_dispensed' END;

  UPDATE inventory_items SET quantity_in_stock = v_new_stock WHERE id = v_inv.id;

  INSERT INTO inventory_transactions
    (inventory_item_id, medication_id, transaction_type, quantity_change, quantity_before, quantity_after, reference_id, performed_by, notes)
  VALUES
    (v_inv.id, v_item.medication_id, 'dispensing', -v_to_dispense, v_inv.quantity_in_stock, v_new_stock, p_item_id, v_uid, 'Dispensed for prescription item');

  UPDATE prescription_items
  SET quantity_dispensed = v_new_disp, status = v_item_status
  WHERE id = p_item_id;

  -- Re-evaluate prescription status
  SELECT
    CASE
      WHEN BOOL_AND(status IN ('dispensed', 'unavailable', 'cancelled')) THEN
        CASE WHEN BOOL_AND(status = 'unavailable') THEN 'unavailable' ELSE 'dispensed' END
      WHEN BOOL_OR(status = 'partially_dispensed') OR BOOL_OR(status = 'dispensed') THEN 'partially_dispensed'
      ELSE 'ready'
    END,
    MAX(visit_id)
  INTO v_rx_status, v_visit_id
  FROM (
    SELECT pi.status, pr.visit_id
    FROM prescription_items pi
    JOIN prescriptions pr ON pr.id = pi.prescription_id
    WHERE pi.prescription_id = p_prescription_id
  ) s;

  -- Fix enum: prescriptions table has no 'partially_dispensed'? It does. Keep it.
  UPDATE prescriptions
  SET status = v_rx_status,
      dispensed_by = CASE WHEN v_rx_status IN ('dispensed', 'unavailable') THEN v_uid ELSE dispensed_by END,
      dispensed_at = CASE WHEN v_rx_status IN ('dispensed', 'unavailable') THEN NOW() ELSE dispensed_at END
  WHERE id = p_prescription_id;

  IF v_rx_status IN ('dispensed', 'unavailable') AND v_visit_id IS NOT NULL THEN
    UPDATE visits
    SET status = 'completed', completion_time = NOW()
    WHERE id = v_visit_id AND status = 'awaiting_pharmacy';
  END IF;

  RETURN jsonb_build_object('success', true, 'dispensed', v_to_dispense, 'prescription_status', v_rx_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION dispense_item(UUID, UUID, INTEGER) TO authenticated;

-- ─── 2. Atomic restock: stock + ledger together, rejects bad qty ──────────────

CREATE OR REPLACE FUNCTION restock_item(
  p_inventory_item_id UUID,
  p_medication_id UUID,
  p_qty INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_cur   INTEGER;
  v_new   INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in.');
  END IF;

  IF p_qty IS NULL OR p_qty <= 0 OR p_qty > 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be between 1 and 10000.');
  END IF;

  SELECT quantity_in_stock INTO v_cur FROM inventory_items
  WHERE id = p_inventory_item_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inventory item not found.');
  END IF;

  v_new := v_cur + p_qty;

  UPDATE inventory_items
  SET quantity_in_stock = v_new, last_restocked_at = NOW()
  WHERE id = p_inventory_item_id;

  INSERT INTO inventory_transactions
    (inventory_item_id, medication_id, transaction_type, quantity_change, quantity_before, quantity_after, performed_by, notes)
  VALUES
    (p_inventory_item_id, p_medication_id, 'restock', p_qty, v_cur, v_new, v_uid, NULLIF(TRIM(p_notes), ''));

  RETURN jsonb_build_object('success', true, 'new_stock', v_new);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION restock_item(UUID, UUID, INTEGER, TEXT) TO authenticated;
