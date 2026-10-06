'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole, requireAuth } from '@/features/auth/actions';

export interface PregnancyRecord {
  id: string;
  edd: string;
  notes: string | null;
  status: 'active' | 'completed';
  created_at: string;
}

// ─── Student: own record + register ───────────────────────────────────────────

export async function getMyPregnancy(): Promise<PregnancyRecord | null> {
  await requireAuth();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', user.id)
    .single();
  if (!student) return null;
  const { data: cp } = await supabase
    .from('clinic_profiles')
    .select('id')
    .eq('student_id', student.id)
    .single();
  if (!cp) return null;
  const { data } = await supabase
    .from('pregnancy_records')
    .select('id, edd, notes, status, created_at')
    .eq('clinic_profile_id', cp.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data ?? null) as PregnancyRecord | null;
}

export async function registerPregnancy(
  edd: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('register_pregnancy', {
    p_edd: edd,
    p_notes: (notes ?? '').trim().slice(0, 500) || null,
  });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; error?: string } | null;
  if (!r?.success) return { success: false, error: r?.error ?? 'Could not save.' };
  return { success: true };
}

// ─── Staff: active record banner in consultation ──────────────────────────────

export async function getActivePregnancy(
  clinicProfileId: string
): Promise<PregnancyRecord | null> {
  await requireRole('doctor', 'receptionist', 'admin');
  const supabase = await createClient();
  const { data } = await supabase
    .from('pregnancy_records')
    .select('id, edd, notes, status, created_at')
    .eq('clinic_profile_id', clinicProfileId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data ?? null) as PregnancyRecord | null;
}

export async function completePregnancy(
  recordId: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole('doctor', 'admin');
  const supabase = await createClient();
  const { error } = await supabase
    .from('pregnancy_records')
    .update({ status: 'completed' })
    .eq('id', recordId);
  if (error) return { success: false, error: error.message };
  await supabase.rpc('log_audit', {
    p_action: 'complete_pregnancy',
    p_resource_type: 'pregnancy_record',
    p_resource_id: recordId,
  });
  return { success: true };
}
