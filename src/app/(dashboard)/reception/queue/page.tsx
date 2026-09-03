import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import { getTodaysQueue } from '@/features/reception/actions';
import { Card } from '@/components/ui/card';
import { QueueTable } from '@/features/reception/components/queue-table';
import { QueueSubscriber } from '@/components/realtime/queue-subscriber';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

export const metadata: Metadata = { title: 'Queue' };
export const revalidate = 0;

export default async function ReceptionQueuePage() {
  await requireRole('receptionist', 'admin');
  const entries = await getTodaysQueue();

  const waitingCount = entries.filter(
    (e) => e.status === 'waiting' || e.status === 'called'
  ).length;
  const inConsultation = entries.filter(
    (e) => e.status === 'in_consultation'
  ).length;
  const completed = entries.filter((e) => e.status === 'completed').length;

  return (
    <div className="p-4 sm:p-6">
      <QueueSubscriber channel="reception-queue-page" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-heading-2">Today&apos;s Queue</h1>
          <p className="text-body mt-1">
            {new Date().toLocaleDateString('en-NG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <Link href="/reception/check-in">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Check in patient
          </Button>
        </Link>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-xs font-medium text-amber-700">Waiting</span>
          <span className="text-sm font-bold text-amber-800">{waitingCount}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg">
          <span className="text-xs font-medium text-violet-700">In consultation</span>
          <span className="text-sm font-bold text-violet-800">{inConsultation}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="text-xs font-medium text-emerald-700">Completed</span>
          <span className="text-sm font-bold text-emerald-800">{completed}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
          <span className="text-xs font-medium text-slate-500">Total today</span>
          <span className="text-sm font-bold text-slate-700">{entries.length}</span>
        </div>
      </div>

      <Card padding="none">
        <QueueTable entries={entries} showActions={true} />
      </Card>
    </div>
  );
}
