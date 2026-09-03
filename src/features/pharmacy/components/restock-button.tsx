'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { restockMedication } from '@/features/pharmacy/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/feedback/toast';
import { InlineError } from '@/components/feedback/error-state';

interface Props {
  inventoryItemId: string;
  medicationId: string;
  medicationName: string;
  currentStock: number;
  unit: string;
}

export function RestockButton({
  inventoryItemId,
  medicationId,
  medicationName,
  currentStock,
  unit,
}: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [open, setOpen] = React.useState(false);
  const [quantity, setQuantity] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleRestock = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      setServerError('Enter a valid quantity greater than 0.');
      return;
    }
    setLoading(true);
    setServerError(null);
    const res = await restockMedication(inventoryItemId, medicationId, qty, notes);
    setLoading(false);

    if (!res.success) {
      setServerError(res.error ?? 'Restock failed.');
      return;
    }

    success('Restocked', `${qty} ${unit} of ${medicationName} added to stock.`);
    setOpen(false);
    setQuantity('');
    setNotes('');
    router.refresh();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Plus className="h-3.5 w-3.5" />}
        onClick={() => setOpen(true)}
      >
        Restock
      </Button>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setServerError(null); }}
        title="Restock medication"
        description={`Current stock: ${currentStock} ${unit}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-700 -mt-2">{medicationName}</p>

          {serverError && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <Input
            label="Quantity to add"
            type="number"
            min={1}
            placeholder="e.g. 100"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <Input
            label="Notes (optional)"
            placeholder="e.g. Batch #0042, supplier name"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" loading={loading} onClick={handleRestock}>
              Add stock
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
