-- =============================================================================
-- CampusCare — Migration 002: Row Level Security Policies
-- =============================================================================
-- Security is enforced at the database level, not just the frontend.
-- Every sensitive table has RLS enabled with explicit policies.
-- =============================================================================

-- ─── Enable RLS on all tables ─────────────────────────────────────────────────

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

-- ─── Helper functions ─────────────────────────────────────────────────────────

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

-- ─── PROFILES ─────────────────────────────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "profiles: read own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Staff can read other profiles (for operational lookups)
CREATE POLICY "profiles: staff read all"
  ON profiles FOR SELECT
  USING (auth_has_role('receptionist', 'doctor', 'pharmacist', 'admin', 'management'));

-- Users can update their own profile (limited fields — enforced in app layer)
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

-- ─── STUDENTS ─────────────────────────────────────────────────────────────────

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

-- ─── CLINIC PROFILES ──────────────────────────────────────────────────────────

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

-- ─── STAFF PROFILES ───────────────────────────────────────────────────────────

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

-- ─── APPOINTMENTS ─────────────────────────────────────────────────────────────

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

-- ─── VISITS ───────────────────────────────────────────────────────────────────

-- Students see only their own visits (status only — not full clinical detail)
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

-- ─── QUEUE ENTRIES ────────────────────────────────────────────────────────────

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

-- ─── MEDICAL RECORDS ──────────────────────────────────────────────────────────
-- Highly restricted. Students see a limited view; full clinical notes for doctors only.

-- Students can see their own medical records (limited — app layer controls fields)
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

-- ─── MEDICATIONS ──────────────────────────────────────────────────────────────

-- All authenticated staff can read medications
CREATE POLICY "medications: staff read"
  ON medications FOR SELECT
  USING (auth_has_role('doctor', 'pharmacist', 'admin', 'receptionist'));

-- Students can read medication names (for their prescriptions)
CREATE POLICY "medications: student read"
  ON medications FOR SELECT
  USING (auth_uid() IS NOT NULL AND auth_user_role() = 'student');

-- Pharmacists and admins manage medications
CREATE POLICY "medications: pharmacist write"
  ON medications FOR INSERT
  WITH CHECK (auth_has_role('pharmacist', 'admin'));

CREATE POLICY "medications: pharmacist update"
  ON medications FOR UPDATE
  USING (auth_has_role('pharmacist', 'admin'));

-- ─── INVENTORY ITEMS ──────────────────────────────────────────────────────────

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

-- ─── INVENTORY TRANSACTIONS ───────────────────────────────────────────────────

-- Pharmacists read their own transactions; admins and management read all
CREATE POLICY "inventory_transactions: pharmacist read"
  ON inventory_transactions FOR SELECT
  USING (auth_has_role('pharmacist', 'admin', 'management'));

-- Only pharmacists/admins insert (append-only — no updates/deletes via RLS)
CREATE POLICY "inventory_transactions: pharmacist insert"
  ON inventory_transactions FOR INSERT
  WITH CHECK (auth_has_role('pharmacist', 'admin'));

-- ─── PRESCRIPTIONS ────────────────────────────────────────────────────────────

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

-- ─── PRESCRIPTION ITEMS ───────────────────────────────────────────────────────

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

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

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

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

-- Admins read audit logs
CREATE POLICY "audit_logs: admin read"
  ON audit_logs FOR SELECT
  USING (auth_has_role('admin'));

-- Audit inserts done server-side (service role). Allow own inserts as fallback.
CREATE POLICY "audit_logs: authenticated insert"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── CLINIC SETTINGS ──────────────────────────────────────────────────────────

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
