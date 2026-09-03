'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Send, Pill } from 'lucide-react';
import {
  getOrCreatePrescription,
  addPrescriptionItem,
  removePrescriptionItem,
  finalizePrescription,
  type PrescriptionItemInput,
} from '@/features/prescriptions/actions';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { InlineError } from '@/components/feedback/error-state';
import { useToast } from '@/components/feedback/toast';
import { PRESCRIPTION_STATUS_COLORS, PRESCRIPTION_STATUS_LABELS } from '@/lib/constants';
import type { Medication, PrescriptionStatus } from '@/types/database';

const itemSchema = z.object({
  medication_id: z.string().min(1, 'Select a medication'),
  dosage: z.string().min(1, 'Enter dosage'),
  frequency: z.string().min(1, 'Enter frequency'),
  duration: z.string(),
  instructions: z.string(),
  quantity_prescribed: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .int()
    .min(1, 'Minimum 1'),
});

type ItemInput = z.infer<typeof itemSchema>;

interface ExistingItem {
  id: string;
  medication_name: string;
  medication_unit: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  instructions: string | null;
  quantity_prescribed: number;
  quantity_dispensed: number;
  status: string;
}

interface Props {
  visitId: string;
  clinicProfileId: string;
  queueEntryId: string;
  medications: Medication[];
  existingPrescriptionId?: string | null;
  existingItems?: ExistingItem[];
  existingStatus?: string;
  onClose?: () => void;
}

const FREQUENCY_OPTIONS = [
  { value: 'once daily', label: 'Once daily' },
  { value: 'twice daily', label: 'Twice daily' },
  { value: 'three times daily', label: 'Three times daily' },
  { value: 'four times daily', label: 'Four times daily' },
  { value: 'every 8 hours', label: 'Every 8 hours' },
  { value: 'every 12 hours', label: 'Every 12 hours' },
  { value: 'at night', label: 'At night' },
  { value: 'as needed', label: 'As needed (PRN)' },
  { value: 'stat', label: 'Immediately (STAT)' },
];

