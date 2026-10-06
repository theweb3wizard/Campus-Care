'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/actions';

export interface EmergencyRequest {
  id: string;
  reporter_name: string;
  phone: string;
  location: string;
  description: string;
  status: 'pending' | 'acknowledged' | 'resolved' | 'cancelled';
  created_at: string;
}

// ─── Public report (works logged out too) ─────────────────────────────────────

export async function reportEmergency(input: {
  name: string;
  phone: string;
  location: string;
  description: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('report_emergency', {
    p_name: input.name.trim().slice(0, 100),
    p_phone: input.phone.trim().slice(0, 20),
    p_location: input.location.trim().slice(0, 200),
    p_description: input.description.trim().slice(0, 1000),
  });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; error?: string } | null;
  if (!r?.success) return { success: false, error: r?.error ?? 'Could not send. Call the clinic line instead.' };
  return { success: true };
}

// ─── Staff: open emergencies + acknowledge/resolve ────────────────────────────

export async function getOpenEmergencies(): Promise<EmergencyRequest[]> {
  await requireRole('receptionist', 'doctor', 'admin');
  const supabase = await createClient();
  const { data } = await supabase
    .from('emergency_requests')
    .select('id, reporter_name, phone, location, description, status, created_at')
    .in('status', ['pending', 'acknowledged'])
    .order('created_at');
  return (data ?? []) as EmergencyRequest[];
}

export async function setEmergencyStatus(
  id: string,
  status: 'acknowledged' | 'resolved' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  await requireRole('receptionist', 'doctor', 'admin');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('set_emergency_status', {
    p_id: id,
    p_status: status,
  });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; error?: string } | null;
  if (!r?.success) return { success: false, error: r?.error ?? 'Could not update.' };
  return { success: true };
}
