'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/actions';
import { notifyCheckIn, notifyQueueCalled } from '@/features/notifications/service';
import type { Student, ClinicProfile, Visit, QueueEntry } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentSearchResult {
  student: Student;
  clinic_profile: ClinicProfile | null;
  active_visit: Visit | null;
}

export interface CheckInResult {
  visit: Visit;
  queue_entry: QueueEntry;
  queue_number: number;
}

// ─── Search students ──────────────────────────────────────────────────────────

export async function searchStudents(
  query: string
): Promise<StudentSearchResult[]> {
  await requireRole('receptionist', 'admin');
  const supabase = await createClient();

  if (!query || query.trim().length < 2) return [];

  const term = query.trim();

  // Search by registration number (exact prefix) or name (ilike)
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .or(
      `registration_number.ilike.%${term}%,full_name.ilike.%${term}%,institutional_email.ilike.%${term}%`
    )
    .order('full_name')
    .limit(10);

  if (error || !data) return [];

  const students = data as Student[];
  const studentIds = students.map((s) => s.id);

  if (studentIds.length === 0) return [];

  // Batch-fetch clinic profiles
  const { data: clinicProfiles } = await supabase
    .from('clinic_profiles')
    .select('*')
    .in('student_id', studentIds);

  // Batch-fetch active visits for today
  const today = new Date().toISOString().split('T')[0];
  const { data: activeVisits } = await supabase
    .from('visits')
    .select('*')
    .in('student_id', studentIds)
    .eq('visit_date', today)
    .not('status', 'in', '("completed","cancelled","no_show")');

  const profileMap = new Map<string, ClinicProfile>(
    (clinicProfiles ?? []).map((cp: ClinicProfile) => [cp.student_id, cp])
  );
  const visitMap = new Map<string, Visit>(
    (activeVisits ?? []).map((v: Visit) => [v.student_id, v])
  );

  return students.map((s) => ({
    student: s,
    clinic_profile: profileMap.get(s.id) ?? null,
    active_visit: visitMap.get(s.id) ?? null,
  }));
}

// ─── Get student by registration number (exact) ───────────────────────────────

export async function getStudentByRegNumber(
  regNumber: string
): Promise<StudentSearchResult | null> {
  await requireRole('receptionist', 'admin');
  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .eq('registration_number', regNumber.toUpperCase().trim())
    .single();

  if (error || !student) return null;

  const s = student as Student;

  const [cpRes, visitRes] = await Promise.all([
    supabase
      .from('clinic_profiles')
      .select('*')
      .eq('student_id', s.id)
      .single(),
    supabase
      .from('visits')
      .select('*')
      .eq('student_id', s.id)
      .eq('visit_date', new Date().toISOString().split('T')[0])
      .not('status', 'in', '("completed","cancelled","no_show")')
      .maybeSingle(),
  ]);

  return {
    student: s,
    clinic_profile: (cpRes.data as ClinicProfile) ?? null,
    active_visit: (visitRes.data as Visit) ?? null,
  };
}

// ─── Create or update clinic profile ─────────────────────────────────────────

