export type UserRole =
  | 'student'
  | 'receptionist'
  | 'doctor'
  | 'pharmacist'
  | 'admin'
  | 'management';

export const USER_ROLES: Record<UserRole, string> = {
  student: 'Student',
  receptionist: 'Receptionist',
  doctor: 'Doctor',
  pharmacist: 'Pharmacist',
  admin: 'Clinic Administrator',
  management: 'Management Viewer',
};

export const STAFF_ROLES: UserRole[] = [
  'receptionist',
  'doctor',
  'pharmacist',
  'admin',
  'management',
];

export const CLINICAL_ROLES: UserRole[] = ['doctor', 'pharmacist'];

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function isStudentRole(role: UserRole): boolean {
  return role === 'student';
}
