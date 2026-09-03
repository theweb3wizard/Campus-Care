'use server';

import { createClient } from '@/lib/supabase/server';
import type { NotificationType } from '@/types/database';

interface CreateNotificationInput {
  profile_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a notification for a user.
 * Always fire-and-forget — never throw, never block the calling action.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('notifications').insert({
      profile_id: input.profile_id,
      type: input.type,
      title: input.title,
      message: input.message,
      action_url: input.action_url ?? null,
      metadata: input.metadata ?? null,
      is_read: false,
    });
  } catch {
    // Notification failures must never break the main workflow
  }
}

/**
 * Creates notifications for multiple users at once.
 */
export async function createNotifications(
  inputs: CreateNotificationInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  try {
    const supabase = await createClient();
    await supabase.from('notifications').insert(
      inputs.map((i) => ({
        profile_id: i.profile_id,
        type: i.type,
        title: i.title,
        message: i.message,
        action_url: i.action_url ?? null,
        metadata: i.metadata ?? null,
        is_read: false,
      }))
    );
  } catch {
    // Silent — never block
  }
}

// ─── Notification event helpers ───────────────────────────────────────────────

/**
 * Notify a student that they have been checked in and are in the queue.
 */
export async function notifyCheckIn(
  studentProfileId: string,
  queueNumber: number,
  fileNumber: string
): Promise<void> {
  await createNotification({
    profile_id: studentProfileId,
    type: 'queue_update',
    title: 'You have been checked in',
    message: `You are now in the clinic queue. Your queue number is #${String(queueNumber).padStart(3, '0')}. File: ${fileNumber}.`,
    action_url: '/student',
  });
}

/**
 * Notify a student that they are next (called).
 */
export async function notifyQueueCalled(
  studentProfileId: string,
  queueNumber: number
): Promise<void> {
  await createNotification({
    profile_id: studentProfileId,
    type: 'queue_update',
    title: 'You are next — please proceed',
    message: `Queue #${String(queueNumber).padStart(3, '0')}: please make your way to the consultation room.`,
    action_url: '/student',
  });
}

/**
 * Notify a student that their prescription is ready at the pharmacy.
 */
export async function notifyPrescriptionReady(
  studentProfileId: string
): Promise<void> {
  await createNotification({
    profile_id: studentProfileId,
    type: 'prescription_ready',
    title: 'Prescription ready at pharmacy',
    message: 'Your prescription has been sent to the pharmacy. Please proceed to collect your medication.',
    action_url: '/student/prescriptions',
  });
}

/**
 * Notify a student that their medication has been dispensed.
 */
export async function notifyPrescriptionDispensed(
  studentProfileId: string
): Promise<void> {
  await createNotification({
    profile_id: studentProfileId,
    type: 'prescription_dispensed',
    title: 'Medication dispensed',
    message: 'Your medication has been dispensed. Your visit is now complete.',
    action_url: '/student/prescriptions',
  });
}

/**
 * Notify a student of a follow-up appointment.
 */
export async function notifyFollowUp(
  studentProfileId: string,
  followUpDate: string
): Promise<void> {
  await createNotification({
    profile_id: studentProfileId,
    type: 'follow_up',
    title: 'Follow-up reminder',
    message: `Your doctor has recommended a follow-up visit on ${followUpDate}. Please visit the clinic on or before that date.`,
    action_url: '/student',
  });
}

/**
 * Send a system notification to a user.
 */
export async function notifySystem(
  profileId: string,
  title: string,
  message: string
): Promise<void> {
  await createNotification({
    profile_id: profileId,
    type: 'system',
    title,
    message,
  });
}
