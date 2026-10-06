'use client';

import * as React from 'react';
import { Siren } from 'lucide-react';
import { reportEmergency } from '@/features/emergency/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineError } from '@/components/feedback/error-state';

export function EmergencyForm() {
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async () => {
    setFormError(null);
    setLoading(true);
    const res = await reportEmergency({ name, phone, location, description });
    setLoading(false);
    if (!res.success) {
      setFormError(res.error ?? 'Could not send. Call the clinic line instead.');
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto">
          <Siren className="h-7 w-7" />
        </div>
        <p className="text-lg font-semibold text-slate-900">Help is on the way</p>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          The clinic front desk has your report and will call <strong>{phone}</strong> back.
          If nobody calls within 5 minutes, call the clinic line directly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        For collapse, severe bleeding, breathing trouble, or anything that cannot wait in queue.
        No login needed.
      </p>
      {formError && <InlineError message={formError} />}
      <Input label="Your name" placeholder="e.g. Tobi Ade" required value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
      <Input label="Callback phone" type="tel" placeholder="+234 XXX XXX XXXX" required value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
      <Input label="Where are you?" placeholder="e.g. Male Hostel B, Room 12" required value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1.5">What happened? *</label>
        <textarea
          rows={3}
          placeholder="Briefly describe the emergency…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-base w-full text-sm"
          maxLength={1000}
        />
      </div>
      <Button variant="primary" size="lg" className="w-full bg-rose-600 hover:bg-rose-700" loading={loading} onClick={handleSubmit}>
        Send emergency alert
      </Button>
    </div>
  );
}
