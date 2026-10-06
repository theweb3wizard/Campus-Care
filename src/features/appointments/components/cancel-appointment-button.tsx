'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cancelAppointment } from '@/features/appointments/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/feedback/toast';

export function CancelAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = React.useState(false);

  const handleCancel = async () => {
    if (!confirm('Cancel this appointment?')) return;
    setLoading(true);
    const res = await cancelAppointment(appointmentId);
    setLoading(false);
    if (!res.success) {
      toastError('Cancel failed', res.error ?? 'Please try again.');
      return;
    }
    success('Cancelled', 'Your appointment was cancelled.');
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" loading={loading} onClick={handleCancel}>
      Cancel
    </Button>
  );
}
