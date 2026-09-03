'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Package } from 'lucide-react';
import { dispenseItem, markItemUnavailable } from '@/features/pharmacy/actions';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { useToast } from '@/components/feedback/toast';
import { PRESCRIPTION_ITEM_STATUS_LABELS } from '@/lib/constants';
import type { PrescriptionItemStatus } from '@/types/database';
import type { FullPrescription } from '@/features/prescriptions/actions';
import { cn } from '@/lib/utils';

interface Props {
  prescription: FullPrescription;
}

export function DispensePanel({ prescription }: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [quantities, setQuantities] = React.useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    prescription.items.forEach((item) => {
      init[item.id] = item.quantity_prescribed - item.quantity_dispensed;
    });
    return init;
  });

  const isFinalized =
    prescription.status === 'dispensed' || prescription.status === 'cancelled';

  const handleDispense = async (itemId: string) => {
    const qty = quantities[itemId] ?? 0;
    if (qty <= 0) {
      toastError('Invalid quantity', 'Enter a quantity greater than 0.');
      return;
    }

    setLoadingId(itemId);
    const res = await dispenseItem(itemId, prescription.id, qty);
    setLoadingId(null);

    if (!res.success) {
      toastError('Dispensing failed', res.error ?? 'Please try again.');
      return;
    }

    success('Dispensed', `${qty} unit(s) dispensed successfully.`);
    router.refresh();
  };

  const handleMarkUnavailable = async (itemId: string) => {
    setLoadingId(itemId);
    const res = await markItemUnavailable(itemId, prescription.id);
    setLoadingId(null);

    if (!res.success) {
      toastError('Failed', res.error ?? 'Could not mark item as unavailable.');
      return;
    }

    success('Marked unavailable', 'Item marked as out of stock.');
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {prescription.items.map((item) => {
        const isDone =
          item.status === 'dispensed' ||
          item.status === 'unavailable' ||
          item.status === 'cancelled';
        const remaining = item.quantity_prescribed - item.quantity_dispensed;
        const isLoading = loadingId === item.id;

        return (
          <div
            key={item.id}
            className={cn(
              'p-4 rounded-xl border transition-colors',
              isDone
                ? 'border-slate-100 bg-slate-50/50 opacity-70'
                : 'border-slate-200 bg-white'
            )}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {item.medication_name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.dosage} · {item.frequency}
                  {item.duration ? ` · ${item.duration}` : ''}
                </p>
                {item.instructions && (
                  <p className="text-xs text-slate-400 mt-0.5 italic">
                    {item.instructions}
                  </p>
                )}
              </div>
              <StatusBadge
                label={PRESCRIPTION_ITEM_STATUS_LABELS[item.status as PrescriptionItemStatus]}
                colorClass={
                  item.status === 'dispensed'
                    ? 'bg-emerald-100 text-emerald-700'
                    : item.status === 'unavailable'
                      ? 'bg-red-100 text-red-600'
                      : item.status === 'partially_dispensed'
                        ? 'bg-cyan-100 text-cyan-700'
                        : 'bg-amber-100 text-amber-700'
                }
              />
            </div>

            {/* Qty summary */}
            <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
              <span>
                Prescribed:{' '}
                <strong className="text-slate-700">{item.quantity_prescribed}</strong>{' '}
                {item.medication_unit}
              </span>
              <span>
                Dispensed:{' '}
                <strong className="text-slate-700">{item.quantity_dispensed}</strong>
              </span>
              {remaining > 0 && (
                <span className="text-amber-600">
                  Remaining: <strong>{remaining}</strong>
                </span>
              )}
            </div>

            {/* Actions */}
            {!isDone && !isFinalized && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Qty to dispense:</label>
                  <input
                    type="number"
                    min={1}
                    max={remaining}
                    value={quantities[item.id] ?? remaining}
                    onChange={(e) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [item.id]: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="input-base w-20 text-center py-1.5 text-sm"
                  />
                </div>
                <Button
                  variant="success"
                  size="sm"
                  loading={isLoading}
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => handleDispense(item.id)}
                >
                  Dispense
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={isLoading}
                  leftIcon={<XCircle className="h-4 w-4" />}
                  className="text-slate-400 hover:text-rose-500"
                  onClick={() => handleMarkUnavailable(item.id)}
                >
                  Out of stock
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
