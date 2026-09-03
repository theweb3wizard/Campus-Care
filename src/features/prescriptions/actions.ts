'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/actions';
import { notifyPrescriptionReady } from '@/features/notifications/service';
import type { Medication, Prescription, PrescriptionItem } from '@/types/database';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface PrescriptionItemInput {
  medication_id: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity_prescribed: number;
}

export interface FullPrescription {
  id: string;
  visit_id: string;
  clinic_profile_id: string;
  doctor_id: string;
  status: string;
  notes: string | null;
  dispensed_by: string | null;
  dispensed_at: string | null;
  created_at: string;
  items: {
    id: string;
    medication_id: string;
    medication_name: string;
    medication_unit: string;
    dosage: string;
    frequency: string;
    duration: string | null;
    instructions: string | null;
    quantity_prescribed: number;
    quantity_dispensed: number;
    status: string;
  }[];
  patient: {
    full_name: string;
    registration_number: string;
    file_number: string;
  };
  doctor_name: string;
}

// ─── Get active medications catalog ──────────────────────────────────────────

export async function getMedications(): Promise<Medication[]> {
  await requireRole('doctor', 'pharmacist', 'admin');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error || !data) return [];
  return data as Medication[];
}

// ─── Create or get prescription for a visit ───────────────────────────────────

