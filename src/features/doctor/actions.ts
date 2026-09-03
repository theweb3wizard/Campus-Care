'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/actions';
import type { Visit, QueueEntry, MedicalRecord, Student, ClinicProfile } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DoctorQueueEntry {
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
    gender: string | null;
    date_of_birth: string | null;
  };
  clinic_profile: {
    id: string;
    file_number: string;
    blood_group: string | null;
    genotype: string | null;
    allergies: string | null;
    registration_status: string;
  };
}

export interface PatientVisitHistory {
  id: string;
  visit_date: string;
  status: string;
  check_in_time: string;
  medical_record: {
    complaint: string | null;
    diagnosis: string | null;
    follow_up_date: string | null;
  } | null;
  prescription: {
    id: string;
    status: string;
  } | null;
}

// ─── Get doctor's queue for today ─────────────────────────────────────────────

export async function getDoctorQueue(): Promise<DoctorQueueEntry[]> {
  const profile = await requireRole('doctor', 'admin');
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  // Doctors see ALL unassigned waiting patients + their own assigned patients
  const { data, error } = await supabase
    .from('queue_entries')
    .select(`
      id, queue_number, status, called_at,
      consultation_started_at, completed_at, created_at,
      visits!inner (
        id, status, check_in_time, notes,
        students!inner (
          id, full_name, registration_number, department, gender, date_of_birth
        ),
        clinic_profiles!inner (
          id, file_number, blood_group, genotype, allergies, registration_status
        )
      )
    `)
    .eq('queue_date', today)
    .or(`assigned_doctor_id.eq.${profile.id},assigned_doctor_id.is.null`)
    .not('status', 'in', '("cancelled","skipped")')
    .order('queue_number');

  if (error || !data) return [];

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
      gender: entry.visits.students.gender,
      date_of_birth: entry.visits.students.date_of_birth,
    },
    clinic_profile: {
      id: entry.visits.clinic_profiles.id,
      file_number: entry.visits.clinic_profiles.file_number,
      blood_group: entry.visits.clinic_profiles.blood_group,
      genotype: entry.visits.clinic_profiles.genotype,
      allergies: entry.visits.clinic_profiles.allergies,
      registration_status: entry.visits.clinic_profiles.registration_status,
    },
  }));
}

// ─── Open a patient (start consultation) ─────────────────────────────────────

export async function startConsultation(
  queueEntryId: string,
  visitId: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole('doctor', 'admin');
  const supabase = await createClient();

  const now = new Date().toISOString();

  const [queueRes, visitRes] = await Promise.all([
    supabase
      .from('queue_entries')
      .update({
        status: 'in_consultation',
        consultation_started_at: now,
        assigned_doctor_id: profile.id,
      })
      .eq('id', queueEntryId),
    supabase
      .from('visits')
      .update({ status: 'in_consultation' })
      .eq('id', visitId),
  ]);

  if (queueRes.error || visitRes.error) {
    return {
      success: false,
      error: queueRes.error?.message ?? visitRes.error?.message,
    };
  }

  return { success: true };
}

// ─── Complete a consultation ──────────────────────────────────────────────────

export async function completeConsultation(
  queueEntryId: string,
  visitId: string,
  hasPrescription: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireRole('doctor', 'admin');
  const supabase = await createClient();

  const now = new Date().toISOString();
  const visitStatus = hasPrescription ? 'awaiting_pharmacy' : 'completed';

  const [queueRes, visitRes] = await Promise.all([
    supabase
      .from('queue_entries')
      .update({ status: 'completed', completed_at: now })
      .eq('id', queueEntryId),
    supabase
      .from('visits')
      .update({
        status: visitStatus,
        completion_time: hasPrescription ? null : now,
      })
      .eq('id', visitId),
  ]);

  if (queueRes.error || visitRes.error) {
    return {
      success: false,
      error: queueRes.error?.message ?? visitRes.error?.message,
    };
  }

  return { success: true };
}

// ─── Get full visit detail for doctor ────────────────────────────────────────

export async function getVisitDetail(visitId: string) {
  const profile = await requireRole('doctor', 'admin');
  const supabase = await createClient();

  const { data: visit, error } = await supabase
    .from('visits')
    .select(`
      *,
      students!inner ( * ),
      clinic_profiles!inner ( * ),
      queue_entries ( * ),
      medical_records ( * ),
      prescriptions (
        id, status, created_at,
        prescription_items (
          id, dosage, frequency, duration, quantity_prescribed,
          quantity_dispensed, status, instructions,
          medications ( id, name, unit )
        )
      )
    `)
    .eq('id', visitId)
    .single();

  if (error || !visit) return null;

  return visit as any;
}

// ─── Get patient visit history ────────────────────────────────────────────────

export async function getPatientHistory(
  clinicProfileId: string
): Promise<PatientVisitHistory[]> {
  await requireRole('doctor', 'admin');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('visits')
    .select(`
      id, visit_date, status, check_in_time,
      medical_records ( complaint, diagnosis, follow_up_date ),
      prescriptions ( id, status )
    `)
    .eq('clinic_profile_id', clinicProfileId)
    .in('status', ['completed', 'awaiting_pharmacy'])
    .order('visit_date', { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return (data as any[]).map((v) => ({
    id: v.id,
    visit_date: v.visit_date,
    status: v.status,
    check_in_time: v.check_in_time,
    medical_record: v.medical_records ?? null,
    prescription: v.prescriptions?.[0] ?? null,
  }));
}

// ─── Save medical record ──────────────────────────────────────────────────────

export async function saveMedicalRecord(
  visitId: string,
  data: {
    complaint: string;
    clinical_notes: string;
    diagnosis: string;
    assessment: string;
    treatment_plan: string;
    follow_up_instructions: string;
    follow_up_date: string;
    vital_signs: Record<string, string>;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const profile = await requireRole('doctor', 'admin');
  const supabase = await createClient();

  // Upsert — one medical record per visit
  const { data: existing } = await supabase
    .from('medical_records')
    .select('id')
    .eq('visit_id', visitId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('medical_records')
      .update({
        complaint: data.complaint || null,
        clinical_notes: data.clinical_notes || null,
        diagnosis: data.diagnosis || null,
        assessment: data.assessment || null,
        treatment_plan: data.treatment_plan || null,
        follow_up_instructions: data.follow_up_instructions || null,
        follow_up_date: data.follow_up_date || null,
        vital_signs: Object.keys(data.vital_signs).length > 0 ? data.vital_signs : null,
      })
      .eq('visit_id', visitId);

    if (error) return { success: false, error: error.message };
    return { success: true, id: existing.id };
  }

  const { data: created, error } = await supabase
    .from('medical_records')
    .insert({
      visit_id: visitId,
      doctor_id: profile.id,
      complaint: data.complaint || null,
      clinical_notes: data.clinical_notes || null,
      diagnosis: data.diagnosis || null,
      assessment: data.assessment || null,
      treatment_plan: data.treatment_plan || null,
      follow_up_instructions: data.follow_up_instructions || null,
      follow_up_date: data.follow_up_date || null,
      vital_signs: Object.keys(data.vital_signs).length > 0 ? data.vital_signs : null,
    })
    .select('id')
    .single();

  if (error || !created) return { success: false, error: error?.message };
  return { success: true, id: created.id };
}
