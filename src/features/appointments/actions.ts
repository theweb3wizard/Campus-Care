'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/features/auth/actions';

// ─── Book + cancel own appointment (grandma-simple, one active at a time) ─────

export async function bookAppointment(
  scheduledAt: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = await createClient();

  const cleanReason = (reason ?? '').trim().slice(0, 300);

  const { data, error } = await supabase.rpc('book_appointment', {
    p_scheduled_at: scheduledAt,
    p_reason: cleanReason || null,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string } | null;
  if (!result?.success) return { success: false, error: result?.error ?? 'Booking failed.' };
  return { success: true };
}

export async function cancelAppointment(
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('cancel_appointment', {
    p_appointment_id: appointmentId,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string } | null;
  if (!result?.success) return { success: false, error: result?.error ?? 'Cancel failed.' };
  return { success: true };
}
