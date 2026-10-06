-- =============================================================================
-- CampusCare - FULL SETUP (run once on a fresh database)
-- Squash of all migrations in order + final fixes + seed. Slices 1-8.
-- Run this ONE file in Supabase Dashboard > SQL.
-- =============================================================================

-- --- SOURCE: supabase/migrations/20240101000000_initial_schema.sql ---
-- =============================================================================
-- CampusCare â€” Migration 001: Initial Schema
-- =============================================================================
-- Run this first, then run migration 002 (RLS policies).
-- Tested against Supabase (PostgreSQL 15).
-- =============================================================================

-- â”€â”€â”€ Extensions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- â”€â”€â”€ Enums â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ updated_at trigger function (created early, reused by all tables) â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- â”€â”€â”€ Profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Students â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Clinic file number sequence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE SEQUENCE IF NOT EXISTS clinic_file_number_seq START 1;

-- â”€â”€â”€ Clinic Profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Staff Profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Appointments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Visits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Queue Entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- Unique queue number per calendar day â€” must be a partial/expression unique index,
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

-- â”€â”€â”€ Medical Records â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Medications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Inventory Items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Inventory Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Prescriptions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Prescription Items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Audit Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Clinic Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Trigger: Auto-create profile when a new auth user signs up â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Trigger: Auto-update inventory status when stock quantity changes â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Function: Get next queue number for today â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Default clinic settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO clinic_settings (key, value, description) VALUES
  ('clinic_name',         'University Health Centre', 'Display name of the clinic'),
  ('clinic_phone',        '',                         'Clinic contact phone number'),
  ('clinic_email',        '',                         'Clinic contact email'),
  ('working_hours_start', '08:00',                    'Clinic opening time (HH:MM)'),
  ('working_hours_end',   '17:00',                    'Clinic closing time (HH:MM)'),
  ('low_stock_threshold', '10',                       'Default low-stock alert threshold'),
  ('max_daily_queue',     '100',                      'Maximum queue entries per day')
ON CONFLICT (key) DO NOTHING;


-- --- SOURCE: supabase/migrations/20240101000001_rls_policies.sql ---
-- =============================================================================
-- CampusCare â€” Migration 002: Row Level Security Policies
-- =============================================================================
-- Security is enforced at the database level, not just the frontend.
-- Every sensitive table has RLS enabled with explicit policies.
-- =============================================================================

-- â”€â”€â”€ Enable RLS on all tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE students              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits                ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_settings       ENABLE ROW LEVEL SECURITY;

-- â”€â”€â”€ Helper functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Get current user's role
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user has one of the given roles
CREATE OR REPLACE FUNCTION auth_has_role(VARIADIC roles user_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = ANY(roles)
      AND status = 'active'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Get student id for the current authenticated user
CREATE OR REPLACE FUNCTION auth_student_id()
RETURNS UUID AS $$
  SELECT id FROM students WHERE profile_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- â”€â”€â”€ PROFILES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Users can read their own profile
CREATE POLICY "profiles: read own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Staff can read other profiles (for operational lookups)
CREATE POLICY "profiles: staff read all"
  ON profiles FOR SELECT
  USING (auth_has_role('receptionist', 'doctor', 'pharmacist', 'admin', 'management'));

-- Users can update their own profile (limited fields â€” enforced in app layer)
CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Admin can update any profile
CREATE POLICY "profiles: admin update all"
  ON profiles FOR UPDATE
  USING (auth_has_role('admin'));

-- Admins can insert new profiles (for staff creation)
CREATE POLICY "profiles: admin insert"
  ON profiles FOR INSERT
  WITH CHECK (auth_has_role('admin'));

-- â”€â”€â”€ STUDENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Students can read their own identity
CREATE POLICY "students: read own"
  ON students FOR SELECT
  USING (profile_id = auth.uid());

-- Receptionists, doctors, admins can read student records (for clinic ops)
CREATE POLICY "students: staff read"
  ON students FOR SELECT
  USING (auth_has_role('receptionist', 'doctor', 'pharmacist', 'admin', 'management'));

-- Students can update their own limited fields (phone, etc.)
-- App layer enforces which fields are mutable
CREATE POLICY "students: update own"
  ON students FOR UPDATE
  USING (profile_id = auth.uid());

-- Admin can insert pre-provisioned student records
CREATE POLICY "students: admin insert"
  ON students FOR INSERT
  WITH CHECK (auth_has_role('admin'));

-- Admin can update student records
CREATE POLICY "students: admin update"
  ON students FOR UPDATE
  USING (auth_has_role('admin'));

-- â”€â”€â”€ CLINIC PROFILES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Students can read their own clinic profile
CREATE POLICY "clinic_profiles: read own"
  ON clinic_profiles FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE profile_id = auth.uid()
    )
  );

