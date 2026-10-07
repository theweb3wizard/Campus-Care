-- Campus Care seed — demo registry + drugs. Run after 0001→0004 on a FRESH database.
-- Students claim these rows at signup (Reg No must match NAME — try: FUD/2024/001 + Amina Bello).
-- Staff are NEVER seeded: admin creates invites in /admin, staff claim at signup.

insert into public.students (reg_number, full_name, institutional_email, faculty, department, phone) values
  ('FUD/2024/001', 'Amina Bello', 'amina.bello@fud.edu.ng', 'Science', 'Computer Science', '08010000001'),
  ('FUD/2024/002', 'Chidi Okafor', 'chidi.okafor@fud.edu.ng', 'Engineering', 'Electrical', '08010000002'),
  ('FUD/2023/015', 'Fatima Sani', 'fatima.sani@fud.edu.ng', 'Medicine', 'Anatomy', '08010000003'),
  ('FUD/2022/101', 'Tunde Adeyemi', 'tunde.adeyemi@fud.edu.ng', 'Law', 'Private Law', '08010000004'),
  ('FUD/2024/077', 'Ngozi Eze', 'ngozi.eze@fud.edu.ng', 'Arts', 'English', '08010000005'),
  ('FUD/2021/210', 'Ibrahim Musa', 'ibrahim.musa@fud.edu.ng', 'Agriculture', 'Crop Science', '08010000006')
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

-- First admin bootstrap (replace email with yours, run once after you sign up):
-- update public.profiles set role = 'admin', verified = true
-- where id = (select id from auth.users where email like '%you%');
-- NOTE: with ID-first auth the email is synthetic, e.g. FUD.2024.001@clinic.local.
-- Easiest: sign up, then run: update profiles set role='admin' where login_id = 'YOUR-REG-NO';
