'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/actions';
import { notifyPrescriptionDispensed } from '@/features/notifications/service';

// ─── Dispense a single prescription item (one atomic RPC, no oversell) ─────────

export async function dispenseItem(
  itemId: string,
  prescriptionId: string,
  quantityToDispense: number
): Promise<{ success: boolean; error?: string }> {
  await requireRole('pharmacist', 'admin');

  const qty = Math.floor(Number(quantityToDispense));
  if (!Number.isFinite(qty) || qty <= 0 || qty > 1000) {
    return { success: false, error: 'Quantity must be between 1 and 1000.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('dispense_item', {
    p_item_id: itemId,
    p_prescription_id: prescriptionId,
    p_qty: qty,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string } | null;
  if (!result?.success) return { success: false, error: result?.error ?? 'Dispensing failed.' };

  // Notify student only when fully done (RPC already completed the visit)
  if ((result as { prescription_status?: string }).prescription_status === 'dispensed') {
    const { data: rx } = await supabase
      .from('prescriptions')
      .select('visit_id, visits!inner ( students!inner ( profile_id ) )')
      .eq('id', prescriptionId)
      .single();
    const profileId = (rx as { visits?: { students?: { profile_id?: string } } })?.visits?.students?.profile_id;
    if (profileId) notifyPrescriptionDispensed(profileId);
  }

  return { success: true };
}

// ─── Mark item as unavailable ─────────────────────────────────────────────────

export async function markItemUnavailable(
  itemId: string,
  prescriptionId: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole('pharmacist', 'admin');
  const supabase = await createClient();

  const { error } = await supabase
    .from('prescription_items')
    .update({ status: 'unavailable' })
    .eq('id', itemId);

  if (error) return { success: false, error: error.message };

  // Re-evaluate prescription status
  const { data: allItems } = await supabase
    .from('prescription_items')
    .select('status')
    .eq('prescription_id', prescriptionId);

  if (allItems) {
    const allDone = allItems.every(
      (i: { status: string }) =>
        ['dispensed', 'unavailable', 'cancelled'].includes(i.status)
    );

    if (allDone) {
      const allUnavailable = allItems.every((i: { status: string }) => i.status === 'unavailable');
      // All out of stock ≠ dispensed. Mark correctly so reports don't lie.
      await supabase
        .from('prescriptions')
        .update({ status: allUnavailable ? 'unavailable' : 'dispensed' })
        .eq('id', prescriptionId);

      const { data: prescription } = await supabase
        .from('prescriptions')
        .select('visit_id')
        .eq('id', prescriptionId)
        .single();

      if (prescription?.visit_id) {
        await supabase
          .from('visits')
          .update({ status: 'completed', completion_time: new Date().toISOString() })
          .eq('id', prescription.visit_id)
          .eq('status', 'awaiting_pharmacy');
      }
    }
  }

  return { success: true };
}

// ─── Restock inventory item (one atomic RPC, rejects bad qty) ────────────────

export async function restockMedication(
  inventoryItemId: string,
  medicationId: string,
  quantity: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole('pharmacist', 'admin');

  const qty = Math.floor(Number(quantity));
  if (!Number.isFinite(qty) || qty <= 0 || qty > 10000) {
    return { success: false, error: 'Quantity must be between 1 and 10000.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('restock_item', {
    p_inventory_item_id: inventoryItemId,
    p_medication_id: medicationId,
    p_qty: qty,
    p_notes: notes || null,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string } | null;
  if (!result?.success) return { success: false, error: result?.error ?? 'Restock failed.' };

  return { success: true };
}