-- Receptionists and doctors can read clinic profiles
CREATE POLICY "clinic_profiles: staff read"
  ON clinic_profiles FOR SELECT
  USING (auth_has_role('receptionist', 'doctor', 'pharmacist', 'admin'));

-- Receptionists can create and update clinic profiles
CREATE POLICY "clinic_profiles: receptionist write"
  ON clinic_profiles FOR INSERT
  WITH CHECK (auth_has_role('receptionist', 'admin'));

CREATE POLICY "clinic_profiles: receptionist update"
  ON clinic_profiles FOR UPDATE
  USING (auth_has_role('receptionist', 'admin'));

-- â”€â”€â”€ STAFF PROFILES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Staff can read their own staff profile
CREATE POLICY "staff_profiles: read own"
  ON staff_profiles FOR SELECT
  USING (profile_id = auth.uid());

-- Admin can read all staff profiles
CREATE POLICY "staff_profiles: admin read all"
  ON staff_profiles FOR SELECT
  USING (auth_has_role('admin'));

-- Admin can manage staff profiles
CREATE POLICY "staff_profiles: admin write"
  ON staff_profiles FOR INSERT
  WITH CHECK (auth_has_role('admin'));

CREATE POLICY "staff_profiles: admin update"
  ON staff_profiles FOR UPDATE
  USING (auth_has_role('admin'));

-- â”€â”€â”€ APPOINTMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Students see only their own appointments
CREATE POLICY "appointments: read own (student)"
  ON appointments FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE profile_id = auth.uid()
    )
  );

-- Receptionists and doctors can read all appointments
CREATE POLICY "appointments: staff read"
  ON appointments FOR SELECT
  USING (auth_has_role('receptionist', 'doctor', 'admin'));

-- Receptionists can create/update appointments
CREATE POLICY "appointments: receptionist write"
  ON appointments FOR INSERT
  WITH CHECK (auth_has_role('receptionist', 'admin'));

CREATE POLICY "appointments: receptionist update"
  ON appointments FOR UPDATE
  USING (auth_has_role('receptionist', 'admin'));

-- â”€â”€â”€ VISITS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Students see only their own visits (status only â€” not full clinical detail)
CREATE POLICY "visits: read own (student)"
  ON visits FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE profile_id = auth.uid()
    )
  );

-- Receptionists, doctors, pharmacists, admins can read visits
CREATE POLICY "visits: staff read"
  ON visits FOR SELECT
  USING (auth_has_role('receptionist', 'doctor', 'pharmacist', 'admin'));

-- Receptionists create visits (check-in)
CREATE POLICY "visits: receptionist insert"
  ON visits FOR INSERT
  WITH CHECK (auth_has_role('receptionist', 'admin'));

-- Receptionists and doctors can update visit status
CREATE POLICY "visits: staff update"
  ON visits FOR UPDATE
  USING (auth_has_role('receptionist', 'doctor', 'pharmacist', 'admin'));

-- â”€â”€â”€ QUEUE ENTRIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Students see only their own queue entry (NOT position of others)
CREATE POLICY "queue_entries: read own (student)"
  ON queue_entries FOR SELECT
  USING (
    clinic_profile_id IN (
      SELECT cp.id FROM clinic_profiles cp
      JOIN students s ON s.id = cp.student_id
      WHERE s.profile_id = auth.uid()
    )
  );

-- Receptionists and doctors see all queue entries
CREATE POLICY "queue_entries: staff read"
  ON queue_entries FOR SELECT
  USING (auth_has_role('receptionist', 'doctor', 'pharmacist', 'admin'));

-- Receptionists create queue entries
CREATE POLICY "queue_entries: receptionist insert"
  ON queue_entries FOR INSERT
  WITH CHECK (auth_has_role('receptionist', 'admin'));

-- Receptionists and doctors update queue entries
CREATE POLICY "queue_entries: staff update"
  ON queue_entries FOR UPDATE
  USING (auth_has_role('receptionist', 'doctor', 'admin'));

