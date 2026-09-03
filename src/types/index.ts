export * from './roles';
export * from './database';

// ─── Joined / View Types ──────────────────────────────────────────────────────
// These are used throughout the application for richer data queries.

import type {
  Profile,
  Student,
  ClinicProfile,
  Visit,
  QueueEntry,
  MedicalRecord,
  Prescription,
  PrescriptionItem,
  Medication,
  InventoryItem,
} from './database';

export interface StudentWithProfile extends Student {
  profile: Profile | null;
  clinic_profile: ClinicProfile | null;
}

export interface VisitWithDetails extends Visit {
  student: Student;
  clinic_profile: ClinicProfile;
  queue_entry: QueueEntry | null;
  medical_record: MedicalRecord | null;
  prescription: Prescription | null;
}

export interface QueueEntryWithVisit extends QueueEntry {
  visit: Visit & {
    student: Student;
    clinic_profile: ClinicProfile;
  };
}

export interface PrescriptionWithItems extends Prescription {
  items: (PrescriptionItem & { medication: Medication })[];
  visit: Visit & {
    student: Student;
    clinic_profile: ClinicProfile;
  };
  doctor: Profile;
}

export interface InventoryItemWithMedication extends InventoryItem {
  medication: Medication;
}

// ─── Auth Session Types ───────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}
