'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole, requireAuth } from '@/features/auth/actions';
import { QUESTIONS } from '@/features/questionnaire/questions';

export async function submitQuestionnaire(
  answers: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const cleaned: Record<string, string> = {};
  for (const q of QUESTIONS) {
    const v = (answers[q.key] ?? '').trim().slice(0, 300);
    if (v) cleaned[q.key] = v;
  }
  if (Object.keys(cleaned).length === 0) {
    return { success: false, error: 'Answer at least one question — the rest can stay empty.' };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('submit_questionnaire', {
    p_answers: cleaned,
    p_visit_id: null,
  });
  if (error) return { success: false, error: error.message };
  const r = data as { success: boolean; error?: string } | null;
  if (!r?.success) return { success: false, error: r?.error ?? 'Could not save.' };
  return { success: true };
}

export async function getLatestQuestionnaire(
  clinicProfileId: string
): Promise<Record<string, string> | null> {
  await requireRole('doctor', 'receptionist', 'admin');
  const supabase = await createClient();
  const { data } = await supabase
    .from('questionnaire_responses')
    .select('answers')
    .eq('clinic_profile_id', clinicProfileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.answers ?? null) as Record<string, string> | null;
}