-- â”€â”€â”€ MEDICAL RECORDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Highly restricted. Students see a limited view; full clinical notes for doctors only.

-- Students can see their own medical records (limited â€” app layer controls fields)
CREATE POLICY "medical_records: read own (student)"
  ON medical_records FOR SELECT
  USING (
    visit_id IN (
      SELECT v.id FROM visits v
      JOIN students s ON s.id = v.student_id
      WHERE s.profile_id = auth.uid()
    )
  );

-- Doctors can read all medical records for their patients
CREATE POLICY "medical_records: doctor read"
  ON medical_records FOR SELECT
  USING (auth_has_role('doctor', 'admin'));

-- Doctors create and update medical records
CREATE POLICY "medical_records: doctor write"
  ON medical_records FOR INSERT
  WITH CHECK (auth_has_role('doctor'));

CREATE POLICY "medical_records: doctor update"
  ON medical_records FOR UPDATE
  USING (auth_has_role('doctor') AND doctor_id = auth.uid());

-- â”€â”€â”€ MEDICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- All authenticated staff can read medications
CREATE POLICY "medications: staff read"
  ON medications FOR SELECT
  USING (auth_has_role('doctor', 'pharmacist', 'admin', 'receptionist'));

-- Students can read medication names (for their prescriptions)
CREATE POLICY "medications: student read"
  ON medications FOR SELECT
  USING (auth_has_role('student'));

-- Pharmacists and admins manage medications
CREATE POLICY "medications: pharmacist write"
  ON medications FOR INSERT
  WITH CHECK (auth_has_role('pharmacist', 'admin'));

CREATE POLICY "medications: pharmacist update"
  ON medications FOR UPDATE
  USING (auth_has_role('pharmacist', 'admin'));

-- â”€â”€â”€ INVENTORY ITEMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Pharmacists and admins manage inventory
CREATE POLICY "inventory_items: pharmacist read"
  ON inventory_items FOR SELECT
  USING (auth_has_role('pharmacist', 'admin', 'management'));

CREATE POLICY "inventory_items: pharmacist write"
  ON inventory_items FOR INSERT
  WITH CHECK (auth_has_role('pharmacist', 'admin'));

CREATE POLICY "inventory_items: pharmacist update"
  ON inventory_items FOR UPDATE
  USING (auth_has_role('pharmacist', 'admin'));

-- â”€â”€â”€ INVENTORY TRANSACTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Pharmacists read their own transactions; admins and management read all
CREATE POLICY "inventory_transactions: pharmacist read"
  ON inventory_transactions FOR SELECT
  USING (auth_has_role('pharmacist', 'admin', 'management'));

-- Only pharmacists/admins insert (append-only â€” no updates/deletes via RLS)
CREATE POLICY "inventory_transactions: pharmacist insert"
  ON inventory_transactions FOR INSERT
  WITH CHECK (auth_has_role('pharmacist', 'admin'));

-- â”€â”€â”€ PRESCRIPTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Students see only their own prescriptions
CREATE POLICY "prescriptions: read own (student)"
  ON prescriptions FOR SELECT
  USING (
    clinic_profile_id IN (
      SELECT cp.id FROM clinic_profiles cp
      JOIN students s ON s.id = cp.student_id
      WHERE s.profile_id = auth.uid()
    )
  );

-- Doctors, pharmacists, admins see all prescriptions
CREATE POLICY "prescriptions: staff read"
  ON prescriptions FOR SELECT
  USING (auth_has_role('doctor', 'pharmacist', 'admin'));

-- Doctors create prescriptions
CREATE POLICY "prescriptions: doctor insert"
  ON prescriptions FOR INSERT
  WITH CHECK (auth_has_role('doctor'));

-- Doctors and pharmacists update prescriptions
CREATE POLICY "prescriptions: doctor update"
  ON prescriptions FOR UPDATE
  USING (auth_has_role('doctor', 'pharmacist', 'admin'));

-- â”€â”€â”€ PRESCRIPTION ITEMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Students see their own prescription items
CREATE POLICY "prescription_items: read own (student)"
  ON prescription_items FOR SELECT
  USING (
    prescription_id IN (
      SELECT p.id FROM prescriptions p
      JOIN clinic_profiles cp ON cp.id = p.clinic_profile_id
      JOIN students s ON s.id = cp.student_id
      WHERE s.profile_id = auth.uid()
    )
  );

