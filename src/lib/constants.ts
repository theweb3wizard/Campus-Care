import type { UserRole } from '@/types/roles';
import type {
  VisitStatus,
  QueueStatus,
  PrescriptionStatus,
  PrescriptionItemStatus,
  ClinicRegistrationStatus,
  InventoryStatus,
} from '@/types/database';

// ─── App ──────────────────────────────────────────────────────────────────────

export const APP_NAME = 'CampusCare';
export const APP_TAGLINE = 'Smarter healthcare for smarter campuses.';
export const APP_VERSION = '1.0.0';

// ─── Routes ───────────────────────────────────────────────────────────────────

export const ROUTES = {
  home: '/',
  login: '/login',
  onboarding: '/onboarding',
  student: {
    dashboard: '/student',
    profile: '/student/profile',
    appointments: '/student/appointments',
    prescriptions: '/student/prescriptions',
    notifications: '/student/notifications',
  },
  reception: {
    dashboard: '/reception',
    search: '/reception/search',
    checkin: '/reception/check-in',
    queue: '/reception/queue',
    registration: '/reception/registration',
  },
  doctor: {
    dashboard: '/doctor',
    queue: '/doctor/queue',
    patient: '/doctor/patient',
    consultation: '/doctor/consultation',
  },
  pharmacy: {
    dashboard: '/pharmacy',
    prescriptions: '/pharmacy/prescriptions',
    inventory: '/pharmacy/inventory',
    dispensing: '/pharmacy/dispensing',
  },
  admin: {
    dashboard: '/admin',
    staff: '/admin/staff',
    settings: '/admin/settings',
    audit: '/admin/audit',
  },
  management: {
    dashboard: '/management',
    analytics: '/management/analytics',
  },
} as const;

// Role → default landing route
export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  student: ROUTES.student.dashboard,
  receptionist: ROUTES.reception.dashboard,
  doctor: ROUTES.doctor.dashboard,
  pharmacist: ROUTES.pharmacy.dashboard,
  admin: ROUTES.admin.dashboard,
  management: ROUTES.management.dashboard,
};

// ─── Status Labels & Colors ───────────────────────────────────────────────────

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  checked_in: 'Checked In',
  queued: 'In Queue',
  in_consultation: 'In Consultation',
  awaiting_pharmacy: 'Awaiting Pharmacy',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export const VISIT_STATUS_COLORS: Record<VisitStatus, string> = {
  checked_in: 'bg-blue-100 text-blue-700',
  queued: 'bg-amber-100 text-amber-700',
  in_consultation: 'bg-violet-100 text-violet-700',
  awaiting_pharmacy: 'bg-cyan-100 text-cyan-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
  no_show: 'bg-red-100 text-red-600',
};

export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  waiting: 'Waiting',
  called: 'Called',
  in_consultation: 'In Consultation',
  completed: 'Completed',
  cancelled: 'Cancelled',
  skipped: 'Skipped',
};

export const QUEUE_STATUS_COLORS: Record<QueueStatus, string> = {
  waiting: 'bg-amber-100 text-amber-700',
  called: 'bg-blue-100 text-blue-700',
  in_consultation: 'bg-violet-100 text-violet-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
  skipped: 'bg-orange-100 text-orange-600',
};

export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  pending: 'Pending',
  ready: 'Ready to Dispense',
  partially_dispensed: 'Partially Dispensed',
  dispensed: 'Dispensed',
  unavailable: 'Unavailable',
  cancelled: 'Cancelled',
};

export const PRESCRIPTION_STATUS_COLORS: Record<PrescriptionStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  ready: 'bg-blue-100 text-blue-700',
  partially_dispensed: 'bg-cyan-100 text-cyan-700',
  dispensed: 'bg-emerald-100 text-emerald-700',
  unavailable: 'bg-red-100 text-red-600',
  cancelled: 'bg-slate-100 text-slate-500',
};

export const PRESCRIPTION_ITEM_STATUS_LABELS: Record<
  PrescriptionItemStatus,
  string
> = {
  pending: 'Pending',
  dispensed: 'Dispensed',
  partially_dispensed: 'Partial',
  unavailable: 'Out of Stock',
  cancelled: 'Cancelled',
};

export const CLINIC_REGISTRATION_STATUS_LABELS: Record<
  ClinicRegistrationStatus,
  string
> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  awaiting_results: 'Awaiting Results',
  completed: 'Registered',
};

export const CLINIC_REGISTRATION_STATUS_COLORS: Record<
  ClinicRegistrationStatus,
  string
> = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-amber-100 text-amber-700',
  awaiting_results: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
};

export const INVENTORY_STATUS_COLORS: Record<InventoryStatus, string> = {
  in_stock: 'bg-emerald-100 text-emerald-700',
  low_stock: 'bg-amber-100 text-amber-700',
  out_of_stock: 'bg-red-100 text-red-600',
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;

// ─── Clinic Settings Keys ─────────────────────────────────────────────────────

export const SETTING_KEYS = {
  LOW_STOCK_THRESHOLD: 'low_stock_threshold',
  CLINIC_NAME: 'clinic_name',
  CLINIC_PHONE: 'clinic_phone',
  CLINIC_EMAIL: 'clinic_email',
  WORKING_HOURS_START: 'working_hours_start',
  WORKING_HOURS_END: 'working_hours_end',
  MAX_DAILY_QUEUE: 'max_daily_queue',
} as const;
