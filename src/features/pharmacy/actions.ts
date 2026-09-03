'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/features/auth/actions';
import { notifyPrescriptionDispensed } from '@/features/notifications/service';

// ─── Dispense a single prescription item ─────────────────────────────────────

export async function dispenseItem(
  itemId: string,
  prescriptionId: string,
  quantityToDispense: number
): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole('pharmacist', 'admin');
  const supabase = await createClient();

  // 1. Get item details
  const { data: item, error: itemError } = await supabase
    .from('prescription_items')
    .select('id, medication_id, quantity_prescribed, quantity_dispensed, status')
    .eq('id', itemId)
    .single();

  if (itemError || !item) {
    return { success: false, error: 'Prescription item not found.' };
  }

  const remaining = item.quantity_prescribed - item.quantity_dispensed;
  const toDispense = Math.min(quantityToDispense, remaining);

  if (toDispense <= 0) {
    return { success: false, error: 'Item already fully dispensed.' };
  }

  // 2. Get inventory
  const { data: inventory, error: invError } = await supabase
    .from('inventory_items')
    .select('id, quantity_in_stock, status')
    .eq('medication_id', item.medication_id)
    .single();

  if (invError || !inventory) {
    return { success: false, error: 'Medication not found in inventory.' };
  }

  if (inventory.quantity_in_stock < toDispense) {
    return {
      success: false,
      error: `Insufficient stock. Only ${inventory.quantity_in_stock} units available.`,
    };
  }

  const newStock = inventory.quantity_in_stock - toDispense;
  const newDispensed = item.quantity_dispensed + toDispense;
  const newItemStatus =
    newDispensed >= item.quantity_prescribed ? 'dispensed' : 'partially_dispensed';

  // 3. Update inventory stock
  const { error: stockError } = await supabase
    .from('inventory_items')
    .update({ quantity_in_stock: newStock })
    .eq('id', inventory.id);

  if (stockError) {
    return { success: false, error: 'Failed to update stock: ' + stockError.message };
  }

  // 4. Record inventory transaction (append-only)
  const { error: txError } = await supabase
    .from('inventory_transactions')
    .insert({
      inventory_item_id: inventory.id,
      medication_id: item.medication_id,
      transaction_type: 'dispensing',
      quantity_change: -toDispense,
      quantity_before: inventory.quantity_in_stock,
      quantity_after: newStock,
      reference_id: itemId,
      performed_by: profile.id,
      notes: `Dispensed for prescription item ${itemId}`,
    });

  if (txError) {
    // Non-critical — stock already updated, log and continue
    console.error('Transaction record failed:', txError.message);
  }

  // 5. Update prescription item
  const { error: itemUpdateError } = await supabase
    .from('prescription_items')
    .update({
      quantity_dispensed: newDispensed,
      status: newItemStatus,
    })
    .eq('id', itemId);

  if (itemUpdateError) {
    return { success: false, error: 'Failed to update prescription item.' };
  }

  // 6. Check if ALL items are now dispensed / update prescription status
  const { data: allItems } = await supabase
    .from('prescription_items')
    .select('status')
    .eq('prescription_id', prescriptionId);

  if (allItems) {
    const allDone = allItems.every(
      (i: { status: string }) =>
        i.status === 'dispensed' || i.status === 'unavailable' || i.status === 'cancelled'
    );
    const anyPartial = allItems.some(
      (i: { status: string }) => i.status === 'partially_dispensed'
    );
    const anyDispensed = allItems.some(
      (i: { status: string }) => i.status === 'dispensed'
    );

    let newPrescriptionStatus = 'ready';
    if (allDone) newPrescriptionStatus = 'dispensed';
    else if (anyPartial || anyDispensed) newPrescriptionStatus = 'partially_dispensed';

    const prescriptionUpdate: Record<string, string | null> = {
      status: newPrescriptionStatus,
    };
    if (allDone) {
      prescriptionUpdate.dispensed_by = profile.id;
      prescriptionUpdate.dispensed_at = new Date().toISOString();
    }

    await supabase
      .from('prescriptions')
      .update(prescriptionUpdate)
      .eq('id', prescriptionId);

    // If fully dispensed — mark visit as completed
    if (allDone) {
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

        // Notify student
        const { data: visitRecord } = await supabase
          .from('visits')
          .select(`students!inner ( profile_id )`)
          .eq('id', prescription.visit_id)
          .single();

        const profileId = (visitRecord as any)?.students?.profile_id;
        if (profileId) notifyPrescriptionDispensed(profileId);
      }
    }
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
      await supabase
        .from('prescriptions')
        .update({ status: 'dispensed' })
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

// ─── Restock inventory item ───────────────────────────────────────────────────

export async function restockMedication(
  inventoryItemId: string,
  medicationId: string,
  quantity: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole('pharmacist', 'admin');
  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from('inventory_items')
    .select('quantity_in_stock')
    .eq('id', inventoryItemId)
    .single();

  if (fetchError || !current) {
    return { success: false, error: 'Inventory item not found.' };
  }

  const newStock = current.quantity_in_stock + quantity;

  const { error: updateError } = await supabase
    .from('inventory_items')
    .update({ quantity_in_stock: newStock, last_restocked_at: new Date().toISOString() })
    .eq('id', inventoryItemId);

  if (updateError) return { success: false, error: updateError.message };

  await supabase.from('inventory_transactions').insert({
    inventory_item_id: inventoryItemId,
    medication_id: medicationId,
    transaction_type: 'restock',
    quantity_change: quantity,
    quantity_before: current.quantity_in_stock,
    quantity_after: newStock,
    performed_by: profile.id,
    notes: notes || `Manual restock of ${quantity} units`,
  });

  return { success: true };
}