-- Doctors and pharmacists see all prescription items
CREATE POLICY "prescription_items: staff read"
  ON prescription_items FOR SELECT
  USING (auth_has_role('doctor', 'pharmacist', 'admin'));

-- Doctors create prescription items
CREATE POLICY "prescription_items: doctor insert"
  ON prescription_items FOR INSERT
  WITH CHECK (auth_has_role('doctor'));

-- Pharmacists update prescription items (for dispensing)
CREATE POLICY "prescription_items: pharmacist update"
  ON prescription_items FOR UPDATE
  USING (auth_has_role('doctor', 'pharmacist', 'admin'));

-- â”€â”€â”€ NOTIFICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Users read only their own notifications
CREATE POLICY "notifications: read own"
  ON notifications FOR SELECT
  USING (profile_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "notifications: update own"
  ON notifications FOR UPDATE
  USING (profile_id = auth.uid());

-- System can insert notifications (via service role or DB function)
-- In app: notifications are inserted by server-side code using service role
-- For simplicity, allow authenticated users to insert for their own profile
CREATE POLICY "notifications: insert own"
  ON notifications FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- â”€â”€â”€ AUDIT LOGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Admins read audit logs
CREATE POLICY "audit_logs: admin read"
  ON audit_logs FOR SELECT
  USING (auth_has_role('admin'));

-- Audit inserts done server-side (service role). Allow own inserts as fallback.
CREATE POLICY "audit_logs: authenticated insert"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- â”€â”€â”€ CLINIC SETTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- All authenticated staff can read settings
CREATE POLICY "clinic_settings: staff read"
  ON clinic_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admin can modify settings
CREATE POLICY "clinic_settings: admin write"
  ON clinic_settings FOR INSERT
  WITH CHECK (auth_has_role('admin'));

CREATE POLICY "clinic_settings: admin update"
  ON clinic_settings FOR UPDATE
  USING (auth_has_role('admin'));


-- --- SOURCE: supabase/migrations/20240101000002_slice1_auth_fix.sql ---
-- =============================================================================
-- CampusCare â€” Migration 003: Slice 1 Auth + Registration fix
-- Simple, free, easy to debug. No extra extensions or paid services.
-- Run AFTER 001 + 002.
-- =============================================================================

-- â”€â”€â”€ 1. Lock signup: everyone starts as student, no client role â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ 2. Block self-promotion: students cannot change their own role/status â”€â”€â”€â”€

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

-- â”€â”€â”€ 3. Verify step for anonymous users (no RLS hole) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ 4. Claim step: link auth user to pre-provisioned student row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- --- SOURCE: supabase/migrations/20240101000003_slice2_queue_fix.sql ---
-- =============================================================================
-- CampusCare â€” Migration 004: Slice 2 Reception Queue fix (simple)
-- Run AFTER 003. Free, no extensions, easy to debug.
-- =============================================================================

-- â”€â”€â”€ 1. Add missing queue_date column (code already uses it) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ 2. Prevent double check-in at DB level (grandma double-click safe) â”€â”€â”€â”€â”€â”€â”€

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_visit_per_day
  ON visits (student_id, visit_date)
  WHERE status NOT IN ('completed', 'cancelled', 'no_show');

-- â”€â”€â”€ 3. Fixed queue-number helper (uses queue_date, not created_at::DATE) â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ 4. One-transaction check-in: visit + queue together, no orphans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


-- --- SOURCE: supabase/migrations/20240101000004_slice3_doctor_fix.sql ---
-- =============================================================================
-- CampusCare â€” Migration 005: Slice 3 Doctor consult fix (simple)
-- Run AFTER 004. One-transaction transitions, no half-applied states.
-- =============================================================================

-- â”€â”€â”€ 1. Allow doctors to remove their own pending items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ 2. Start consultation: queue + visit move together â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ 3. Complete consultation: smart routing to pharmacy or done â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- If a prescription with items exists â†’ awaiting_pharmacy, else completed.

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

-- â”€â”€â”€ 4. Finalize prescription from consult page: rx + visit + queue together â”€â”€

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


-- --- SOURCE: supabase/migrations/20240101000005_slice4_pharmacy_fix.sql ---
-- =============================================================================
-- CampusCare â€” Migration 006: Slice 4 Pharmacy fix (simple, atomic)
-- Run AFTER 005. No new extensions. One-transaction dispense + restock.
-- =============================================================================

-- â”€â”€â”€ 1. Atomic dispense: stock + item + prescription + visit together â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ 2. Atomic restock: stock + ledger together, rejects bad qty â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


-- --- SOURCE: supabase/migrations/20240101000006_slice5_booking_notify_fix.sql ---
-- =============================================================================
-- CampusCare â€” Migration 007: Slice 5 Booking + Notifications (simple)
-- Run AFTER 006. Students can book/cancel own appointments. Notifications work.
-- =============================================================================

-- â”€â”€â”€ 1. Students book their own appointments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ 2. Notifications that actually deliver (bypasses RLS safely) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ 3. Book appointment: one active at a time, no past dates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ 4. Cancel own appointment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


-- --- SOURCE: supabase/migrations/20240101000007_slice6_admin_fix.sql ---
-- =============================================================================
-- CampusCare â€” Migration 008: Slice 6 Admin fix (simple)
-- Run AFTER 007. Real audit log, last-admin guard, staff link helper.
-- =============================================================================

-- â”€â”€â”€ 1. Real audit writer (any signed-in user logs own actions, no forgery) â”€â”€â”€
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

-- â”€â”€â”€ 2. Audit inside key RPCs (no app changes needed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ 3. Helper: admin creates staff link (auth user made server-side first) â”€â”€â”€
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


-- --- SOURCE: supabase/migrations/20240101000008_slice8a_lab.sql ---
-- =============================================================================
-- CampusCare â€” Migration 008: Slice 8a Lab (simple, text-only, no new roles)
-- Doctor orders â†’ marks sampled â†’ enters result text â†’ student bell + views it.
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

-- â”€â”€â”€ Order a test â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Mark sample collected â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Save result â†’ ready + notify student â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


-- --- SOURCE: supabase/migrations/20240101000009_slice8b_pregnancy_questionnaire.sql ---
-- =============================================================================
-- CampusCare â€” Migration 009: Slice 8b Pregnancy + Questionnaire (simple)
-- Pregnancy: student opts in privately, staff sees banner in consultation.
-- Questionnaire: 7 fixed questions, JSON answers, doctor reads latest.
-- =============================================================================

-- â”€â”€â”€ Pregnancy records â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Questionnaire responses (one row per visit, JSON answers) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


-- --- SOURCE: supabase/migrations/20240101000010_slice8c_emergency_directory.sql ---
-- =============================================================================
-- CampusCare â€” Migration 010: Slice 8c Emergency + Doctor Directory (simple)
-- Emergency: public report â†’ reception banner â†’ acknowledge/resolve.
-- Directory: view of active doctors for the student finder page.
-- =============================================================================

-- â”€â”€â”€ Emergency requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- Anyone (even logged out) can report â€” it's an emergency
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
    RETURN jsonb_build_object('success', false, 'error', 'Say where you are (hostel, gate, facultyâ€¦).');
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

-- â”€â”€â”€ Doctor directory view (expert finder, simple) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR REPLACE VIEW doctor_directory AS
SELECT p.full_name, sp.specialization, sp.department
FROM staff_profiles sp
JOIN profiles p ON p.id = sp.profile_id
WHERE p.role = 'doctor' AND p.status = 'active' AND sp.is_active = true
ORDER BY p.full_name;

GRANT SELECT ON doctor_directory TO authenticated;

-- =============================================================================
-- FINAL FIXES: history view + realtime (idempotent, safe to re-run)
-- =============================================================================

CREATE OR REPLACE VIEW student_medical_record_summary AS
SELECT
  v.id,
  v.visit_date,
  v.status,
  mr.complaint,
  mr.diagnosis,
  mr.follow_up_date,
  pr.status AS prescription_status,
  cp.student_id
FROM visits v
JOIN clinic_profiles cp ON cp.id = v.clinic_profile_id
LEFT JOIN medical_records mr ON mr.visit_id = v.id
LEFT JOIN prescriptions pr ON pr.visit_id = v.id;

GRANT SELECT ON student_medical_record_summary TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE queue_entries; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE visits; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE prescriptions; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE emergency_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE test_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- =============================================================================
-- CampusCare â€” Demo Seed Data
-- =============================================================================
-- Run AFTER both migrations.
--
-- This seeds:
--   1. Pre-provisioned students (unclaimed â€” use onboarding to claim them)
--   2. Medication catalog + initial inventory
--   3. Default clinic settings (already in migration, but safe to re-run)
--
-- â”€â”€â”€ STAFF ACCOUNTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Staff cannot be seeded directly into auth.users via SQL.
-- Create staff accounts using the Admin UI at /admin/staff after seeding.
--
-- Suggested demo staff to create via UI:
--   Receptionist : Amaka Obi       | amaka.obi@clinic.demo       | pass: CampusCare@2024!
--   Doctor       : Dr. Chidi Eze   | chidi.eze@clinic.demo       | pass: CampusCare@2024!
--   Pharmacist   : Ngozi Adeyemi   | ngozi.adeyemi@clinic.demo   | pass: CampusCare@2024!
--   Admin        : Admin User      | admin@clinic.demo           | pass: CampusCare@2024!
--   Management   : Dean Okonkwo    | dean.okonkwo@clinic.demo    | pass: CampusCare@2024!
--
-- â”€â”€â”€ DEMO STUDENT CREDENTIALS (after using /onboarding) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
--   REG: CSC/2021/001  EMAIL: ada.okafor@university.edu.ng     (Computer Science, 300L)
--   REG: EEE/2022/047  EMAIL: emeka.nwosu@university.edu.ng    (Electrical Eng, 200L)
--   REG: MED/2020/012  EMAIL: ngozi.ibrahim@university.edu.ng  (Medicine, 400L)
--   REG: LAW/2023/088  EMAIL: tunde.adeleke@university.edu.ng  (Law, 100L)
--   REG: BUS/2021/034  EMAIL: fatima.musa@university.edu.ng    (Business Admin, 300L)
-- =============================================================================

-- â”€â”€â”€ Pre-provisioned Students â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO students (
  id, registration_number, institutional_email,
  full_name, department, faculty, level,
  date_of_birth, gender, is_claimed
) VALUES
  (
    'a1b2c3d4-0001-0001-0001-000000000001',
    'CSC/2021/001', 'ada.okafor@university.edu.ng',
    'Ada Okafor', 'Computer Science', 'Faculty of Science', '300',
    '2001-03-15', 'female', false
  ),
  (
    'a1b2c3d4-0002-0002-0002-000000000002',
    'EEE/2022/047', 'emeka.nwosu@university.edu.ng',
    'Emeka Nwosu', 'Electrical Engineering', 'Faculty of Engineering', '200',
    '2002-07-22', 'male', false
  ),
  (
    'a1b2c3d4-0003-0003-0003-000000000003',
    'MED/2020/012', 'ngozi.ibrahim@university.edu.ng',
    'Ngozi Ibrahim', 'Medicine & Surgery', 'College of Medicine', '400',
    '2000-11-08', 'female', false
  ),
  (
    'a1b2c3d4-0004-0004-0004-000000000004',
    'LAW/2023/088', 'tunde.adeleke@university.edu.ng',
    'Tunde Adeleke', 'Law', 'Faculty of Law', '100',
    '2003-01-30', 'male', false
  ),
  (
    'a1b2c3d4-0005-0005-0005-000000000005',
    'BUS/2021/034', 'fatima.musa@university.edu.ng',
    'Fatima Musa', 'Business Administration', 'Faculty of Management Sciences', '300',
    '2001-09-14', 'female', false
  ),
  (
    'a1b2c3d4-0006-0006-0006-000000000006',
    'MED/2021/009', 'kelechi.okafor@university.edu.ng',
    'Kelechi Okafor', 'Biochemistry', 'Faculty of Science', '300',
    '2001-05-20', 'male', false
  ),
  (
    'a1b2c3d4-0007-0007-0007-000000000007',
    'ENG/2023/055', 'aisha.bello@university.edu.ng',
    'Aisha Bello', 'Civil Engineering', 'Faculty of Engineering', '100',
    '2003-08-11', 'female', false
  ),
  (
    'a1b2c3d4-0008-0008-0008-000000000008',
    'SCI/2020/031', 'david.okonkwo@university.edu.ng',
    'David Okonkwo', 'Physics', 'Faculty of Science', '400',
    '2000-02-28', 'male', false
  )
ON CONFLICT (registration_number) DO NOTHING;

-- â”€â”€â”€ Medications catalog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO medications (id, name, generic_name, category, unit, description, is_active) VALUES
  ('med00001-0000-0000-0000-000000000001', 'Paracetamol 500mg',
   'Paracetamol', 'Analgesic / Antipyretic', 'tablets',
   'For pain relief and fever reduction', true),
  ('med00001-0000-0000-0000-000000000002', 'Amoxicillin 250mg',
   'Amoxicillin', 'Antibiotic', 'capsules',
   'Broad-spectrum penicillin antibiotic', true),
  ('med00001-0000-0000-0000-000000000003', 'Ibuprofen 400mg',
   'Ibuprofen', 'NSAID', 'tablets',
   'Anti-inflammatory and pain relief', true),
  ('med00001-0000-0000-0000-000000000004', 'Metronidazole 200mg',
   'Metronidazole', 'Antibiotic', 'tablets',
   'For bacterial and parasitic infections', true),
  ('med00001-0000-0000-0000-000000000005', 'Oral Rehydration Salts',
   'ORS', 'Electrolyte', 'sachets',
   'For rehydration in diarrhoea and vomiting', true),
  ('med00001-0000-0000-0000-000000000006', 'Chlorphenamine 4mg',
   'Chlorphenamine', 'Antihistamine', 'tablets',
   'For allergic reactions and hay fever', true),
  ('med00001-0000-0000-0000-000000000007', 'Omeprazole 20mg',
   'Omeprazole', 'Proton Pump Inhibitor', 'capsules',
   'For acid reflux and peptic ulcer', true),
  ('med00001-0000-0000-0000-000000000008', 'Artemether/Lumefantrine 20/120mg',
   'Artemether/Lumefantrine', 'Antimalarial', 'tablets',
   'First-line antimalarial treatment', true),
  ('med00001-0000-0000-0000-000000000009', 'Diclofenac 50mg',
   'Diclofenac', 'NSAID', 'tablets',
   'Anti-inflammatory for pain and swelling', true),
  ('med00001-0000-0000-0000-000000000010', 'Vitamin C 200mg',
   'Ascorbic Acid', 'Vitamin Supplement', 'tablets',
   'Immune support and antioxidant', true),
  ('med00001-0000-0000-0000-000000000011', 'Cotrimoxazole 480mg',
   'Co-trimoxazole', 'Antibiotic', 'tablets',
   'For urinary tract and respiratory infections', true),
  ('med00001-0000-0000-0000-000000000012', 'Antacid Suspension',
   'Aluminium Hydroxide', 'Antacid', 'ml',
   'For heartburn and indigestion', true)
ON CONFLICT (id) DO NOTHING;

-- â”€â”€â”€ Inventory (initial stock) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO inventory_items (
  medication_id, quantity_in_stock, low_stock_threshold,
  unit_cost, status
) VALUES
  ('med00001-0000-0000-0000-000000000001', 500, 50, 0.50, 'in_stock'),
  ('med00001-0000-0000-0000-000000000002', 200, 30, 2.50, 'in_stock'),
  ('med00001-0000-0000-0000-000000000003', 300, 40, 1.20, 'in_stock'),
  ('med00001-0000-0000-0000-000000000004', 150, 25, 1.80, 'in_stock'),
  ('med00001-0000-0000-0000-000000000005',  80, 20, 0.80, 'in_stock'),
  ('med00001-0000-0000-0000-000000000006',  18, 20, 0.60, 'low_stock'),
  ('med00001-0000-0000-0000-000000000007', 120, 20, 3.50, 'in_stock'),
  ('med00001-0000-0000-0000-000000000008',  45, 30, 8.00, 'in_stock'),
  ('med00001-0000-0000-0000-000000000009',   0, 20, 1.50, 'out_of_stock'),
  ('med00001-0000-0000-0000-000000000010', 400, 50, 0.30, 'in_stock'),
  ('med00001-0000-0000-0000-000000000011',  90, 25, 1.20, 'in_stock'),
  ('med00001-0000-0000-0000-000000000012',  60, 15, 2.20, 'in_stock')
ON CONFLICT (medication_id) DO NOTHING;

-- â”€â”€â”€ Clinic Settings (idempotent) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO clinic_settings (key, value, description) VALUES
  ('clinic_name',         'University Health Centre', 'Display name of the clinic'),
  ('clinic_phone',        '+234 800 000 0000',         'Clinic contact phone number'),
  ('clinic_email',        'clinic@university.edu.ng',  'Clinic contact email'),
  ('working_hours_start', '08:00',                     'Clinic opening time (HH:MM)'),
  ('working_hours_end',   '17:00',                     'Clinic closing time (HH:MM)'),
  ('low_stock_threshold', '10',                        'Default low-stock alert threshold'),
  ('max_daily_queue',     '100',                       'Maximum queue entries per day')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

