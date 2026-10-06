'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { requireRole } from '@/features/auth/actions';
import { createStaffSchema } from '@/lib/validations/staff';
import { randomBytes } from 'crypto';

// ─── Create staff account (admin only, server-side, shows password once) ─────

export async function createStaffAccount(input: {
  full_name: string;
  email: string;
  role: string;
  department?: string;
  employee_id?: string;
  specialization?: string;
}): Promise<{ success: boolean; tempPassword?: string; error?: string }> {
  await requireRole('admin');

  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid details.' };
  }
  const data = parsed.data;
  if (data.role === 'student') {
    return { success: false, error: 'Use student onboarding for students.' };
  }

  const email = data.email.trim().toLowerCase();
  const tempPassword = `Care-${randomBytes(4).toString('hex')}!1A`;

  let service;
  try {
    service = createServiceClient();
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  // 1. Create auth user (email auto-confirmed — clinic tells them in person)
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: data.full_name.trim() },
  });

  if (createError || !created.user) {
    const msg = createError?.message ?? 'Failed to create account.';
    if (msg.toLowerCase().includes('already')) {
      return { success: false, error: 'A user with this email already exists.' };
    }
    return { success: false, error: msg };
  }

  // 2. Fix role + staff row in one transaction (admin session)
  const supabase = await createClient();
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_link_staff', {
    p_user_id: created.user.id,
    p_role: data.role,
    p_full_name: data.full_name.trim(),
    p_employee_id: data.employee_id || null,
    p_department: data.department || null,
    p_specialization: data.specialization || null,
  });

  if (rpcError || !(rpcData as { success: boolean } | null)?.success) {
    // Roll back auth user so we don't leave a half-made account
    await service.auth.admin.deleteUser(created.user.id);
    return {
      success: false,
      error: (rpcData as { error?: string } | null)?.error ?? rpcError?.message ?? 'Failed to set staff role.',
    };
  }

  return { success: true, tempPassword };
}

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

  // Never lock out the last active admin
  if (currentStatus === 'active') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('status', 'active');
    const { data: target } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', profileId)
      .single();
    if (target?.role === 'admin' && (count ?? 1) <= 1) {
      return { success: false, error: 'You cannot deactivate the last active admin.' };
    }
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

  await supabase.rpc('log_audit', {
    p_action: newStatus === 'active' ? 'reactivate_staff' : 'deactivate_staff',
    p_resource_type: 'profile',
    p_resource_id: profileId,
  });

  return { success: true };
}

export async function updateStaffRole(
  profileId: string,
  newRole: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole('admin');
  const supabase = await createClient();

  if (newRole === 'student') {
    return { success: false, error: 'Staff cannot be changed to student here.' };
  }

  // Never demote the last active admin
  const { data: target } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', profileId)
    .single();
  if (target?.role === 'admin' && newRole !== 'admin') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('status', 'active');
    if ((count ?? 1) <= 1) {
      return { success: false, error: 'You cannot demote the last active admin.' };
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', profileId)
    .neq('role', 'student'); // never change student roles via this action

  if (error) return { success: false, error: error.message };

  await supabase.rpc('log_audit', {
    p_action: 'change_staff_role',
    p_resource_type: 'profile',
    p_resource_id: profileId,
    p_metadata: { new_role: newRole },
  });

  return { success: true };
}