export async function upsertClinicProfile(
  studentId: string,
  data: {
    blood_group?: string;
    genotype?: string;
    allergies?: string;
    registration_status: string;
  }
): Promise<{ success: boolean; clinic_profile?: ClinicProfile; error?: string }> {
  await requireRole('receptionist', 'admin');
  const supabase = await createClient();

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('clinic_profiles')
    .select('id')
    .eq('student_id', studentId)
    .single();

  if (existing) {
    // Update existing
    const { data: updated, error } = await supabase
      .from('clinic_profiles')
      .update({
        blood_group: data.blood_group || null,
        genotype: data.genotype || null,
        allergies: data.allergies || null,
        registration_status: data.registration_status,
        registered_at:
          data.registration_status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('student_id', studentId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, clinic_profile: updated as ClinicProfile };
  } else {
    // Create new
    const { data: created, error } = await supabase
      .from('clinic_profiles')
      .insert({
        student_id: studentId,
        file_number: '', // will be set by DB trigger
        blood_group: data.blood_group || null,
        genotype: data.genotype || null,
        allergies: data.allergies || null,
        registration_status: data.registration_status,
        registered_at:
          data.registration_status === 'completed' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, clinic_profile: created as ClinicProfile };
  }
}

// ─── Walk-in check-in ─────────────────────────────────────────────────────────

export async function walkInCheckIn(
  studentId: string,
  clinicProfileId: string,
  notes?: string
): Promise<{ success: boolean; data?: CheckInResult; error?: string }> {
  const profile = await requireRole('receptionist', 'admin');
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  // Prevent duplicate active visit on same day
  const { data: existingVisit } = await supabase
    .from('visits')
    .select('id, status')
    .eq('student_id', studentId)
    .eq('visit_date', today)
    .not('status', 'in', '("completed","cancelled","no_show")')
    .maybeSingle();

  if (existingVisit) {
    return {
      success: false,
      error: 'This student already has an active visit today.',
    };
  }

  // Create visit
  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .insert({
      student_id: studentId,
      clinic_profile_id: clinicProfileId,
      checked_in_by: profile.id,
      status: 'queued',
      visit_date: today,
      notes: notes || null,
    })
    .select()
    .single();

  if (visitError || !visit) {
    return { success: false, error: visitError?.message ?? 'Failed to create visit.' };
  }

  // Get next queue number for today
  const { data: queueNumData } = await supabase.rpc('get_next_queue_number');
  const queueNumber = (queueNumData as number) ?? 1;

  // Create queue entry
  const { data: queueEntry, error: queueError } = await supabase
    .from('queue_entries')
    .insert({
      visit_id: visit.id,
      clinic_profile_id: clinicProfileId,
      queue_number: queueNumber,
      queue_date: today,
      status: 'waiting',
    })
    .select()
    .single();

  if (queueError || !queueEntry) {
    // Rollback visit if queue entry fails
    await supabase.from('visits').delete().eq('id', visit.id);
    return { success: false, error: queueError?.message ?? 'Failed to add to queue.' };
  }

  // Fire notification (non-blocking) — need student's profile_id
  const { data: studentRecord } = await supabase
    .from('students')
    .select('profile_id')
    .eq('id', studentId)
    .single();

  const { data: clinicProfileRecord } = await supabase
    .from('clinic_profiles')
    .select('file_number')
    .eq('id', clinicProfileId)
    .single();

  if (studentRecord?.profile_id) {
    notifyCheckIn(
      studentRecord.profile_id,
      queueNumber,
      clinicProfileRecord?.file_number ?? ''
    );
  }

  return {
    success: true,
    data: {
      visit: visit as Visit,
      queue_entry: queueEntry as QueueEntry,
      queue_number: queueNumber,
    },
  };
}

// ─── Get today's full queue ───────────────────────────────────────────────────

export interface QueueEntryWithStudent {
  id: string;
  queue_number: number;
  status: string;
  called_at: string | null;
  consultation_started_at: string | null;
  completed_at: string | null;
  created_at: string;
  visit: {
    id: string;
    status: string;
    check_in_time: string;
    notes: string | null;
  };
  student: {
    id: string;
    full_name: string;
    registration_number: string;
    department: string | null;
  };
  clinic_profile: {
    id: string;
    file_number: string;
  };
}

export async function getTodaysQueue(): Promise<QueueEntryWithStudent[]> {
  await requireRole('receptionist', 'admin', 'doctor');
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('queue_entries')
    .select(`
      id, queue_number, status, called_at,
      consultation_started_at, completed_at, created_at,
      visits!inner (
        id, status, check_in_time, notes,
        students!inner ( id, full_name, registration_number, department ),
        clinic_profiles!inner ( id, file_number )
      )
    `)
    .eq('queue_date', today)
    .order('queue_number');

  if (error || !data) return [];

  // Flatten the nested Supabase joins
  return (data as any[]).map((entry) => ({
    id: entry.id,
    queue_number: entry.queue_number,
    status: entry.status,
    called_at: entry.called_at,
    consultation_started_at: entry.consultation_started_at,
    completed_at: entry.completed_at,
    created_at: entry.created_at,
    visit: {
      id: entry.visits.id,
      status: entry.visits.status,
      check_in_time: entry.visits.check_in_time,
      notes: entry.visits.notes,
    },
    student: {
      id: entry.visits.students.id,
      full_name: entry.visits.students.full_name,
      registration_number: entry.visits.students.registration_number,
      department: entry.visits.students.department,
    },
    clinic_profile: {
      id: entry.visits.clinic_profiles.id,
      file_number: entry.visits.clinic_profiles.file_number,
    },
  }));
}

// ─── Update queue entry status ────────────────────────────────────────────────

export async function updateQueueStatus(
  queueEntryId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole('receptionist', 'admin', 'doctor');
  const supabase = await createClient();

  const updates: Record<string, string | null> = { status };
  if (status === 'called') updates.called_at = new Date().toISOString();
  if (status === 'in_consultation') updates.consultation_started_at = new Date().toISOString();
  if (status === 'completed') updates.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from('queue_entries')
    .update(updates)
    .eq('id', queueEntryId);

  if (error) return { success: false, error: error.message };

  // Notify student when called
  if (status === 'called') {
    const { data: entry } = await supabase
      .from('queue_entries')
      .select(`
        queue_number,
        visits!inner ( students!inner ( profile_id ) )
      `)
      .eq('id', queueEntryId)
      .single();

    if (entry) {
      const profileId = (entry as any).visits?.students?.profile_id;
      if (profileId) {
        notifyQueueCalled(profileId, (entry as any).queue_number);
      }
    }
  }

  return { success: true };
}

// ─── Get student's active visit today ─────────────────────────────────────────

export async function getStudentActiveVisit(studentId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: visit } = await supabase
    .from('visits')
    .select('*')
    .eq('student_id', studentId)
    .eq('visit_date', today)
    .not('status', 'in', '("completed","cancelled","no_show")')
    .maybeSingle();

  if (!visit) return null;

  const { data: queueEntry } = await supabase
    .from('queue_entries')
    .select('*')
    .eq('visit_id', visit.id)
    .maybeSingle();

  return { visit: visit as Visit, queue_entry: queueEntry as QueueEntry | null };
}
