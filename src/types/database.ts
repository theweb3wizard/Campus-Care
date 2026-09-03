import type { UserRole } from './roles';

// ─── Enums (mirror PostgreSQL enums) ─────────────────────────────────────────

export type ProfileStatus = 'active' | 'inactive' | 'suspended';

export type ClinicRegistrationStatus =
  | 'not_started'
  | 'in_progress'
  | 'awaiting_results'
  | 'completed';

export type AppointmentStatus =
  | 'scheduled'
  | 'checked_in'
  | 'cancelled'
  | 'no_show'
  | 'completed';

export type VisitStatus =
  | 'checked_in'
  | 'queued'
  | 'in_consultation'
  | 'awaiting_pharmacy'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type QueueStatus =
  | 'waiting'
  | 'called'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'skipped';

export type PrescriptionStatus =
  | 'pending'
  | 'ready'
  | 'partially_dispensed'
  | 'dispensed'
  | 'unavailable'
  | 'cancelled';

export type PrescriptionItemStatus =
  | 'pending'
  | 'dispensed'
  | 'partially_dispensed'
  | 'unavailable'
  | 'cancelled';

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type TransactionType =
  | 'dispensing'
  | 'restock'
  | 'adjustment'
  | 'expired'
  | 'returned';

export type NotificationType =
  | 'onboarding'
  | 'appointment'
  | 'queue_update'
  | 'prescription_ready'
  | 'prescription_dispensed'
  | 'follow_up'
  | 'system';

// ─── Table Row Types ──────────────────────────────────────────────────────────

export interface Profile {
  id: string; // = auth.users.id
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: ProfileStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  profile_id: string | null; // null until student claims the account
  registration_number: string;
  institutional_email: string;
  full_name: string;
  department: string | null;
  faculty: string | null;
  level: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  is_claimed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicProfile {
  id: string;
  student_id: string;
  file_number: string; // e.g. CC-2024-0001
  registration_status: ClinicRegistrationStatus;
  blood_group: string | null;
  genotype: string | null;
  allergies: string | null;
  registration_data: Record<string, unknown> | null; // flexible JSONB
  registered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffProfile {
  id: string;
  profile_id: string;
  employee_id: string | null;
  department: string | null;
  specialization: string | null; // for doctors
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  student_id: string;
  clinic_profile_id: string;
  scheduled_at: string;
  reason: string | null;
  status: AppointmentStatus;
  notes: string | null;
  created_by: string; // profile_id
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: string;
  student_id: string;
  clinic_profile_id: string;
  appointment_id: string | null;
  checked_in_by: string; // receptionist profile_id
  status: VisitStatus;
  check_in_time: string;
  completion_time: string | null;
  visit_date: string; // DATE column
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueEntry {
  id: string;
  visit_id: string;
  clinic_profile_id: string;
  assigned_doctor_id: string | null; // staff profile_id
  queue_number: number;
  queue_date: string; // DATE column — added to replace created_at::DATE expression
  status: QueueStatus;
  called_at: string | null;
  consultation_started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecord {
  id: string;
  visit_id: string;
  doctor_id: string; // profile_id of doctor
  complaint: string | null;
  clinical_notes: string | null;
  diagnosis: string | null;
  assessment: string | null;
  treatment_plan: string | null;
  follow_up_instructions: string | null;
  follow_up_date: string | null;
  vital_signs: Record<string, unknown> | null; // JSONB: BP, temp, etc.
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string;
  visit_id: string;
  medical_record_id: string | null;
  doctor_id: string; // profile_id
  clinic_profile_id: string;
  status: PrescriptionStatus;
  notes: string | null;
  dispensed_by: string | null; // pharmacist profile_id
  dispensed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  unit: string; // e.g. 'tablets', 'ml', 'capsules'
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_id: string;
  dosage: string; // e.g. "500mg"
  frequency: string; // e.g. "twice daily"
  duration: string | null; // e.g. "7 days"
  instructions: string | null;
  quantity_prescribed: number;
  quantity_dispensed: number;
  status: PrescriptionItemStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  medication_id: string;
  quantity_in_stock: number;
  low_stock_threshold: number;
  unit_cost: number | null;
  expiry_date: string | null;
  location: string | null; // shelf/bin reference
  status: InventoryStatus;
  last_restocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  medication_id: string;
  transaction_type: TransactionType;
  quantity_change: number; // negative for outgoing
  quantity_before: number;
  quantity_after: number;
  reference_id: string | null; // prescription_item_id or PO reference
  performed_by: string; // profile_id
  notes: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  profile_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface ClinicSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}
