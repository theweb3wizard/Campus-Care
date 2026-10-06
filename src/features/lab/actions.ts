'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole, requireAuth } from '@/features/auth/actions';

export interface TestOrder {
  id: string;
  visit_id: string;
  clinic_profile_id: string;
  test_type: string;
  notes: string | null;
  status: 'ordered' | 'sampled' | 'ready' | 'cancelled';
  result_text: string | null;
  created_at: string;
}

// ─── Doctor: list orders for a visit ──────────────────────────────────────────

export async function getVisitTests(visitId: string): Promise<TestOrder[]> {
  await requireRole('doctor', 'admin');
  const supabase = await createClient();
  const { data } = await supabase
    .from('test_orders')
    .select('id, visit_id, clinic_profile_id, test_type, notes, status, result_text, created_at')
    .eq('visit_id', visitId)
    .order('created_at');
  return (data ?? []) as TestOrder[];
}

export async function orderTest(
  visitId: string,
  clinicProfileId: string,
  testType: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole('doctor', 'admin');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('order_test', {
    p_visit_id: visitId,
    p_clinic_profile_id: clinicProfileId,
    p_test_type: testType.trim().slice(0, 120),
    p_notes: (notes ?? '').trim().slice(0, 500) || null,
  });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; error?: string } | null;
  if (!r?.success) return { success: false, error: r?.error ?? 'Could not order test.' };
  return { success: true };
}

export async function markTestSampled(orderId: string): Promise<{ success: boolean; error?: string }> {
  await requireRole('doctor', 'receptionist', 'admin');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('mark_test_sampled', { p_order_id: orderId });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; error?: string } | null;
  if (!r?.success) return { success: false, error: r?.error ?? 'Could not update.' };
  return { success: true };
}

export async function saveTestResult(
  orderId: string,
  resultText: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole('doctor', 'admin');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('save_test_result', {
    p_order_id: orderId,
    p_result_text: resultText.trim().slice(0, 2000),
  });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; error?: string } | null;
  if (!r?.success) return { success: false, error: r?.error ?? 'Could not save result.' };
  return { success: true };
}

// ─── Student: own results ─────────────────────────────────────────────────────

export async function getStudentTests(): Promise<TestOrder[]> {
  await requireAuth();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', user.id)
    .single();
  if (!student) return [];
  const { data: cp } = await supabase
    .from('clinic_profiles')
    .select('id')
    .eq('student_id', student.id)
    .single();
  if (!cp) return [];
  const { data } = await supabase
    .from('test_orders')
    .select('id, visit_id, clinic_profile_id, test_type, notes, status, result_text, created_at')
    .eq('clinic_profile_id', cp.id)
    .order('created_at', { ascending: false })
    .limit(30);
  return (data ?? []) as TestOrder[];
}
