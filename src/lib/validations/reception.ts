import { z } from 'zod';

export const clinicRegistrationSchema = z.object({
  blood_group: z.string().optional(),
  genotype: z.string().optional(),
  allergies: z.string().optional(),
  registration_status: z.enum([
    'not_started',
    'in_progress',
    'awaiting_results',
    'completed',
  ]),
});

export const walkInCheckInSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  clinic_profile_id: z.string().uuid('Invalid clinic profile ID'),
  notes: z.string().optional(),
});

export type ClinicRegistrationInput = z.infer<typeof clinicRegistrationSchema>;
export type WalkInCheckInInput = z.infer<typeof walkInCheckInSchema>;