export function PrescriptionComposer({
  visitId,
  clinicProfileId,
  queueEntryId,
  medications,
  existingPrescriptionId,
  existingItems = [],
  existingStatus,
  onClose,
}: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [prescriptionId, setPrescriptionId] = React.useState<string | null>(
    existingPrescriptionId ?? null
  );
  const [items, setItems] = React.useState<ExistingItem[]>(existingItems);
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [addingItem, setAddingItem] = React.useState(false);

  const isFinalized = existingStatus === 'ready' || existingStatus === 'dispensed';

  const medOptions = medications.map((m) => ({
    value: m.id,
    label: `${m.name}${m.generic_name ? ` (${m.generic_name})` : ''}`,
  }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      duration: '',
      instructions: '',
    },
  });

  const handleAddItem = async (data: ItemInput) => {
    setServerError(null);
    setAddingItem(true);

    // Create prescription if needed
    let rxId = prescriptionId;
    if (!rxId) {
      const res = await getOrCreatePrescription(visitId, clinicProfileId);
      if (!res.success || !res.prescription_id) {
        setServerError(res.error ?? 'Failed to create prescription.');
        setAddingItem(false);
        return;
      }
      rxId = res.prescription_id;
      setPrescriptionId(rxId);
    }

    const itemInput: PrescriptionItemInput = {
      medication_id: data.medication_id,
      dosage: data.dosage,
      frequency: data.frequency,
      duration: data.duration,
      instructions: data.instructions,
      quantity_prescribed: data.quantity_prescribed,
    };

    const res = await addPrescriptionItem(rxId, itemInput);
    setAddingItem(false);

    if (!res.success) {
      setServerError(res.error ?? 'Failed to add item.');
      return;
    }

    // Find the medication name
    const med = medications.find((m) => m.id === data.medication_id);
    const newItem: ExistingItem = {
      id: res.id!,
      medication_name: med?.name ?? 'Unknown',
      medication_unit: med?.unit ?? 'units',
      dosage: data.dosage,
      frequency: data.frequency,
      duration: data.duration || null,
      instructions: data.instructions || null,
      quantity_prescribed: data.quantity_prescribed,
      quantity_dispensed: 0,
      status: 'pending',
    };

    setItems((prev) => [...prev, newItem]);
    reset({ duration: '', instructions: '', medication_id: '', dosage: '', frequency: '', quantity_prescribed: 1 });
    success('Medication added', `${med?.name} added to prescription.`);
  };

  const handleRemoveItem = async (itemId: string) => {
    const res = await removePrescriptionItem(itemId);
    if (!res.success) {
      toastError('Remove failed', res.error ?? 'Could not remove item.');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleFinalize = async () => {
    if (!prescriptionId) {
      setServerError('Add at least one medication before sending to pharmacy.');
      return;
    }
    if (items.length === 0) {
      setServerError('Add at least one medication before sending to pharmacy.');
      return;
    }

    setSubmitting(true);
    const res = await finalizePrescription(prescriptionId, visitId, queueEntryId, notes);
    setSubmitting(false);

    if (!res.success) {
      setServerError(res.error ?? 'Failed to send prescription.');
      return;
    }

    success('Prescription sent', 'Prescription is now visible in the pharmacy.');
    router.refresh();
    onClose?.();
    router.push('/doctor/queue');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">Prescription</h3>
        {existingStatus && (
          <StatusBadge
            label={PRESCRIPTION_STATUS_LABELS[existingStatus as PrescriptionStatus]}
            colorClass={PRESCRIPTION_STATUS_COLORS[existingStatus as PrescriptionStatus]}
          />
        )}
      </div>

      {serverError && <InlineError message={serverError} />}

      {/* Current items */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {item.medication_name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.dosage} · {item.frequency}
                  {item.duration ? ` · ${item.duration}` : ''}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Qty: {item.quantity_prescribed} {item.medication_unit}
                  {item.instructions ? ` · ${item.instructions}` : ''}
                </p>
              </div>
              {!isFinalized && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                  aria-label="Remove medication"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add medication form */}
      {!isFinalized && (
        <Card padding="sm" className="border-dashed border-slate-300">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Add medication
          </p>
          <form onSubmit={handleSubmit(handleAddItem)} noValidate className="space-y-3">
            <Select
              label="Medication"
              placeholder="Select medication…"
              required
              options={medOptions}
              error={errors.medication_id?.message}
              {...register('medication_id')}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Dosage"
                placeholder="e.g. 500mg"
                required
                error={errors.dosage?.message}
                {...register('dosage')}
              />
              <Select
                label="Frequency"
                placeholder="Select…"
                required
                options={FREQUENCY_OPTIONS}
                error={errors.frequency?.message}
                {...register('frequency')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Duration"
                placeholder="e.g. 5 days"
                {...register('duration')}
              />
              <Input
                label="Quantity"
                type="number"
                min={1}
                required
                error={errors.quantity_prescribed?.message}
                {...register('quantity_prescribed')}
              />
            </div>
            <Input
              label="Special instructions"
              placeholder="e.g. Take after meals"
              {...register('instructions')}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              loading={addingItem}
              leftIcon={<Plus className="h-4 w-4" />}
              className="w-full"
            >
              Add to prescription
            </Button>
          </form>
        </Card>
      )}

      {/* Notes + finalize */}
      {!isFinalized && items.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <Textarea
            label="Pharmacist notes (optional)"
            placeholder="Any notes for the pharmacist…"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            leftIcon={<Send className="h-4 w-4" />}
            loading={submitting}
            onClick={handleFinalize}
          >
            Send to pharmacy ({items.length} item{items.length !== 1 ? 's' : ''})
          </Button>
        </div>
      )}

      {isFinalized && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          <Pill className="h-4 w-4 shrink-0" />
          <span>This prescription has been sent to the pharmacy.</span>
        </div>
      )}
    </div>
  );
}
