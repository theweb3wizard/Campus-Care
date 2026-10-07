-- Campus Care seed — demo registry + drugs. Run after 0001→0006 on a FRESH database.
-- Reg format: SCHOOL/DEPT/YEAR/SERIAL (e.g. FCO/CSC/24/1001).
-- Students claim these rows at signup (Reg No + name + email must all match).
-- Staff are NEVER seeded: admin creates invites in /admin, staff claim at signup.

insert into public.students (reg_number, full_name, institutional_email, faculty, department, phone) values
  ('FCO/CSC/24/1001', 'Amina Bello', 'amina.bello@fud.edu.ng', 'Computing', 'Computer Science', '08010000001'),
  ('FCO/EEE/23/1047', 'Chidi Okafor', 'chidi.okafor@fud.edu.ng', 'Engineering', 'Electrical Engineering', '08010000002'),
  ('FCO/MCB/22/0112', 'Fatima Sani', 'fatima.sani@fud.edu.ng', 'Sciences', 'Microbiology', '08010000003'),
  ('FCO/LAW/23/0880', 'Tunde Adeyemi', 'tunde.adeyemi@fud.edu.ng', 'Law', 'Private Law', '08010000004'),
  ('FCO/ACC/24/1077', 'Ngozi Eze', 'ngozi.eze@fud.edu.ng', 'Management', 'Accounting', '08010000005'),
  ('FCO/AGR/21/0210', 'Ibrahim Musa', 'ibrahim.musa@fud.edu.ng', 'Agriculture', 'Crop Science', '08010000006')
on conflict (reg_number) do nothing;

insert into public.medicines (name, stock_qty, unit) values
  ('Paracetamol 500mg', 1000, 'tabs'),
  ('Amoxicillin 250mg', 200, 'caps'),
  ('Ibuprofen 400mg', 300, 'tabs'),
  ('Artemether/Lumefantrine', 45, 'doses'),
  ('ORS sachet', 80, 'sachets'),
  ('Iron + Folic Acid', 400, 'tabs'),
  ('Vitamin C 100mg', 400, 'tabs'),
  ('Antacid suspension', 60, 'bottles')
on conflict (name) do nothing;

-- First admin bootstrap (run once, AFTER you sign up — the profile row must exist):
-- update public.profiles set role = 'admin', verified = true
-- where login_id = 'FCO/CSC/24/1001';
-- (For team testing, the provisioner handles all accounts — nobody runs this by hand.)
