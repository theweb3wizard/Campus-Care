'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ROLE_HOME_ROUTES } from '@/lib/constants';
import type { UserRole } from '@/types/roles';
import type { Profile, Student } from '@/types/database';

// ─── Get current session (server-side) ───────────────────────────────────────

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

// ─── Get current user profile (server-side) ───────────────────────────────────

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

// ─── Get current student record linked to session ─────────────────────────────

export async function getCurrentStudent(): Promise<Student | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  if (error || !data) return null;
  return data as Student;
}

// ─── Get student's own visit history (uses summary view — no clinical notes) ──

export async function getStudentVisitHistory(): Promise<
  {
    id: string;
    visit_date: string;
    status: string;
    complaint: string | null;
    diagnosis: string | null;
    follow_up_date: string | null;
    prescription_status: string | null;
  }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get clinic profile id
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', user.id)
    .single();
  if (!student) return [];

  const { data: clinicProfile } = await supabase
    .from('clinic_profiles')
    .select('id')
    .eq('student_id', student.id)
    .single();
  if (!clinicProfile) return [];

  // Use the student_medical_record_summary view — limited fields, no clinical notes
  const { data, error } = await supabase
    .from('student_medical_record_summary')
    .select('*')
    .order('visit_date', { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data as {
    id: string;
    visit_date: string;
    status: string;
    complaint: string | null;
    diagnosis: string | null;
    follow_up_date: string | null;
    prescription_status: string | null;
  }[];
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// ─── Require auth — redirect to login if no session ──────────────────────────

export async function requireAuth() {
  const user = await getSession();
  if (!user) redirect('/login');
  return user;
}

// ─── Require specific role — redirect if wrong role ──────────────────────────

export async function requireRole(...roles: UserRole[]): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login?error=no_profile');

  const p = profile as Profile;

  if (p.status !== 'active') redirect('/login?error=account_inactive');

  if (!roles.includes(p.role as UserRole)) {
    redirect(ROLE_HOME_ROUTES[p.role as UserRole]);
  }

  return p;
}

// ─── Update profile last_login_at ─────────────────────────────────────────────

export async function updateLastLogin(userId: string) {
  const supabase = await createClient();
  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);
}
