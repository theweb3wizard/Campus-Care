-- =============================================================================
-- CampusCare — Migration 001: Initial Schema
-- =============================================================================
-- Run this first, then run migration 002 (RLS policies).
-- Tested against Supabase (PostgreSQL 15).
-- =============================================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'student',
  'receptionist',
  'doctor',
  'pharmacist',
  'admin',
  'management'
);

CREATE TYPE profile_status AS ENUM (
  'active',
  'inactive',
  'suspended'
);

CREATE TYPE clinic_registration_status AS ENUM (
  'not_started',
  'in_progress',
  'awaiting_results',
  'completed'
);

CREATE TYPE appointment_status AS ENUM (
  'scheduled',
  'checked_in',
  'cancelled',
  'no_show',
  'completed'
);

CREATE TYPE visit_status AS ENUM (
  'checked_in',
  'queued',
  'in_consultation',
  'awaiting_pharmacy',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE queue_status AS ENUM (
  'waiting',
  'called',
  'in_consultation',
  'completed',
  'cancelled',
  'skipped'
);

CREATE TYPE prescription_status AS ENUM (
  'pending',
  'ready',
  'partially_dispensed',
  'dispensed',
  'unavailable',
  'cancelled'
);

CREATE TYPE prescription_item_status AS ENUM (
  'pending',
  'dispensed',
  'partially_dispensed',
  'unavailable',
  'cancelled'
);

CREATE TYPE inventory_status AS ENUM (
  'in_stock',
  'low_stock',
  'out_of_stock'
);

CREATE TYPE inventory_transaction_type AS ENUM (
  'dispensing',
  'restock',
  'adjustment',
  'expired',
  'returned'
);

CREATE TYPE notification_type AS ENUM (
  'onboarding',
  'appointment',
  'queue_update',
  'prescription_ready',
  'prescription_dispensed',
  'follow_up',
  'system'
);

-- ─── updated_at trigger function (created early, reused by all tables) ────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Profiles ─────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role      NOT NULL,
  full_name     TEXT           NOT NULL,
  email         TEXT           NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  status        profile_status NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role   ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_email  ON profiles(email);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Students ─────────────────────────────────────────────────────────────────

CREATE TABLE students (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID    UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  registration_number TEXT    NOT NULL UNIQUE,
  institutional_email TEXT    NOT NULL UNIQUE,
  full_name           TEXT    NOT NULL,
  department          TEXT,
  faculty             TEXT,
  level               TEXT,
  date_of_birth       DATE,
  gender              TEXT    CHECK (gender IN ('male', 'female', 'other')),
  is_claimed          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_profile_id          ON students(profile_id);
CREATE INDEX idx_students_registration_number ON students(registration_number);
CREATE INDEX idx_students_email               ON students(institutional_email);
CREATE INDEX idx_students_is_claimed          ON students(is_claimed);

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Clinic file number sequence ──────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS clinic_file_number_seq START 1;

-- ─── Clinic Profiles ──────────────────────────────────────────────────────────

CREATE TABLE clinic_profiles (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID    NOT NULL UNIQUE REFERENCES students(id) ON DELETE RESTRICT,
  file_number         TEXT    NOT NULL UNIQUE,
  registration_status clinic_registration_status NOT NULL DEFAULT 'not_started',
  blood_group         TEXT,
  genotype            TEXT,
  allergies           TEXT,
  registration_data   JSONB,
  registered_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clinic_profiles_student_id  ON clinic_profiles(student_id);
CREATE INDEX idx_clinic_profiles_file_number ON clinic_profiles(file_number);
CREATE INDEX idx_clinic_profiles_status      ON clinic_profiles(registration_status);

CREATE TRIGGER trg_clinic_profiles_updated_at
  BEFORE UPDATE ON clinic_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate file_number before insert
CREATE OR REPLACE FUNCTION generate_clinic_file_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_number IS NULL OR NEW.file_number = '' THEN
    NEW.file_number := 'CC-' || TO_CHAR(NOW(), 'YYYY') || '-'
                       || LPAD(NEXTVAL('clinic_file_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clinic_profiles_file_number
  BEFORE INSERT ON clinic_profiles
  FOR EACH ROW EXECUTE FUNCTION generate_clinic_file_number();

-- ─── Staff Profiles ───────────────────────────────────────────────────────────

CREATE TABLE staff_profiles (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID    NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id    TEXT    UNIQUE,
  department     TEXT,
  specialization TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_profiles_profile_id ON staff_profiles(profile_id);
CREATE INDEX idx_staff_profiles_is_active  ON staff_profiles(is_active);

CREATE TRIGGER trg_staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Appointments ─────────────────────────────────────────────────────────────

CREATE TABLE appointments (
  id                UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID               NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  clinic_profile_id UUID               NOT NULL REFERENCES clinic_profiles(id) ON DELETE RESTRICT,
  scheduled_at      TIMESTAMPTZ        NOT NULL,
  reason            TEXT,
  status            appointment_status NOT NULL DEFAULT 'scheduled',
  notes             TEXT,
  created_by        UUID               NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_student_id        ON appointments(student_id);
CREATE INDEX idx_appointments_clinic_profile_id ON appointments(clinic_profile_id);
CREATE INDEX idx_appointments_scheduled_at      ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status            ON appointments(status);

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Visits ───────────────────────────────────────────────────────────────────

CREATE TABLE visits (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID         NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  clinic_profile_id UUID         NOT NULL REFERENCES clinic_profiles(id) ON DELETE RESTRICT,
  appointment_id    UUID         REFERENCES appointments(id) ON DELETE SET NULL,
  checked_in_by     UUID         NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status            visit_status NOT NULL DEFAULT 'checked_in',
  check_in_time     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completion_time   TIMESTAMPTZ,
  visit_date        DATE         NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visits_student_id        ON visits(student_id);
CREATE INDEX idx_visits_clinic_profile_id ON visits(clinic_profile_id);
CREATE INDEX idx_visits_status            ON visits(status);
CREATE INDEX idx_visits_visit_date        ON visits(visit_date);
CREATE INDEX idx_visits_checked_in_by     ON visits(checked_in_by);

CREATE TRIGGER trg_visits_updated_at
  BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Queue Entries ────────────────────────────────────────────────────────────

CREATE TABLE queue_entries (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id                UUID         NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
  clinic_profile_id       UUID         NOT NULL REFERENCES clinic_profiles(id) ON DELETE RESTRICT,
  assigned_doctor_id      UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  queue_number            INTEGER      NOT NULL,
  status                  queue_status NOT NULL DEFAULT 'waiting',
  called_at               TIMESTAMPTZ,
  consultation_started_at TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  notes                   TEXT,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Unique queue number per calendar day — must be a partial/expression unique index,
-- not an inline CONSTRAINT (PostgreSQL does not allow expressions in inline UNIQUE).
CREATE UNIQUE INDEX idx_queue_entries_number_per_day
  ON queue_entries (queue_number, (created_at::DATE));

CREATE INDEX idx_queue_entries_visit_id        ON queue_entries(visit_id);
CREATE INDEX idx_queue_entries_status          ON queue_entries(status);
CREATE INDEX idx_queue_entries_assigned_doctor ON queue_entries(assigned_doctor_id);
CREATE INDEX idx_queue_entries_created_at      ON queue_entries(created_at);

CREATE TRIGGER trg_queue_entries_updated_at
  BEFORE UPDATE ON queue_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Medical Records ──────────────────────────────────────────────────────────

CREATE TABLE medical_records (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id               UUID NOT NULL UNIQUE REFERENCES visits(id) ON DELETE RESTRICT,
  doctor_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  complaint              TEXT,
  clinical_notes         TEXT,
  diagnosis              TEXT,
  assessment             TEXT,
  treatment_plan         TEXT,
  follow_up_instructions TEXT,
  follow_up_date         DATE,
  vital_signs            JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medical_records_visit_id  ON medical_records(visit_id);
CREATE INDEX idx_medical_records_doctor_id ON medical_records(doctor_id);

CREATE TRIGGER trg_medical_records_updated_at
  BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Medications ──────────────────────────────────────────────────────────────

CREATE TABLE medications (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL,
  generic_name TEXT,
  category     TEXT,
  unit         TEXT    NOT NULL DEFAULT 'tablets',
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medications_is_active ON medications(is_active);
CREATE INDEX idx_medications_name      ON medications(name);

CREATE TRIGGER trg_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Inventory Items ──────────────────────────────────────────────────────────

CREATE TABLE inventory_items (
  id                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id     UUID             NOT NULL UNIQUE REFERENCES medications(id) ON DELETE RESTRICT,
  quantity_in_stock INTEGER          NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
  low_stock_threshold INTEGER        NOT NULL DEFAULT 10,
  unit_cost         NUMERIC(10, 2),
  expiry_date       DATE,
  location          TEXT,
  status            inventory_status NOT NULL DEFAULT 'in_stock',
  last_restocked_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_items_medication_id ON inventory_items(medication_id);
CREATE INDEX idx_inventory_items_status        ON inventory_items(status);

CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Inventory Transactions ───────────────────────────────────────────────────
-- Append-only. No updates or deletes.

CREATE TABLE inventory_transactions (
  id                UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID                       NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  medication_id     UUID                       NOT NULL REFERENCES medications(id) ON DELETE RESTRICT,
  transaction_type  inventory_transaction_type NOT NULL,
  quantity_change   INTEGER                    NOT NULL,
  quantity_before   INTEGER                    NOT NULL,
  quantity_after    INTEGER                    NOT NULL CHECK (quantity_after >= 0),
  reference_id      UUID,
  performed_by      UUID                       NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  notes             TEXT,
  created_at        TIMESTAMPTZ                NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_txn_inventory_item ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inventory_txn_medication     ON inventory_transactions(medication_id);
CREATE INDEX idx_inventory_txn_type           ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_txn_created_at     ON inventory_transactions(created_at);
CREATE INDEX idx_inventory_txn_performed_by   ON inventory_transactions(performed_by);

-- ─── Prescriptions ────────────────────────────────────────────────────────────

CREATE TABLE prescriptions (
  id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id          UUID                NOT NULL UNIQUE REFERENCES visits(id) ON DELETE RESTRICT,
  medical_record_id UUID                REFERENCES medical_records(id) ON DELETE SET NULL,
  doctor_id         UUID                NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  clinic_profile_id UUID                NOT NULL REFERENCES clinic_profiles(id) ON DELETE RESTRICT,
  status            prescription_status NOT NULL DEFAULT 'pending',
  notes             TEXT,
  dispensed_by      UUID                REFERENCES profiles(id) ON DELETE SET NULL,
  dispensed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prescriptions_visit_id          ON prescriptions(visit_id);
CREATE INDEX idx_prescriptions_doctor_id         ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_clinic_profile_id ON prescriptions(clinic_profile_id);
CREATE INDEX idx_prescriptions_status            ON prescriptions(status);

CREATE TRIGGER trg_prescriptions_updated_at
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Prescription Items ───────────────────────────────────────────────────────

CREATE TABLE prescription_items (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id     UUID                     NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_id       UUID                     NOT NULL REFERENCES medications(id) ON DELETE RESTRICT,
  dosage              TEXT                     NOT NULL,
  frequency           TEXT                     NOT NULL,
  duration            TEXT,
  instructions        TEXT,
  quantity_prescribed INTEGER                  NOT NULL CHECK (quantity_prescribed > 0),
  quantity_dispensed  INTEGER                  NOT NULL DEFAULT 0 CHECK (quantity_dispensed >= 0),
  status              prescription_item_status NOT NULL DEFAULT 'pending',
  notes               TEXT,
  created_at          TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_dispensed_lte_prescribed CHECK (quantity_dispensed <= quantity_prescribed)
);

CREATE INDEX idx_prescription_items_prescription_id ON prescription_items(prescription_id);
CREATE INDEX idx_prescription_items_medication_id   ON prescription_items(medication_id);
CREATE INDEX idx_prescription_items_status          ON prescription_items(status);

CREATE TRIGGER trg_prescription_items_updated_at
  BEFORE UPDATE ON prescription_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Notifications ────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id         UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT              NOT NULL,
  message    TEXT              NOT NULL,
  is_read    BOOLEAN           NOT NULL DEFAULT FALSE,
  action_url TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_profile_id ON notifications(profile_id);
CREATE INDEX idx_notifications_is_read    ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type       ON notifications(type);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL,
  resource_type TEXT        NOT NULL,
  resource_id   UUID,
  metadata      JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_profile_id    ON audit_logs(profile_id);
CREATE INDEX idx_audit_logs_action        ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at    ON audit_logs(created_at);

-- ─── Clinic Settings ──────────────────────────────────────────────────────────

CREATE TABLE clinic_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL UNIQUE,
  value       TEXT        NOT NULL,
  description TEXT,
  updated_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_clinic_settings_updated_at
  BEFORE UPDATE ON clinic_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Trigger: Auto-create profile when a new auth user signs up ───────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role      user_role := 'student';
  v_full_name TEXT;
  v_meta      JSONB;
BEGIN
  v_meta := NEW.raw_user_meta_data;

  IF v_meta IS NOT NULL AND v_meta->>'role' IS NOT NULL THEN
    v_role := (v_meta->>'role')::user_role;
  END IF;

  v_full_name := COALESCE(
    v_meta->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, role, full_name, email, status)
  VALUES (NEW.id, v_role, v_full_name, NEW.email, 'active')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Trigger: Auto-update inventory status when stock quantity changes ─────────

CREATE OR REPLACE FUNCTION sync_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_in_stock = 0 THEN
    NEW.status := 'out_of_stock';
  ELSIF NEW.quantity_in_stock <= NEW.low_stock_threshold THEN
    NEW.status := 'low_stock';
  ELSE
    NEW.status := 'in_stock';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_inventory_status
  BEFORE INSERT OR UPDATE OF quantity_in_stock, low_stock_threshold ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION sync_inventory_status();

-- ─── Function: Get next queue number for today ────────────────────────────────

CREATE OR REPLACE FUNCTION get_next_queue_number()
RETURNS INTEGER AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_number), 0) + 1
  INTO v_next
  FROM queue_entries
  WHERE created_at::DATE = CURRENT_DATE;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- ─── Default clinic settings ──────────────────────────────────────────────────

INSERT INTO clinic_settings (key, value, description) VALUES
  ('clinic_name',         'University Health Centre', 'Display name of the clinic'),
  ('clinic_phone',        '',                         'Clinic contact phone number'),
  ('clinic_email',        '',                         'Clinic contact email'),
  ('working_hours_start', '08:00',                    'Clinic opening time (HH:MM)'),
  ('working_hours_end',   '17:00',                    'Clinic closing time (HH:MM)'),
  ('low_stock_threshold', '10',                       'Default low-stock alert threshold'),
  ('max_daily_queue',     '100',                      'Maximum queue entries per day')
ON CONFLICT (key) DO NOTHING;
