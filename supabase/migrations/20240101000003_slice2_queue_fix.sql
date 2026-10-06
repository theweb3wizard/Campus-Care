-- =============================================================================
-- CampusCare — Migration 004: Slice 2 Reception Queue fix (simple)
-- Run AFTER 003. Free, no extensions, easy to debug.
-- =============================================================================

-- ─── 1. Add missing queue_date column (code already uses it) ─────────────────

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS queue_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Backfill from created_at for old rows
UPDATE queue_entries
SET queue_date = (created_at AT TIME ZONE 'UTC')::DATE
WHERE queue_date IS NULL OR queue_date <> (created_at AT TIME ZONE 'UTC')::DATE;

-- Replace expression index with simple per-day unique
DROP INDEX IF EXISTS idx_queue_entries_number_per_day;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_queue_number_per_day
  ON queue_entries (queue_date, queue_number);

CREATE INDEX IF NOT EXISTS idx_queue_entries_queue_date
  ON queue_entries (queue_date, status, queue_number);

-- ─── 2. Prevent double check-in at DB level (grandma double-click safe) ───────

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_visit_per_day
  ON visits (student_id, visit_date)
  WHERE status NOT IN ('completed', 'cancelled', 'no_show');

-- ─── 3. Fixed queue-number helper (uses queue_date, not created_at::DATE) ─────

CREATE OR REPLACE FUNCTION get_next_queue_number()
RETURNS INTEGER AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_number), 0) + 1
  INTO v_next
  FROM queue_entries
  WHERE queue_date = CURRENT_DATE;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- ─── 4. One-transaction check-in: visit + queue together, no orphans ──────────
-- Reception calls this instead of insert-visit then insert-queue.
-- Serializes per-day numbering with a lock so two clerks can't take same number.

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
  -- Duplicate guard (DB index also enforces this)
  IF EXISTS (
    SELECT 1 FROM visits
    WHERE student_id = p_student_id
      AND visit_date = v_today
      AND status NOT IN ('completed', 'cancelled', 'no_show')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This student already has an active visit today.');
  END IF;

  -- Create visit
  INSERT INTO visits (student_id, clinic_profile_id, checked_in_by, status, visit_date, notes)
  VALUES (p_student_id, p_clinic_profile_id, p_checked_in_by, 'queued', v_today, p_notes)
  RETURNING id INTO v_visit_id;

  -- Take next number with a lock + retry on rare collision
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
      -- retry with next number
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'visit_id', v_visit_id,
    'queue_entry_id', v_queue_id,
    'queue_number', v_queue_num
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION check_in_student(UUID, UUID, UUID, TEXT) TO authenticated;
