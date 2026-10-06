'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { registerPregnancy } from '@/features/maternity/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineError } from '@/components/feedback/error-state';
import { useToast } from '@/components/feedback/toast';

export function PregnancyRegisterForm() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [edd, setEdd] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async () => {
    setFormError(null);
    if (!edd) {
      setFormError('Pick your expected delivery date.');
      return;
    }
    setLoading(true);
    const res = await registerPregnancy(edd, notes);
    setLoading(false);
    if (!res.success) {
      setFormError(res.error ?? 'Could not save.');
      toastError('Failed', res.error ?? 'Please try again.');
      return;
    }
    success('Saved', 'Your antenatal record is active. It is private to you and clinic staff.');
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Private: only you, the doctor and reception can see this. You can skip this page entirely if it does not apply.
      </p>
      {formError && <InlineError message={formError} />}
      <Input
        label="Expected delivery date"
        type="date"
        required
        value={edd}
        onChange={(e) => setEdd(e.target.value)}
      />
      <Input
        label="Anything to tell the doctor? (optional)"
        placeholder="e.g. Second pregnancy, last visit 2 weeks ago"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={500}
      />
      <Button variant="primary" size="lg" className="w-full" loading={loading} onClick={handleSubmit}>
        Save private record
      </Button>
    </div>
  );
}
