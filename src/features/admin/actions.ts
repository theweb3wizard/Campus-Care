'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/actions';

export async function toggleStaffStatus(
  profileId: string,
  currentStatus: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole('admin');
  const supabase = await createClient();

  // Prevent admin from deactivating themselves
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === profileId) {
    return { success: false, error: 'You cannot deactivate your own account.' };
  }

  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

  const { error } = await supabase
    .from('profiles')
    .update({ status: newStatus })
    .eq('id', profileId);

  if (error) return { success: false, error: error.message };

  // Also update staff_profiles.is_active
  await supabase
    .from('staff_profiles')
    .update({ is_active: newStatus === 'active' })
    .eq('profile_id', profileId);

  return { success: true };
}

export async function updateStaffRole(
  profileId: string,
  newRole: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole('admin');
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', profileId)
    .neq('role', 'student'); // never change student roles via this action

  if (error) return { success: false, error: error.message };
  return { success: true };
}
