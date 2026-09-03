import { z } from 'zod';
import { STAFF_ROLES } from '@/types/roles';

export const createStaffSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name is too long'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  role: z.enum(
    STAFF_ROLES as [string, ...string[]],
    { required_error: 'Please select a role' }
  ),
  department: z.string().optional(),
  specialization: z.string().optional(),
  employee_id: z.string().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
