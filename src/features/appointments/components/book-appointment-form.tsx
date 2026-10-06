'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { bookAppointment } from '@/features/appointments/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineError } from '@/components/feedback/error-state';
import { useToast } from '@/components/feedback/toast';

const SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];

function next14Days(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const d = new Date();
  for (let i = 1; i <= 14; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    // Skip Sundays (clinic closed) — simple rule
    if (day.getDay() === 0) continue;
    const iso = day.toISOString().split('T')[0];
    out.push({
      value: iso,
      label: day.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' }),
    });
  }
  return out;
}

export function BookAppointmentForm() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [date, setDate] = React.useState('');
  const [slot, setSlot] = React.useState(SLOTS[0]);
  const [reason, setReason] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const days = React.useMemo(() => next14Days(), []);

  const handleBook = async () => {
    setFormError(null);
    if (!date) {
      setFormError('Pick a day first.');
      return;
    }
    setLoading(true);
    const res = await bookAppointment(`${date}T${slot}:00`, reason);
    setLoading(false);
    if (!res.success) {
      setFormError(res.error ?? 'Booking failed.');
      toastError('Booking failed', res.error ?? 'Please try again.');
      return;
    }
    success('Booked', 'Your appointment is booked.');
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <Button variant="primary" size="sm" leftIcon={<CalendarDays className="h-4 w-4" />} onClick={() => setOpen(true)}>
        Book appointment
      </Button>
    );
  }

  return (
    <div className="p-5 border border-slate-200 rounded-xl bg-white space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">Book a visit (next 14 days)</h2>
      {formError && <InlineError message={formError} />}

      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">1. Pick a day</p>
        <div className="flex gap-2 flex-wrap">
          {days.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDate(d.value)}
              className={[
                'px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
                date === d.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300',
              ].join(' ')}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">2. Pick a time</p>
        <div className="flex gap-2 flex-wrap">
          {SLOTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSlot(s)}
              className={[
                'px-3 py-2 rounded-lg border text-xs font-mono font-medium transition-colors',
                slot === s
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Reason (optional)"
        placeholder="e.g. Fever + headache for 2 days"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={300}
      />

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={loading}>
          Close
        </Button>
        <Button variant="primary" size="sm" loading={loading} onClick={handleBook}>
          Confirm booking
        </Button>
      </div>
      <p className="text-xs text-slate-400">One upcoming appointment at a time. Walk-ins still welcome.</p>
    </div>
  );
}