export async function getOrCreatePrescription(
  visitId: string,
  clinicProfileId: string
): Promise<{ success: boolean; prescription_id?: string; error?: string }> {
  const profile = await requireRole('doctor', 'admin');
  const supabase = await createClient();

  // Check if one already exists
  const { data: existing } = await supabase
    .from('prescriptions')
    .select('id')
    .eq('visit_id', visitId)
    .maybeSingle();

  if (existing) {
    return { success: true, prescription_id: existing.id };
  }

  // Get the medical record id if it exists
  const { data: medRecord } = await supabase
    .from('medical_records')
    .select('id')
    .eq('visit_id', visitId)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from('prescriptions')
    .insert({
      visit_id: visitId,
      medical_record_id: medRecord?.id ?? null,
      doctor_id: profile.id,
      clinic_profile_id: clinicProfileId,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !created) {
    return { success: false, error: error?.message ?? 'Failed to create prescription.' };
  }

  return { success: true, prescription_id: created.id };
}

// ─── Add item to prescription ─────────────────────────────────────────────────

export async function addPrescriptionItem(
  prescriptionId: string,
  item: PrescriptionItemInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  await requireRole('doctor', 'admin');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('prescription_items')
    .insert({
      prescription_id: prescriptionId,
      medication_id: item.medication_id,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration || null,
      instructions: item.instructions || null,
      quantity_prescribed: item.quantity_prescribed,
      quantity_dispensed: 0,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Failed to add item.' };
  }

  return { success: true, id: data.id };
}

// ─── Remove item from prescription ───────────────────────────────────────────

export async function removePrescriptionItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole('doctor', 'admin');
  const supabase = await createClient();

  const { error } = await supabase
    .from('prescription_items')
    .delete()
    .eq('id', itemId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Finalize prescription (mark ready for pharmacy) ─────────────────────────

export async function finalizePrescription(
  prescriptionId: string,
  visitId: string,
  queueEntryId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole('doctor', 'admin');
  const supabase = await createClient();

  const now = new Date().toISOString();

  const [rxRes, visitRes, queueRes] = await Promise.all([
    supabase
      .from('prescriptions')
      .update({ status: 'ready', notes: notes || null })
      .eq('id', prescriptionId),
    supabase
      .from('visits')
      .update({ status: 'awaiting_pharmacy' })
      .eq('id', visitId),
    supabase
      .from('queue_entries')
      .update({ status: 'completed', completed_at: now })
      .eq('id', queueEntryId),
  ]);

  if (rxRes.error || visitRes.error || queueRes.error) {
    return {
      success: false,
      error: rxRes.error?.message ?? visitRes.error?.message ?? queueRes.error?.message,
    };
  }

  // Notify student their prescription is ready
  const { data: visit } = await supabase
    .from('visits')
    .select(`students!inner ( profile_id )`)
    .eq('id', visitId)
    .single();

  const profileId = (visit as any)?.students?.profile_id;
  if (profileId) notifyPrescriptionReady(profileId);

  return { success: true };
}

// ─── Get prescription for a visit (doctor view) ───────────────────────────────

export async function getPrescriptionByVisit(visitId: string) {
  await requireRole('doctor', 'pharmacist', 'admin');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      id, status, notes, created_at, visit_id, clinic_profile_id, doctor_id,
      prescription_items (
        id, medication_id, dosage, frequency, duration,
        instructions, quantity_prescribed, quantity_dispensed, status,
        medications ( id, name, unit, category )
      )
    `)
    .eq('visit_id', visitId)
    .maybeSingle();

  if (error || !data) return null;
  return data as any;
}

// ─── Get all pending/ready prescriptions (pharmacy view) ─────────────────────

export async function getPendingPrescriptions(): Promise<FullPrescription[]> {
  await requireRole('pharmacist', 'admin');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      id, visit_id, clinic_profile_id, doctor_id, status,
      notes, dispensed_by, dispensed_at, created_at,
      prescription_items (
        id, medication_id, dosage, frequency, duration,
        instructions, quantity_prescribed, quantity_dispensed, status,
        medications ( id, name, unit )
      ),
      visits!inner (
        clinic_profiles!inner ( file_number ),
        students!inner ( full_name, registration_number )
      ),
      profiles!prescriptions_doctor_id_fkey ( full_name )
    `)
    .in('status', ['pending', 'ready', 'partially_dispensed'])
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return (data as any[]).map((rx) => ({
    id: rx.id,
    visit_id: rx.visit_id,
    clinic_profile_id: rx.clinic_profile_id,
    doctor_id: rx.doctor_id,
    status: rx.status,
    notes: rx.notes,
    dispensed_by: rx.dispensed_by,
    dispensed_at: rx.dispensed_at,
    created_at: rx.created_at,
    items: (rx.prescription_items ?? []).map((item: any) => ({
      id: item.id,
      medication_id: item.medication_id,
      medication_name: item.medications?.name ?? '—',
      medication_unit: item.medications?.unit ?? 'units',
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      quantity_prescribed: item.quantity_prescribed,
      quantity_dispensed: item.quantity_dispensed,
      status: item.status,
    })),
    patient: {
      full_name: rx.visits?.students?.full_name ?? '—',
      registration_number: rx.visits?.students?.registration_number ?? '—',
      file_number: rx.visits?.clinic_profiles?.file_number ?? '—',
    },
    doctor_name: rx.profiles?.full_name ?? '—',
  }));
}

// ─── Get single prescription detail ──────────────────────────────────────────

export async function getPrescriptionDetail(
  prescriptionId: string
): Promise<FullPrescription | null> {
  await requireRole('pharmacist', 'admin');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      id, visit_id, clinic_profile_id, doctor_id, status,
      notes, dispensed_by, dispensed_at, created_at,
      prescription_items (
        id, medication_id, dosage, frequency, duration,
        instructions, quantity_prescribed, quantity_dispensed, status,
        medications ( id, name, unit )
      ),
      visits!inner (
        clinic_profiles!inner ( file_number ),
        students!inner ( full_name, registration_number )
      ),
      profiles!prescriptions_doctor_id_fkey ( full_name )
    `)
    .eq('id', prescriptionId)
    .single();

  if (error || !data) return null;

  const rx = data as any;
  return {
    id: rx.id,
    visit_id: rx.visit_id,
    clinic_profile_id: rx.clinic_profile_id,
    doctor_id: rx.doctor_id,
    status: rx.status,
    notes: rx.notes,
    dispensed_by: rx.dispensed_by,
    dispensed_at: rx.dispensed_at,
    created_at: rx.created_at,
    items: (rx.prescription_items ?? []).map((item: any) => ({
      id: item.id,
      medication_id: item.medication_id,
      medication_name: item.medications?.name ?? '—',
      medication_unit: item.medications?.unit ?? 'units',
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      quantity_prescribed: item.quantity_prescribed,
      quantity_dispensed: item.quantity_dispensed,
      status: item.status,
    })),
    patient: {
      full_name: rx.visits?.students?.full_name ?? '—',
      registration_number: rx.visits?.students?.registration_number ?? '—',
      file_number: rx.visits?.clinic_profiles?.file_number ?? '—',
    },
    doctor_name: rx.profiles?.full_name ?? '—',
  };
}
