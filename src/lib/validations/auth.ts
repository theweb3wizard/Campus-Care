import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

export const studentVerificationSchema = z.object({
  registration_number: z
    .string()
    .min(1, 'Registration number is required')
    .regex(
      /^[A-Z0-9/\-]+$/i,
      'Please enter a valid registration number'
    ),
  institutional_email: z
    .string()
    .min(1, 'Institutional email is required')
    .email('Please enter a valid email address'),
});

export const studentSetupSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^[+\d\s\-()]{7,15}$/.test(val),
        'Please enter a valid phone number'
      ),
    accepts_privacy: z.boolean().refine((val) => val === true, {
      message: 'You must accept the privacy notice to continue',
    }),
    accepts_terms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the clinic terms to continue',
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type StudentVerificationInput = z.infer<typeof studentVerificationSchema>;
export type StudentSetupInput = z.infer<typeof studentSetupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
