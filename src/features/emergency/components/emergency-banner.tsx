'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Siren } from 'lucide-react';
import { setEmergencyStatus, type EmergencyRequest } from '@/features/emergency/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/feedback/toast';
import { timeAgo } from '@/lib/utils';

export function EmergencyBanner({ initial }: { initial: EmergencyRequest[] }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = React.useState<string | null>(null);

  if (initial.length === 0) return null;

  const handle = async (id: string, status: 'acknowledged' | 'resolved') => {
    setLoading(id);
    const res = await setEmergencyStatus(id, status);
    setLoading(null);
    if (!res.success) {
      toastError('Failed', res.error ?? 'Please try again.');
      return;
    }
    success(status === 'acknowledged' ? 'Acknowledged' : 'Resolved', 'Emergency updated.');
    router.refresh();
  };

  return (
    <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <Siren className="h-5 w-5 text-rose-600 animate-pulse" />
        <h2 className="text-sm font-bold text-rose-800">
          {initial.length} active emergenc{initial.length === 1 ? 'y' : 'ies'} — act now
        </h2>
      </div>
      {initial.map((e) => (
        <div key={e.id} className="p-3 bg-white rounded-lg border border-rose-200">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {e.reporter_name} · <a href={`tel:${e.phone}`} className="text-blue-600 hover:underline">{e.phone}</a>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">📍 {e.location} · {timeAgo(e.created_at)}</p>
              <p className="text-sm text-slate-700 mt-1">{e.description}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {e.status === 'pending' && (
                <Button variant="primary" size="sm" loading={loading === e.id} onClick={() => handle(e.id, 'acknowledged')}>
                  Acknowledge
                </Button>
              )}
              <Button variant="outline" size="sm" disabled={loading === e.id} onClick={() => handle(e.id, 'resolved')}>
                Resolve
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
