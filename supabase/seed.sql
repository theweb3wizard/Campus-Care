-- =============================================================================
-- CampusCare — Demo Seed Data
-- =============================================================================
-- Run AFTER both migrations.
--
-- This seeds:
--   1. Pre-provisioned students (unclaimed — use onboarding to claim them)
--   2. Medication catalog + initial inventory
--   3. Default clinic settings (already in migration, but safe to re-run)
--
-- ─── STAFF ACCOUNTS ───────────────────────────────────────────────────────────
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
-- ─── DEMO STUDENT CREDENTIALS (after using /onboarding) ──────────────────────
--   REG: CSC/2021/001  EMAIL: ada.okafor@university.edu.ng     (Computer Science, 300L)
--   REG: EEE/2022/047  EMAIL: emeka.nwosu@university.edu.ng    (Electrical Eng, 200L)
--   REG: MED/2020/012  EMAIL: ngozi.ibrahim@university.edu.ng  (Medicine, 400L)
--   REG: LAW/2023/088  EMAIL: tunde.adeleke@university.edu.ng  (Law, 100L)
--   REG: BUS/2021/034  EMAIL: fatima.musa@university.edu.ng    (Business Admin, 300L)
-- =============================================================================

-- ─── Pre-provisioned Students ─────────────────────────────────────────────────

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

-- ─── Medications catalog ──────────────────────────────────────────────────────

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

-- ─── Inventory (initial stock) ────────────────────────────────────────────────

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

-- ─── Clinic Settings (idempotent) ─────────────────────────────────────────────

INSERT INTO clinic_settings (key, value, description) VALUES
  ('clinic_name',         'University Health Centre', 'Display name of the clinic'),
  ('clinic_phone',        '+234 800 000 0000',         'Clinic contact phone number'),
  ('clinic_email',        'clinic@university.edu.ng',  'Clinic contact email'),
  ('working_hours_start', '08:00',                     'Clinic opening time (HH:MM)'),
  ('working_hours_end',   '17:00',                     'Clinic closing time (HH:MM)'),
  ('low_stock_threshold', '10',                        'Default low-stock alert threshold'),
  ('max_daily_queue',     '100',                       'Maximum queue entries per day')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
